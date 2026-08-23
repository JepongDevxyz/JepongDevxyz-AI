import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Gamitin ang tamang Imagen 3 model name
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    // I-check kung may pumasok na imahe
    const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;

    if (!imageBytes) {
      return res.status(500).json({ 
        error: 'Empty response received from Google Imagen API. (Possible safety block or invalid prompt)' 
      });
    }

    const imageUrl = `data:image/jpeg;base64,${imageBytes}`;
    return res.status(200).json({ success: true, imageUrl });

  } catch (error) {
    console.error('Imagen Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
