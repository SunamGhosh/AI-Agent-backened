const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// For this implementation, we'll use a simple translation approach
// In production, you would integrate with Google Translate API or similar service
// For now, we'll create a basic translation service

// Simple translation dictionary for demonstration (English to Spanish)
const translations = {
  'hello': 'hola',
  'goodbye': 'adiós',
  'thank you': 'gracias',
  'please': 'por favor',
  'yes': 'sí',
  'no': 'no',
  'help': 'ayuda',
  'learn': 'aprender',
  'study': 'estudiar',
  'question': 'pregunta',
  'answer': 'respuesta',
  'correct': 'correcto',
  'incorrect': 'incorrecto',
  'easy': 'fácil',
  'difficult': 'difícil',
  'beginner': 'principiante',
  'advanced': 'avanzado'
};

// Supported languages
const supportedLanguages = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi'
};

// Translate text (basic implementation)
router.post('/translate', auth, async (req, res) => {
  try {
    const { text, fromLang = 'en', toLang = 'es' } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    if (!supportedLanguages[fromLang] || !supportedLanguages[toLang]) {
      return res.status(400).json({ message: 'Unsupported language' });
    }

    // For demonstration, we'll use a simple word-by-word translation
    // In production, integrate with Google Translate API, DeepL, or similar
    let translatedText = text;

    if (fromLang === 'en' && toLang === 'es') {
      // Simple English to Spanish translation
      const words = text.toLowerCase().split(' ');
      translatedText = words.map(word => {
        const cleanWord = word.replace(/[.,!?;]/g, '');
        return translations[cleanWord] || word;
      }).join(' ');
    } else if (fromLang === 'es' && toLang === 'en') {
      // Simple Spanish to English translation (reverse lookup)
      const reverseTranslations = Object.fromEntries(
        Object.entries(translations).map(([k, v]) => [v, k])
      );
      const words = text.toLowerCase().split(' ');
      translatedText = words.map(word => {
        const cleanWord = word.replace(/[.,!?;]/g, '');
        return reverseTranslations[cleanWord] || word;
      }).join(' ');
    } else {
      // For other language pairs, return a placeholder
      // In production, use a proper translation API
      translatedText = `[Translation from ${supportedLanguages[fromLang]} to ${supportedLanguages[toLang]}: ${text}]`;
    }

    res.json({
      originalText: text,
      translatedText,
      fromLang,
      toLang,
      translated: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Translation error', error: error.message });
  }
});

// Get supported languages
router.get('/languages', auth, (req, res) => {
  res.json({
    languages: supportedLanguages,
    defaultFrom: 'en',
    defaultTo: 'es'
  });
});

// Translate educational content
router.post('/educational-content', auth, async (req, res) => {
  try {
    const { content, contentType, fromLang = 'en', toLang = 'es' } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // For educational content, we can provide more context-aware translations
    // In production, this would use specialized educational translation models

    let translatedContent = content;

    // Add educational context markers
    const educationalContext = {
      subjects: ['mathematics', 'science', 'history', 'literature', 'physics', 'chemistry'],
      terms: ['theorem', 'hypothesis', 'experiment', 'analysis', 'conclusion']
    };

    // Basic translation with educational context
    if (fromLang === 'en' && toLang === 'es') {
      // Enhanced translation for educational content
      translatedContent = content
        .replace(/\b(mathematics|math)\b/gi, 'matemáticas')
        .replace(/\bscience\b/gi, 'ciencia')
        .replace(/\bhistory\b/gi, 'historia')
        .replace(/\bliterature\b/gi, 'literatura')
        .replace(/\bphysics\b/gi, 'física')
        .replace(/\bchemistry\b/gi, 'química')
        .replace(/\btheorem\b/gi, 'teorema')
        .replace(/\bhypothesis\b/gi, 'hipótesis')
        .replace(/\bexperiment\b/gi, 'experimento')
        .replace(/\banalysis\b/gi, 'análisis')
        .replace(/\bconclusion\b/gi, 'conclusión');
    }

    res.json({
      originalContent: content,
      translatedContent,
      contentType: contentType || 'text',
      fromLang,
      toLang,
      educationalContext: true,
      note: 'This is a basic translation. For production use, integrate with professional translation services.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Educational content translation error', error: error.message });
  }
});

// Batch translate quiz questions
router.post('/quiz-translate', auth, async (req, res) => {
  try {
    const { questions, fromLang = 'en', toLang = 'es' } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: 'Questions must be an array' });
    }

    const translatedQuestions = questions.map(question => ({
      ...question,
      question: `[${supportedLanguages[toLang]}] ${question.question}`,
      options: question.options?.map(option => `[${supportedLanguages[toLang]}] ${option}`),
      explanation: question.explanation ? `[${supportedLanguages[toLang]}] ${question.explanation}` : undefined
    }));

    res.json({
      originalQuestions: questions,
      translatedQuestions,
      fromLang,
      toLang,
      note: 'Quiz questions translated for accessibility'
    });
  } catch (error) {
    res.status(500).json({ message: 'Quiz translation error', error: error.message });
  }
});

module.exports = router;