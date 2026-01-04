require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    console.log('Testing Gemini API with gemini-2.5-flash...');
    console.log('API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('Calling generateContent...');
    const result = await model.generateContent('Hello, can you respond with just "Hello World"?');
    const response = await result.response;
    const text = response.text();

    console.log('✅ Response:', text);
    console.log('✅ Gemini API is working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();
