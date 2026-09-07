export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Support sa HEAD request para sa ping/network status checker ng frontend
  if (req.method === 'HEAD') {
    return new Response(null, { status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { message, history, files, model, mode, customPrompt } = await req.json();
    
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API keys configured in environment variables.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const VALID_MODELS = [
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite'
    ];

    let targetModel = model || 'gemini-flash-latest';
    if (!VALID_MODELS.includes(targetModel)) {
      targetModel = 'gemini-flash-latest';
    }

    let systemInstructionText = "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside standard markdown code blocks.";

    if (mode === 'school') {
      systemInstructionText += " Act as an academic assistant. Help with homework, school projects, essays, research, and study guides with detailed, accurate, and educational explanations.";
    } else if (mode === 'coder') {
      systemInstructionText += " Act as an expert software engineer and senior programmer. Provide clean, well-commented code, debugging solutions, and system architectural designs.";
    } else if (mode === 'tagalog') {
      systemInstructionText += " Speak strictly in natural, pure Tagalog/Filipino language as a warm, friendly, and helpful companion. Avoid heavy English unless technical terms require it.";
    } else if (mode === 'affiliate') {
      systemInstructionText += " Act as a top-tier digital affiliate marketing expert and strategist. Help write compelling product scripts, promotional copy, sales hooks, call-to-actions, and social media engagement strategies.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstructionText += ` ${customPrompt}`;
    }

    const systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };

    // Ihanda ang continuous multi-turn chat contents
    let contents = [];

    if (Array.isArray(history) && history.length > 0) {
      contents = history.map(turn => ({
        role: turn.role === 'model' || turn.role === 'bot' ? 'model' : 'user',
        parts: Array.isArray(turn.parts) ? turn.parts : [{ text: turn.text || '' }]
      }));
    }

    // Buuin ang current turn
    const currentParts = [];
    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach(f => {
        if (f.data && f.mimeType) {
          currentParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
        }
      });
    }

    if (message) {
      currentParts.push({ text: message });
    }

    // Idagdag kung may laman ang latest prompt
    if (currentParts.length > 0) {
      contents.push({
        role: 'user',
        parts: currentParts
      });
    }

    let geminiRes = null;
    let lastErrorText = '';

    for (const apiKey of apiKeys) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            contents: contents
          })
        }
      );

      if (geminiRes.ok) break;

      lastErrorText = await geminiRes.text();
      if (geminiRes.status !== 429) break;
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(JSON.stringify({ error: lastErrorText || 'Failed to communicate with Gemini API' }), { 
        status: geminiRes ? geminiRes.status : 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
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
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
