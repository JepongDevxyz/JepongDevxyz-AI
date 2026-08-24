export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const body = await req.json();
    const message = body.message || body.prompt || '';
    const { model, mode, customPrompt, file, files } = body;

    // 1. IMAGE GENERATOR MODE (Streamed Markdown Image Response)
    const isImageMode = mode === 'image' || 
                        mode === 'imagen' || 
                        mode === 'Image Generator' || 
                        mode === '🎨 Image Generator';

    if (isImageMode) {
      if (!message.trim()) {
        return new Response('Pakilagay ang prompt para sa lilikhaing larawan.', {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(message)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
      
      // Markdown formatted image na maiintindihan agad ng frontend chat UI
      const markdownImageResponse = `Eto na ang iyong hiniling na larawan para sa "${message}":\n\n![${message}](${imageUrl})`;

      return new Response(markdownImageResponse, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 2. CHECK API KEYS
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY configured.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 3. MODEL MAPPING
    const MODEL_MAPPING = {
      '3.6 Flash': 'gemini-3.6-flash',
      '3.7 Flash': 'gemini-3.7-flash',
      '3.5 Flash-Lite': 'gemini-3.5-flash-lite',
      '3.1 Pro': 'gemini-3.1-pro-preview',
      'Extended thinking': 'gemini-3.7-flash',
      'gemini-3.6-flash': 'gemini-3.6-flash',
      'gemini-3.7-flash': 'gemini-3.7-flash',
      'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
      'gemini-2.5-flash': 'gemini-2.5-flash'
    };

    const targetModel = MODEL_MAPPING[model] || 'gemini-3.6-flash';

    // 4. PERSONA & SYSTEM INSTRUCTION LOGIC
    let systemInstructionText = "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always format code inside markdown code blocks.";

    if (mode === 'custom' || mode === 'Custom Persona' || mode === '🎭 Custom Persona') {
      const activePersona = customPrompt && customPrompt.trim() !== '' ? customPrompt : message;
      systemInstructionText = `You are JepongDevxyz AI. Strictly adopt and act according to this persona: "${activePersona}". Format code inside markdown code blocks.`;
    } else if (mode === 'school' || mode === '🎓 Homework Helper') {
      systemInstructionText += " Act as an academic assistant for homework and study guides.";
    } else if (mode === 'coder' || mode === '💻 Code Assistant') {
      systemInstructionText += " Act as an expert software engineer and senior programmer.";
    } else if (mode === 'tagalog' || mode === '🇵🇭 Tagalog Companion') {
      systemInstructionText += " Speak strictly in natural, pure Tagalog/Filipino language.";
    }

    const systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };

    // 5. ATTACHMENTS & MESSAGES ASSEMBLY
    const parts = [];

    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach(f => {
        if (f.data && f.mimeType) {
          parts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
        }
      });
    } else if (file && file.data && file.mimeType) {
      parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } });
    }

    if (message) parts.push({ text: message });

    const activeApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // 6. CALL GOOGLE GEMINI API WITH AUTOMATIC FALLBACK
    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${activeApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: [{ parts }]
        })
      }
    );

    if (geminiRes.status === 404) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${activeApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            contents: [{ parts }]
          })
        }
      );
    }

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(JSON.stringify({ error: errorText }), { 
        status: geminiRes.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 7. STREAM RESPONSE VIA TRANSFORMSTREAM
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
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
