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
    const { message, prompt, file, files, model, mode, customPrompt } = await req.json();
    const userPrompt = message || prompt || '';

    // ==========================================
    // 1. IMAGE GENERATOR MODE (HANDLED DIRECTLY)
    // ==========================================
    if (mode === 'image' || mode === 'imagen' || mode === 'Image Generator') {
      if (!userPrompt.trim()) {
        return new Response(JSON.stringify({ error: 'Prompt is required for image generation.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(userPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

      // Return JSON directly so frontend doesn't throw "Unexpected end of JSON input"
      return new Response(JSON.stringify({
        success: true,
        type: 'image',
        imageUrl: imageUrl,
        resultUrl: imageUrl,
        text: `![Generated Image](${imageUrl})`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 2. TEXT & CUSTOM PERSONA CHAT MODE
    // ==========================================
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY configured in environment.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Model Safeguard: Converts Frontend Labels to Valid Official Gemini API Identifiers
    const MODEL_MAPPING = {
      '3.5 Flash-Lite': 'gemini-2.5-flash-lite',
      '3.6 Flash': 'gemini-2.5-flash',
      '3.1 Pro': 'gemini-1.5-pro',
      'Extended thinking': 'gemini-2.5-flash',
      'gemini-3.6-flash': 'gemini-2.5-flash',
      'gemini-3.5-flash-lite': 'gemini-2.5-flash-lite',
      'gemini-3.1-pro': 'gemini-1.5-pro'
    };

    const targetModel = MODEL_MAPPING[model] || model || 'gemini-2.5-flash';

    // Base System Persona Logic
    let systemInstructionText = "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside standard markdown code blocks.";

    if (mode === 'custom' || mode === 'Custom Persona') {
      const activeCustomPersona = customPrompt || userPrompt;
      systemInstructionText = `You are JepongDevxyz AI. Strictly adopt and act according to this persona: "${activeCustomPersona}". Always structure code responses inside standard markdown code blocks.`;
    } else if (mode === 'school') {
      systemInstructionText += " Act as an academic assistant for homework, essays, and study guides.";
    } else if (mode === 'coder') {
      systemInstructionText += " Act as an expert software engineer and senior programmer.";
    } else if (mode === 'tagalog') {
      systemInstructionText += " Speak strictly in natural, pure Tagalog/Filipino language.";
    }

    const systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };

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

    if (userPrompt) parts.push({ text: userPrompt });

    // Pick random API key to distribute load
    const activeApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${activeApiKey}`;

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents: [{ parts }]
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(JSON.stringify({ 
        error: `Gemini API Error (${geminiRes.status}): ${errorText}` 
      }), { 
        status: geminiRes.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // TransformStream for SSE Streaming text output
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
