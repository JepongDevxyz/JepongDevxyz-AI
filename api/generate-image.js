import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Gumamit ng REST call/direct model instantiation batay sa SDK access
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-002' });
    
    const result = await model.generateImages({
      prompt: prompt,
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
    });

    const imageUrl = `data:image/jpeg;base64,${result.response.images[0].base64}`;
    return res.status(200).json({ success: true, imageUrl });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Image generation failed' });
  }
}
