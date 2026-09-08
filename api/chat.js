export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
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
    const { message, history, files, model, mode, customPrompt, webSearch } = await req.json();
    
    const rawKeys = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS || '';
    let apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API keys configured in environment variables.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Shuffle keys (Fisher-Yates) para pantay ang ikot sa 8 accounts
    for (let i = apiKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [apiKeys[i], apiKeys[j]] = [apiKeys[j], apiKeys[i]];
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

    const currentParts = [];
    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach(f => {
        if (f.data && f.mimeType) {
          currentParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
        }
      });
    }
    if (message && message.trim()) {
      currentParts.push({ text: message.trim() });
    }

    let rawContents = [];
    if (Array.isArray(history) && history.length > 0) {
      history.forEach(turn => {
        const role = turn.role === 'bot' || turn.role === 'model' ? 'model' : 'user';
        let parts = [];
        if (Array.isArray(turn.parts) && turn.parts.length > 0) {
          parts = turn.parts;
        } else if (turn.text && turn.text.trim()) {
          parts = [{ text: turn.text.trim() }];
        }

        if (parts.length > 0) {
          rawContents.push({ role, parts });
        }
      });
    }

    if (currentParts.length > 0 && rawContents.length > 0 && rawContents[rawContents.length - 1].role === 'user') {
      rawContents.pop();
    }

    const sanitizedContents = [];
    for (const item of rawContents) {
      if (sanitizedContents.length === 0) {
        if (item.role === 'user') sanitizedContents.push(item);
      } else {
        const lastRole = sanitizedContents[sanitizedContents.length - 1].role;
        if (item.role !== lastRole) {
          sanitizedContents.push(item);
        }
      }
    }

    if (currentParts.length > 0) {
      sanitizedContents.push({
        role: 'user',
        parts: currentParts
      });
    }

    if (sanitizedContents.length === 0) {
      return new Response(JSON.stringify({ error: 'No prompt or content provided.' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    let geminiRes = null;
    let lastErrorText = '';

    // Function helper para sa API call
    async function tryCallGemini(key, useSearch) {
      const payload = {
        system_instruction: { parts: [{ text: systemInstructionText }] },
        contents: sanitizedContents
      };
      if (useSearch) {
        payload.tools = [{ google_search: {} }];
      }

      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
    }

    // Step 1: Subukan ang bawat key (may Web Search kung naka-on)
    for (const apiKey of apiKeys) {
      try {
        geminiRes = await tryCallGemini(apiKey, webSearch);
        if (geminiRes.ok) break;

        lastErrorText = await geminiRes.text();
        if (geminiRes.status !== 429 && geminiRes.status !== 403) break;
      } catch (err) {
        lastErrorText = err.message;
      }
    }

    // Step 2: KUNG nag-fail sa 429 at naka-ON ang webSearch,
    // malamang Search Tool Quota ang limit. Subukan ulit ang mga keys nang WALANG search tool para makasagot pa rin.
    if ((!geminiRes || !geminiRes.ok) && webSearch) {
      for (const apiKey of apiKeys) {
        try {
          geminiRes = await tryCallGemini(apiKey, false);
          if (geminiRes.ok) break;
          lastErrorText = await geminiRes.text();
        } catch (err) {
          lastErrorText = err.message;
        }
      }
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
