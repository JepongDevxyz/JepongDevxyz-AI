export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, file, model } = await req.json();
    
    // Babasahin ang mga keys na hiwalay ng comma (e.g., KEY1,KEY2,KEY3)
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API keys configured.' }), { status: 500 });
    }

    const modelMapping = {
      'gemini-3.7-extended-thinking': 'gemini-3.6-flash',
      'gemini-3.6-flash': 'gemini-3.6-flash',
      'gemini-3.5-flash-lite': 'gemini-3.6-flash',
      'gemini-3.1-pro': 'gemini-3.6-flash'
    };

    const targetModel = modelMapping[model] || 'gemini-3.6-flash';

    const systemInstruction = {
      parts: [{ text: "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside standard markdown code blocks." }]
    };

    const parts = [];
    if (file && file.data && file.mimeType) {
      parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } });
    }
    if (message) parts.push({ text: message });

    let geminiRes = null;
    let lastErrorText = '';

    // Susubukan ang bawat API key kapag nag-429 error
    for (const apiKey of apiKeys) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            contents: [{ parts }]
          })
        }
      );

      if (geminiRes.ok) break; // Kapag gumana, ititigil na ang loop

      lastErrorText = await geminiRes.text();
      if (geminiRes.status !== 429) break; // Kung hindi quota error, huwag nang mag-retry
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(JSON.stringify({ error: lastErrorText }), { status: geminiRes ? geminiRes.status : 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      start() { this.buffer = ''; },
      async transform(chunk, controller) {
        this.buffer += decoder.decode(chunk, { stream: true });
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textChunk) {
                controller.enqueue(encoder.encode(textChunk));
              }
            } catch (e) {}
          }
        }
      }
    });

    return new Response(geminiRes.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
