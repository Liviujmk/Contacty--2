const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    email_title: {
        type: String,
        required: true
    },
    email_html: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = SettingsSchema