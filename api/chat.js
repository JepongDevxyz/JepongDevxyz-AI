export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Environment Variables.' });
  }

  try {
    const { message, prompt, model } = req.body || {};
    const userPrompt = message || prompt;
    const targetModel = model || 'gemini-3.6-flash';

    if (!userPrompt) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API Error' });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Walang sagot mula sa AI.';

    return res.status(200).json({ 
      reply: replyText,
      result: replyText 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
