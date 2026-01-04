const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  learningProfile: {
    subjects: [String],
    currentLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    learningGoals: [String],
    preferredLanguage: {
      type: String,
      default: 'en'
    },
    strengths: [String],
    weaknesses: [String]
  },
  progress: [{
    subject: String,
    topic: String,
    score: Number,
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);