export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Environment Variables' });
    }

    // Direct REST API Call sa Google AI Studio para sa Imagen 3
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const response = await fetch(url, {
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
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to generate image from Google API' 
      });
    }

    // Ang ibinabalik ng Imagen ay Base64 string
    const base64ImageBytes = data.predictions[0].bytesBase64Encoded;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    return res.status(200).json({ image: imageUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
