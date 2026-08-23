export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;

    // Ibalik pareho sa JSON response para madaling makuha ng frontend
    return res.status(200).json({ 
      image: generatedUrl,
      imageUrl: generatedUrl,
      url: generatedUrl,
      data: [{ url: generatedUrl }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
