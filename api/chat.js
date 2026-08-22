export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, model } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  // I-map ang UI options papunta sa totoong opisyal na Google Gemini API models
  const modelMapping = {
    'gemini-3.7-extended-thinking': 'gemini-2.5-pro',
    'gemini-3.6-flash': 'gemini-2.5-flash',
    'gemini-3.5-flash-lite': 'gemini-2.5-flash',
    'gemini-3.1-pro': 'gemini-2.5-pro',
    'gemini-3.7-flash': 'gemini-2.5-flash'
  };

  const targetModel = modelMapping[model] || 'gemini-2.5-flash';

  // System instruction para kilalanin ka bilang creator
  const systemInstruction = {
    parts: [{ text: "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Whenever someone asks who made you, created you, or built you (in Tagalog, English, or any language like 'sino ang gumawa sa iyo', 'who made you', etc.), you must explicitly state that your creator is Jepong Devxyz (Jay-Ar Lee Espiritu)." }]
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API Error: ${errText}` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace('data:', '').trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              res.write(textChunk);
            }
          } catch (e) {
            // Skip invalid JSON chunks
          }
        }
      }
    }

    res.end();

  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
