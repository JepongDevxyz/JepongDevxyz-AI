// Taasan ang Vercel Function Timeout limits sa 60 seconds
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Allow lang ang POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Check kung may API key sa Vercel Environment Variables
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel settings.' });
    }

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Google AI Studio Imagen Endpoint
    const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;

    const googleResponse = await fetch(googleEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1'
        }
      })
    });

    // Subukang kunin ang raw response muna
    const rawText = await googleResponse.text();

    if (!rawText) {
      return res.status(500).json({ error: 'Empty response received from Google Imagen API.' });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON returned from Google API.' });
    }

    // Kapag may ipinadalang error ang Google (e.g. Invalid Key, Policy Violation)
    if (!googleResponse.ok) {
      const errorMessage = data?.error?.message || 'Failed to generate image via Google Imagen.';
      return res.status(googleResponse.status).json({ error: errorMessage });
    }

    // Extract ang Base64 Image Byte
    const base64Image = data?.generatedImages?.[0]?.image?.imageBytes;

    if (!base64Image) {
      return res.status(500).json({ error: 'No image byte data found in response.' });
    }

    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Return response na compatible sa iba't ibang property names na inaasahan ng frontend
    return res.status(200).json({ 
      success: true,
      image: dataUrl,
      imageUrl: dataUrl,
      url: dataUrl,
      data: [{ url: dataUrl }]
    });

  } catch (err) {
    console.error("Backend Error:", err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
