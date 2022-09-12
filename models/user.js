const mongoose = require('mongoose');
const FormSchema = require('./forms');

const UserSchema = new mongoose.Schema({
    company: String,
    username: String,
    email: String,
    hash: String,
    salt: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    trial: {
        start: {
            type: Date
        },
        end: {
            type: Date
        },
        status: {
            type: String
        }
    },
    plan: {
        title: String,
        isActive: Boolean,
        price: Number,
        messagesNr: Number

    },
    customerId: String,
    activePlan: String,
    activeSubscriptionId: String,
    settingsOptions: {
        emailFooter: String,
        emailFooterTitle: String,
        emailFooterHtml: String,
        emailHeader: String,
        emailText: String,
    },
    forms: [{
        title: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        messages: [{
            text: String,
            clientSenderName: String,
            clientSenderEmail: String,
            formTarget: String,
            createdAt: {
              type: Date,
              default: Date.now
            } 
        }]
    }]
}, {minimize: false});

const User = mongoose.model('User', UserSchema);

module.exports = User