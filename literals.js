'use strict';
let Alexa = require('alexa-sdk');
let firebase = require('firebase');
require('firebase/database');
let smallImageURL = '';
let largeImageURL = '';
let delay = ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .";
let APP_ID = '';
let skillName = 'Ask Question';
const helpMessage = 'You can say ask question, or you can say exit... What can I help you with?';
const helpPrompt = 'What can I help you with?';
const answerPrompt = "If you want to answer this question just say answer and provide your answer";

// Firebase initial setup
let config = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
};

firebase.initializeApp(config);
let database = firebase.database();
var userID;
var userQuestion;
var savedAnswer;
var questionIndex = 0;

// array of questions that
// a doctor has
let questions = [];

exports.handler = function(event, context, callback) {
    let alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;

    // This is a unique ID assigned to the Alexa device
    //
    userID = event.session.user.userId;
    console.log("USER ID: " + userID);

    alexa.registerHandlers(handlers);
    alexa.execute();
};

let handlers = {
    'LaunchRequest': function () {
        this.emit('WelcomeIntent');
    },

    'WelcomeIntent': function () {
        let speechOutput = "Welcome to the Sogeti P.O.C. Alexa Skill. From here you can send and receive messages with " +
            "your physician. Say ask question to get started";
        this.emit(':ask', speechOutput);
        this.emit(':responseReady');
    },

    'AskQuestion': function() {
        // This function gets the text translation
        // of the users speech
        //
        console.log("AskQuestion Fired....");

        if(this.event.request.intent.slots.UserText.value) {
            let userText = this.event.request.intent.slots.UserText.value;
            console.log("user question: " + userText);

            // We need to remove the first two words from the users speech because
            // it will always be the intent words (i.e. "ask question" in this case)
            //
            let askRemoved = userText.substring(userText.indexOf(" ") + 1, userText.length);
            let edited = askRemoved.substring(askRemoved.indexOf(" ") + 1, askRemoved.length);
            console.log("edited question: " + edited);

            // Record user text to a card
            // This is helpful for testing since you can see
            // the recorded text on the card in your Alexa app
            //
            this.response.cardRenderer(skillName, edited, {smallImageUrl: smallImageURL, largeImageUrl: largeImageURL});
            userQuestion = edited;

            // Repeat the message back to the user
            let speechOutput = "I heard your question as: " + edited + delay + " if this is correct, say correct, otherwise say try again";
            this.response.speak(speechOutput);
            this.response.shouldEndSession(false);
            this.emit(':responseReady');
        }
        else {
            // user text is null
            //
            console.log("else case for record intent");
            console.log("slots: ", this.event.request.intent.slots);
            let speechOutput = "I did not understand your statement";
            let reprompt = "please tell me again";
            this.emit(':ask', speechOutput, reprompt);
        }
    },

    'Correct': function() {
        // Send the question to the doctor
        // We will write this question to Firebase
        // at the following path
        // Questions -> Doctor's phone number -> autoID

        // For purposes of this demo I will use a
        // static phone number to map the question
        // to the doctor
        //
        let docPhoneNumber = '555-555-5555';
        let patientPhoneNumber = '222-222-2222';
        if (userID && userQuestion) {
            console.log("userID && userQuestion");

            let key = database.ref('questions').push().key;

            // Keep the session open until the upload is completed
            //
            var speechOutput = "original output";

            database.ref('questions/' + docPhoneNumber + '/' + key).set({
                name: "John Smith",
                question: userQuestion,
                fromUserID: patientPhoneNumber,
                recipient: docPhoneNumber,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false,
            }, function (error) {
                if (error) {
                    console.log(error);
                    speechOutput = "There was an error sending your question. Please" +
                        "try again.";
                }
                console.log("upload finished");
                speechOutput = "Your question was successfully sent to your doctor.";
            }).then(() => {
                console.log('speechOutput: ', speechOutput);
                this.response.speak(speechOutput);
                this.emit(':responseReady');
            });
        }
        else {
            console.log("userID && userQuestion failed");
            console.log("userID: " + userID);
            console.log("userQuestion: " + userQuestion);
            this.response.speak("Error in correct");
            this.emit(':responseReady');
        }
    },

    'TryAgain': function() {
        this.response.speak("Say ask question followed by your question to try again.");
        this.response.shouldEndSession(false);
        this.emit(':responseReady');
    },

    'GetQuestions': function() {
        // Get the doctors questions that have not be read
        // read each question to the doctor and ask them
        // if they would like to respond
        //
        this.response.shouldEndSession(false);
        let docPhoneNumber = '555-555-5555';
        database.ref('questions/' + docPhoneNumber).orderByChild('read').equalTo(false).once('value').then((snapshot) => {
            console.log(snapshot.val());
            snapshot.forEach(function (childSnapshot) {
                let data = childSnapshot.val();
                let question = {
                    patientQuestion: data.question,
                    patientID: data.fromUserID,
                    name: data.name,
                };
                questions.push(question);
            });
        }).then(() => {
            // prompt to answer or keep reading
            // save the index so we know what the mark as read
            //
            let newQuestionPrompt = "Reading question from, ";

            let speechOutput = newQuestionPrompt + questions[0].name + delay +
                questions[0].patientQuestion + delay + answerPrompt;

            console.log('speechOutput: ', speechOutput);
            this.response.speak(speechOutput);
            this.emit(':responseReady');
        });
    },

    'AnswerQuestion': function() {
        // Get the user to answer the question
        // and confirm that they want to their answer
        // to the patient
        //
        console.log("AnswerQuestion Fired....");

        if(this.event.request.intent.slots.UserAnswer.value) {
            let userAnswer = this.event.request.intent.slots.UserAnswer.value;

            console.log("user answer: " + userAnswer);

            // We need to remove the first two words from the users speech because
            // it will always be the intent words (i.e. "ask question" in this case)
            //
            let answerRemoved = userAnswer.substring(userAnswer.indexOf(" ") + 1, userAnswer.length);
            let edited = answerRemoved.substring(answerRemoved.indexOf(" ") + 1, answerRemoved.length);
            console.log("edited answer: " + edited);

            // Record user text to a card
            // This is helpful for testing since you can see
            // the recorded text on the card in your Alexa app
            //
            this.response.cardRenderer(skillName, edited, {smallImageUrl: smallImageURL, largeImageUrl: largeImageURL});
            savedAnswer = edited;

            // Repeat the message back to the user
            let speechOutput = "I heard your answer as: " + edited + delay + " if this is correct, say send answer";
            this.response.shouldEndSession(false);
            this.response.speak(speechOutput);
            this.emit(':responseReady');
        }
        else {
            // user answer is null
            //
            console.log("else case for record intent");
            let speechOutput = "I did not understand your statement";
            let reprompt = "please tell me again";
            this.emit(':ask', speechOutput, reprompt);
        }
    },

    'SendAnswer': function() {
        console.log("Send Answer Fired");

        // Send the answer to the patient
        // We will write this question to Firebase
        // at the following path
        // answers -> sender's alexaID -> autoID

        if (savedAnswer && questions[questionIndex].patientID) {
            console.log("userAnswer && patientID");

            let key = database.ref('answers').push().key;

            // Keep the session open until the upload is completed
            //
            var speechOutput = "original output";

            database.ref('answers/' + questions[questionIndex].patientID + '/' + key).set({
                name: "John Smith",
                answer: savedAnswer,
                fromUserID: userID,
                recipient: questions[questionIndex].patientID,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false,
            }, function (error) {
                if (error) {
                    console.log(error);
                    speechOutput = "There was an error sending your answer. Please" +
                        "try again.";
                }
                console.log("upload finished");
                speechOutput = "Your answer was successfully sent to your patient.";
            }).then(() => {
                console.log('speechOutput: ', speechOutput);
                this.response.speak(speechOutput);
                this.emit(':responseReady');
            });
        }
        else {
            console.log("userAnswer and patientID failed");
            console.log("patientID: " + questions[questionIndex].patientID);
            console.log("userAnswer: " + userAnswer);
            this.response.speak("Error in send answer");
            this.emit(':responseReady');
        }
    },


    'AMAZON.HelpIntent': function () {
        let speechOutput = "You can say record and then give me a message you'd like me to save";
        let reprompt = "What can I help you record";
        this.emit(':ask', speechOutput, reprompt);
    },

    'AMAZON.CancelIntent': function () {
        this.response.shouldEndSession(true);
        this.emit(':tell', 'Goodbye!');
    },

    'AMAZON.StopIntent': function () {
        this.response.shouldEndSession(true);
        this.emit(':tell', 'Goodbye!');
    },

    'SessionEndedRequest': function () {
        this.response.shouldEndSession(true);
        this.response.speak('Goodbye!');
        console.log(`Session ended: ${this.event.request.reason}`);
    },

    'Unhandled': function () {
        this.attributes.speechOutput = this.t(helpMessage);
        this.attributes.repromptSpeech = this.t(helpPrompt);
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },

};
