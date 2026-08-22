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

    // Set headers for Server-Sent Events (SSE) streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // System instruction para laging tandaan ang creator mo
    const systemInstruction = {
      parts: [{
        text: "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Whenever someone asks who made you, created you, or built you (in Tagalog, English, or any language like 'sino ang gumawa sa iyo', 'who made you', etc.), you must explicitly state that your creator is Jepong Devxyz (Jay-Ar Lee Espiritu)."
      }]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: [{ parts: [{ text: userPrompt }] }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      res.write(`data: ${JSON.stringify('Error: ' + (errorData.error?.message || 'API Error'))}\n\n`);
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop();

      for (const part of parts) {
        const cleanPart = part.trim();
        if (cleanPart.startsWith('{') || cleanPart.startsWith('[')) {
          try {
            const formatted = cleanPart.replace(/^\[|,|\]$/g, '');
            if (!formatted) continue;
            const parsed = JSON.parse(formatted);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              res.write(`data: ${JSON.stringify(textChunk)}\n\n`);
            }
          } catch (e) {
            // Ignore parse chunk errors during stream
          }
        }
      }
    }

    res.write('data: [DONE]\n\n');
    return res.end();

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
