const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const LearningSession = require('../models/LearningSession');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Start a new learning session
router.post('/session/start', auth, async (req, res) => {
  try {
    const { subject, topic, learningObjectives } = req.body;

    const session = new LearningSession({
      userId: req.user.userId,
      subject,
      topic,
      learningObjectives: learningObjectives || [],
      messages: []
    });

    await session.save();

    res.status(201).json({
      sessionId: session._id,
      message: 'Learning session started successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get personalized learning recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    const prompt = `Based on this student's learning profile:
    - Subjects: ${user.learningProfile.subjects?.join(', ') || 'Not specified'}
    - Current level: ${user.learningProfile.currentLevel || 'beginner'}
    - Learning goals: ${user.learningProfile.learningGoals?.join(', ') || 'Not specified'}
    - Strengths: ${user.learningProfile.strengths?.join(', ') || 'Not specified'}
    - Weaknesses: ${user.learningProfile.weaknesses?.join(', ') || 'Not specified'}

    Provide personalized learning recommendations including:
    1. Next topics to study
    2. Study methods that would work best
    3. Resources or activities to try
    4. Timeline suggestions

    Format the response as a structured JSON object. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    // Clean the response to extract JSON from markdown code blocks
    const cleanJsonResponse = (text) => {
      // Remove markdown code block wrappers if present
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      // Remove any leading/trailing whitespace
      text = text.trim();
      return text;
    };

    const cleanedText = cleanJsonResponse(rawText);

    let recommendations;
    try {
      recommendations = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', cleanedText);
      return res.status(500).json({
        message: 'Error generating recommendations',
        error: 'AI response could not be parsed as valid JSON',
        rawResponse: cleanedText.substring(0, 500) // Log first 500 chars for debugging
      });
    }

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: 'Error generating recommendations', error: error.message });
  }
});

// Chat with AI learning assistant
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, sessionId, subject, topic } = req.body;

    if (!message || !subject || !topic) {
      return res.status(400).json({ message: 'Message, subject, and topic are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build context from user's learning profile
    const context = `You are an AI-powered personalized learning assistant for SDG 4 - Quality Education.

Student Profile:
- Current level: ${user.learningProfile.currentLevel || 'beginner'}
- Subjects of interest: ${user.learningProfile.subjects?.join(', ') || 'various'}
- Learning goals: ${user.learningProfile.learningGoals?.join(', ') || 'general education'}
- Strengths: ${user.learningProfile.strengths?.join(', ') || 'not specified'}
- Weaknesses: ${user.learningProfile.weaknesses?.join(', ') || 'not specified'}
- Preferred language: ${user.learningProfile.preferredLanguage || 'English'}

Current learning context:
- Subject: ${subject}
- Topic: ${topic}

Provide helpful, personalized learning assistance. Adapt your teaching style to the student's level and preferences. Be encouraging and supportive.`;

    const fullPrompt = `${context}\n\nStudent: ${message}\n\nAssistant:`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Save to learning session if sessionId provided
    if (sessionId) {
      await LearningSession.findByIdAndUpdate(sessionId, {
        $push: {
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: aiResponse }
          ]
        }
      });
    }

    res.json({
      response: aiResponse,
      sessionId: sessionId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing chat request', error: error.message });
  }
});

// Get learning session history
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await LearningSession.find({ userId: req.user.userId })
      .sort({ sessionStart: -1 })
      .limit(10);

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// End learning session
router.put('/session/:sessionId/end', auth, async (req, res) => {
  try {
    const session = await LearningSession.findByIdAndUpdate(
      req.params.sessionId,
      {
        sessionEnd: new Date(),
        completed: true,
        duration: Math.round((new Date() - new Date()) / (1000 * 60)) // Calculate duration in minutes
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ message: 'Session ended successfully', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;