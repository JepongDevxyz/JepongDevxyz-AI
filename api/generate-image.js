export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in Vercel Environment Variables' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            outputOptions: { mimeType: 'image/jpeg' }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to fetch image from Google API' 
      });
    }

    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      return res.status(500).json({ error: 'Empty response received from Google Imagen API.' });
    }

    return res.status(200).json({ 
      success: true, 
      imageUrl: `data:image/jpeg;base64,${base64Image}` 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
