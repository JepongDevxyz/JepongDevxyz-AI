export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, files = [], model, mode, customPrompt } = await req.json();

    // Valid 3.x series models na tugma sa mga opisyal na API endpoint string
    const VALID_MODELS = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-3.7-extended-thinking'
    ];

    // Fallback: Kapag wala sa listahan, gamitin ang gemini-3.6-flash
    const selectedModel = VALID_MODELS.includes(model) ? model : 'gemini-3.6-flash';

    // System Prompts batay sa napiling Mode
    let systemInstruction = "You are JepongDevxyz AI, a helpful, precise, and friendly AI assistant.";
    if (mode === 'school') {
      systemInstruction = "You are an educational tutor. Explain concepts clearly with step-by-step guidance.";
    } else if (mode === 'coder') {
      systemInstruction = "You are an expert software engineer. Provide high-quality, efficient code with clear comments.";
    } else if (mode === 'tagalog') {
      systemInstruction = "Magsalita ka gamit ang taos-pusong Tagalog/Taglish na parang isang tropa o matalik na kaibigan.";
    } else if (mode === 'affiliate') {
      systemInstruction = "You are an expert TikTok & Online Shop Affiliate Marketer. Provide persuasive copy, hooks, and strategy.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstruction = customPrompt;
    }

    // Format ng contents payload
    const contents = [];
    const userParts = [];

    if (message) {
      userParts.push({ text: message });
    }

    if (files && files.length > 0) {
      files.forEach(file => {
        userParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        });
      });
    }

    contents.push({ role: 'user', parts: userParts });

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKey}`;

    const googleRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: googleRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stream the response back to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = googleRes.body.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep last incomplete line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textChunk) {
                      controller.enqueue(encoder.encode(textChunk));
                    }
                  } catch (e) {
                    // skip malformed JSON chunks
                  }
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
