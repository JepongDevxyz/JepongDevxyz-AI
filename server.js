import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, history } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history || [],
            config: {
                systemInstruction: `
                    You are JepongDevxyz AI, a helpful, smart, and friendly AI Assistant.
                    
                    LANGUAGE RULES:
                    1. Primary/Default Language: Respond in clear English.
                    2. Language Matching: If the user speaks or asks in Tagalog, Filipino, or Taglish, respond naturally in Tagalog/Taglish. Match the language used by the user.
                `,
                tools: [{ googleSearch: {} }],
            }
        });

        const result = await chat.sendMessage({ message: prompt });

        res.json({
            result: result.text,
            history: await chat.getHistory()
        });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
