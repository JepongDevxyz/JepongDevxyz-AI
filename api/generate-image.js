export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ success: false, error: 'Missing GEMINI_API_KEY in Vercel' });
    }

    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${API_KEY}`;

    const apiResponse = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: "image/jpeg", aspectRatio: "1:1" }
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ success: false, error: data.error?.message || 'Google API Error' });
    }

    const base64Bytes = data.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Bytes) {
      return res.status(500).json({ success: false, error: 'No image data returned' });
    }

    return res.status(200).json({ success: true, imageUrl: `data:image/jpeg;base64,${base64Bytes}` });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Server Error' });
  }
}
