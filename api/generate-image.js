export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in Vercel Environment Variables.' });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // Official Google Developer API Endpoint via :predict
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/jpeg"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to fetch image from Google Imagen API.' 
      });
    }

    // Extraction ng Base64 Image string mula sa standard REST response structure
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded || data.generatedImages?.[0]?.image?.imageBytes;

    if (!base64Image) {
      return res.status(500).json({ error: 'No image bytes returned from Google Imagen API.' });
    }

    return res.status(200).json({ 
      success: true, 
      imageUrl: `data:image/jpeg;base64,${base64Image}` 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
