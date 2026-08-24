export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const message = body.message || body.prompt || '';
    const rawMode = String(body.mode || '').toLowerCase();
    const rawModel = String(body.model || '').toLowerCase();

    // 1. IMAGE GENERATOR MODE (Kahit anong variations ng word na image/imagen)
    if (rawMode.includes('image') || rawMode.includes('imagen') || rawMode.includes('🎨')) {
      if (!message.trim()) {
        return new Response('Maglagay ng prompt para sa lilikhaing larawan.', { status: 400 });
      }

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(message)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
      
      return new Response(`![${message}](${imageUrl})`, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 2. CHECK API KEYS
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response('Walang GEMINI_API_KEY na nakaset.', { status: 500 });
    }

    const activeApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // 3. HARDCODED VALID GEMINI MODEL (Iwas 404 kahit ano pang ipasa ng dropdown)
    // Ginagawang default ang gemini-1.5-flash dahil ito ang pinaka-stable sa v1beta
    let targetModel = 'gemini-1.5-flash';

    if (rawModel.includes('pro')) {
      targetModel = 'gemini-1.5-pro';
    }

    // 4. SYSTEM INSTRUCTIONS / PERSONA
    let systemInstructionText = "You are JepongDevxyz AI developed by Jepong Devxyz (Jay-Ar Lee Espiritu). Always format code inside markdown code blocks.";

    if (rawMode.includes('custom')) {
      systemInstructionText = `Act according to this persona: "${body.customPrompt || message}".`;
    } else if (rawMode.includes('school') || rawMode.includes('homework')) {
      systemInstructionText += " Act as an academic assistant for homework.";
    } else if (rawMode.includes('coder') || rawMode.includes('code')) {
      systemInstructionText += " Act as an expert programmer.";
    } else if (rawMode.includes('tagalog')) {
      systemInstructionText += " Speak strictly in Tagalog/Filipino.";
    }

    // 5. PREPARE PAYLOAD
    const parts = [];

    if (body.files && Array.isArray(body.files)) {
      body.files.forEach(f => {
        if (f.data && f.mimeType) parts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
      });
    } else if (body.file && body.file.data) {
      parts.push({ inline_data: { mime_type: body.file.mimeType, data: body.file.data } });
    }

    if (message) parts.push({ text: message });

    // 6. CALL API WITH FALLBACK
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${activeApiKey}`;

    let geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstructionText }] },
        contents: [{ parts }]
      })
    });

    if (!geminiRes.ok) {
      // Kung mag-error pa rin ang model, gagamit ng absolute fallback
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${activeApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        }
      );
    }

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(`API Error: ${errorText}`, { status: geminiRes.status });
    }

    // 7. STREAM TRANSFORM
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    return new Response(`Server Error: ${error.message}`, { status: 500 });
  }
}
