export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Google AI Studio Imagen 3/4 Endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1'
        }
      })
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      return res.status(googleResponse.status).json({ 
        error: data.error?.message || 'Google Imagen API error' 
      });
    }

    // Extraction ng Base64 Image
    const base64Image = data.generatedImages?.[0]?.image?.imageBytes;

    if (!base64Image) {
      return res.status(500).json({ error: 'No image data returned from Imagen API' });
    }

    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Compatibility payload para sa frontend
    return res.status(200).json({ 
      image: dataUrl,
      imageUrl: dataUrl,
      url: dataUrl,
      data: [{ url: dataUrl }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
