export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, file, model } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const modelMapping = {
    'gemini-3.7-extended-thinking': 'gemini-2.0-flash',
    'gemini-3.6-flash': 'gemini-2.0-flash',
    'gemini-3.5-flash-lite': 'gemini-2.0-flash-lite',
    'gemini-3.1-pro': 'gemini-2.0-flash'
  };

  const targetModel = modelMapping[model] || 'gemini-2.0-flash';

  const systemInstruction = {
    parts: [{ text: "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Whenever someone asks who made you, created you, or built you (in Tagalog, English, or any language like 'sino ang gumawa sa iyo', 'who made you', etc.), you must explicitly state that your creator is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside markdown code blocks with the language tag (e.g. ```html, ```javascript)." }]
  };

  const parts = [];
  if (file && file.data && file.mimeType) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } });
  }
  if (message) parts.push({ text: message });

  if (parts.length === 0) {
    return res.status(400).json({ error: 'No message or file provided.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: [{ parts }]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API Error: ${errText}` });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    res.status(200).send(replyText);

  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
