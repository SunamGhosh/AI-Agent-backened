const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Generate quiz based on learning gaps
router.post('/generate', auth, async (req, res) => {
  try {
    const { subject, topic, difficulty = 'medium', learningGaps } = req.body;

    const user = await User.findById(req.user.userId);

    // Analyze user's progress to identify learning gaps
    const userProgress = user.progress.filter(p => p.subject === subject);

    const prompt = `Generate a quiz to address learning gaps in ${subject}, specifically the topic: ${topic}.

User's current learning profile:
- Level: ${user.learningProfile.currentLevel || 'beginner'}
- Recent progress in ${subject}: ${userProgress.slice(-5).map(p => `${p.topic}: ${p.score}%`).join(', ') || 'No recent progress'}
- Identified learning gaps: ${learningGaps?.map(gap => gap.topic + ' - ' + gap.gapDescription).join(', ') || 'General topic coverage'}
- Strengths: ${user.learningProfile.strengths?.join(', ') || 'Not specified'}
- Weaknesses: ${user.learningProfile.weaknesses?.join(', ') || 'Not specified'}

Create a ${difficulty} level quiz with 5-10 multiple choice questions that:
1. Target the identified learning gaps
2. Build upon the user's strengths
3. Help overcome their weaknesses
4. Are appropriate for their current level

Return the quiz in this exact JSON format:
{
  "title": "Quiz Title",
  "description": "Brief description of what the quiz covers",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer",
      "difficulty": "easy|medium|hard",
      "topic": "specific subtopic"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const quizData = JSON.parse(response.text());

    // Create quiz in database
    const quiz = new Quiz({
      title: quizData.title,
      description: quizData.description,
      subject,
      topic,
      difficulty,
      questions: quizData.questions,
      userId: req.user.userId,
      learningGaps: learningGaps || []
    });

    await quiz.save();

    res.status(201).json({
      quizId: quiz._id,
      quiz: quizData,
      message: 'Quiz generated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating quiz', error: error.message });
  }
});

// Get user's quizzes
router.get('/', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('title description subject topic difficulty createdAt completed score');

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific quiz
router.get('/:quizId', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.quizId,
      userId: req.user.userId
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit quiz answers
router.post('/:quizId/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body; // answers should be an array of selected option indices

    const quiz = await Quiz.findOne({
      _id: req.params.quizId,
      userId: req.user.userId
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.completed) {
      return res.status(400).json({ message: 'Quiz already completed' });
    }

    // Calculate score
    let correctAnswers = 0;
    const results = quiz.questions.map((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      return {
        questionIndex: index,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);

    // Update quiz with results
    quiz.completed = true;
    quiz.score = score;
    await quiz.save();

    // Update user progress
    const user = await User.findById(req.user.userId);
    user.progress.push({
      subject: quiz.subject,
      topic: quiz.topic,
      score: score
    });
    await user.save();

    res.json({
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      results,
      message: score >= 70 ? 'Great job! You passed the quiz.' : 'Keep practicing! Review the explanations and try again.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get quiz analytics for user
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      userId: req.user.userId,
      completed: true
    });

    const analytics = {
      totalQuizzes: quizzes.length,
      averageScore: quizzes.length > 0 ? Math.round(quizzes.reduce((sum, quiz) => sum + quiz.score, 0) / quizzes.length) : 0,
      subjectBreakdown: {},
      recentPerformance: quizzes.slice(-5).map(quiz => ({
        subject: quiz.subject,
        topic: quiz.topic,
        score: quiz.score,
        date: quiz.createdAt
      }))
    };

    // Calculate subject breakdown
    quizzes.forEach(quiz => {
      if (!analytics.subjectBreakdown[quiz.subject]) {
        analytics.subjectBreakdown[quiz.subject] = {
          totalQuizzes: 0,
          totalScore: 0,
          averageScore: 0
        };
      }
      analytics.subjectBreakdown[quiz.subject].totalQuizzes++;
      analytics.subjectBreakdown[quiz.subject].totalScore += quiz.score;
    });

    // Calculate averages
    Object.keys(analytics.subjectBreakdown).forEach(subject => {
      const data = analytics.subjectBreakdown[subject];
      data.averageScore = Math.round(data.totalScore / data.totalQuizzes);
    });

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


