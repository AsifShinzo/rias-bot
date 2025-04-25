const axios = require('axios');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your_api_key_here';

async function geminiChatReply(message) {
    console.log('Gemini API key used:', GEMINI_API_KEY);
    const apiKey = GEMINI_API_KEY;
    try {
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=' + apiKey,
            {
                contents: [{ parts: [{ text: message }] }]
            }
        );
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);
        return 'Sorry, I could not process that.';
    }
}

module.exports = { geminiChatReply };
