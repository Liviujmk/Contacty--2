const mongoose = require('mongoose');
const MessageSchema = require('./messages');

const FormSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MessageSchema'
    }]
})

const Form = mongoose.model('Form', FormSchema);

module.exports = Form