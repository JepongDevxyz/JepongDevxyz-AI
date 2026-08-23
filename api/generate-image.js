// Example: api/generate-image.js (Vercel / Node.js Serverless Function)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const API_KEY = process.env.GEMINI_API_KEY; // Siguraduhing naka-set ang iyong API key

  // Endpoint para sa Imagen 4
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4:generateImages?key=${API_KEY}`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1",
          personGeneration: "ALLOW_ADULT"
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Magbabalik ng malinaw na error message mula sa Google API kapag may problema
      const errorMsg = data.error?.message || JSON.stringify(data);
      throw new Error(errorMsg);
    }

    // Kukunin ang base64 image data mula sa response ng Imagen 4
    const base64ImageBytes = data.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image with Imagen 4'
    });
  }
}
