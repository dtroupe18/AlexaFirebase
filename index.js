'use strict';
let Alexa = require('alexa-sdk');
let firebase = require('firebase');

let APP_ID = 'amzn1.ask.skill.5ba4c4d7-87be-4b34-9d2d-47f6127fef0d';
let SKILL_NAME = 'Alexa Firebase';

// Firebase initial setup
let config = {
    apiKey: "AIzaSyARgIDvLqy7FRiSL2dS_tOOK2pwvKZZInI",
    authDomain: "alexa-f8f38.firebaseapp.com",
    databaseURL: "https://alexa-f8f38.firebaseio.com",
    projectId: "alexa-f8f38",
    storageBucket: "alexa-f8f38.appspot.com",
    messagingSenderId: "540953130258"
};

firebase.initializeApp(config);
var userID;

exports.handler = function(event, context, callback) {
    let alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;

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
        let speechOutput = "Welcome to the Firebase Alexa Demo. From here you can ask me to read and write data to Firebase";
        this.emit(':ask', speechOutput)
    },

    'AskQuestion': function() {
        // this function should write the user's / patient's
        // question to Firebase
        //

        console.log("AskQuestion Fired....");

        var question;
        console.log("event request: " + this.event.request);
        console.log("intent: " + this.event.request.intent);
        console.log("askQuestion: " + this.event.request.intent.slots.AskQuestion);
        console.log("askQuestion value: " + this.event.request.intent.slots.AskQuestion.value);


        if(this.event.request.intent.slots.AskQuestion.value) {

            question = this.event.request.intent.slots.AskQuestion.value;
            console.log("Question: " + question);

            if (question && userID) {
                let ref = firebase.database().ref("questions").child(userID);
                let questionRef = ref.push()

                questionRef.set({
                    question: question,
                    userID: userID,
                    recipient: "856-631-6664",
                    timestamp: firebase.ServerValue.timestamp
                });
                let speechOutput = "I've sent your question to your doctor. I will let you know when I get a response";
                this.emit(':tell', speechOutput);
            }
            else {
                console.log("question or userID failed");
                let speechOutput = "I did not understand your question please ask again.";
                this.emit(':tell', speechOutput);
            }
        }
    },

    'AMAZON.HelpIntent': function () {
        let speechOutput = "You can say tell me a space fact, or, you can say exit... What can I help you with?";
        let reprompt = "What can I help you with?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Goodbye!');
    }
};