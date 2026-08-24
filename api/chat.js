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

    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response('Walang GEMINI_API_KEY na nakaset sa environment variables.', { status: 500 });
    }

    const activeApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // 1. IMAGE GENERATOR MODE (IMAGEN 3)
    const isImageMode = mode === 'image' || 
                        mode === 'imagen' || 
                        mode === 'Image Generator' || 
                        mode === '🎨 Image Generator';

    if (isImageMode) {
      if (!message.trim()) {
        return new Response('Maglagay ng prompt para sa lilikhaing larawan.', { status: 400 });
      }

      let markdownImage = '';

      try {
        // Correct REST Endpoint Structure for Imagen 3
        const imgRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${activeApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: message,
              config: {
                numberOfImages: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/jpeg"
              }
            })
          }
        );

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const base64 = imgData.generatedImages?.[0]?.image?.imageBytes;
          if (base64) {
            markdownImage = `![${message}](data:image/jpeg;base64,${base64})`;
          }
        }
      } catch (err) {
        console.error('Imagen API Error:', err);
      }

      // Fallback kung sakaling may API quota error/limit sa Google Imagen
      if (!markdownImage) {
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(message)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
        markdownImage = `![${message}](${imageUrl})`;
      }

      return new Response(markdownImage, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 2. CHAT MODELS MAPPING (Valid Google Gemini Models)
    const MODEL_MAPPING = {
      '3.6 Flash': 'gemini-2.5-flash',
      '3.7 Flash': 'gemini-2.5-flash',
      '3.5 Flash-Lite': 'gemini-2.5-flash-lite',
      '3.1 Pro': 'gemini-2.5-pro',
      'Extended thinking': 'gemini-2.5-flash',
      'gemini-3.6-flash': 'gemini-2.5-flash',
      'gemini-3.7-flash': 'gemini-2.5-flash',
      'gemini-3.5-flash-lite': 'gemini-2.5-flash-lite',
      'gemini-2.5-flash': 'gemini-2.5-flash'
    };

    const targetModel = MODEL_MAPPING[model] || 'gemini-2.5-flash';

    // 3. PERSONA LOGIC
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

    // 4. ATTACHMENTS HANDLING
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

    // 5. CALL CHAT STREAM ENDPOINT
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

    // Fallback kapag nag-404 ang napiling model
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
      return new Response(errorText, { status: geminiRes.status });
    }

    // 6. RESPONSE STREAMING
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
    return new Response(error.message, { status: 500 });
  }
}
