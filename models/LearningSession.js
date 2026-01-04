const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const learningSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  learningObjectives: [String],
  currentDifficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  aiInsights: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  sessionStart: {
    type: Date,
    default: Date.now
  },
  sessionEnd: Date,
  duration: Number, // in minutes
  completed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('LearningSession', learningSessionSchema);



