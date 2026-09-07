export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const promptText = (body?.prompt || '').trim();
    if (!promptText) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    // Libreng Generator gamit ang Pollinations AI Engine (Walang kailangang bayad o billing)
    const encodedPrompt = encodeURIComponent(promptText);
    const randomSeed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${randomSeed}&width=1024&height=1024&nologo=true`;

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    });
  }
}
