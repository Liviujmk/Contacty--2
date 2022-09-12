const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
  text: String,
  name: String,
  sender: String,
  formSender: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {minimize: false});

module.exports = MessageSchema