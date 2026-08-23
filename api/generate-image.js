export default async function handler(req, res) {
  // Siguraduhin na laging JSON ang ibabalik kahit may error
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
      return res.status(500).json({ success: false, error: 'Missing GEMINI_API_KEY in Environment Variables' });
    }

    // Google API Endpoint para sa Imagen
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${API_KEY}`;

    const apiResponse = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1"
        }
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        success: false,
        error: data.error?.message || 'Google API Error'
      });
    }

    const base64ImageBytes = data.generatedImages?.[0]?.image?.imageBytes;

    if (!base64ImageBytes) {
      return res.status(500).json({ success: false, error: 'No image data returned from Google API' });
    }

    return res.status(200).json({
      success: true,
      imageUrl: `data:image/jpeg;base64,${base64ImageBytes}`
    });

  } catch (err) {
    // Sisiguraduhing makakatanggap pa rin ng valid JSON response ang Frontend sa anumang crash
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
}
