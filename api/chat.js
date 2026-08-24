export const config = {
  runtime: 'edge',
};

// Helper function para sa delay kapag nag-hit ng Rate Limit (429)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { message, file, files, model, mode, customPrompt } = await req.json();
    
    // Kunin ang API keys at i-shuffle para ma-distribute nang maayos ang traffic
    const rawKeys = process.env.GEMINI_API_KEY || '';
    let apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API keys configured.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Randomize order ng API keys para sa load balancing
    apiKeys = apiKeys.sort(() => Math.random() - 0.5);

    // Listahan ng valid 3.x Gemini models
    const VALID_MODELS = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro'
    ];

    // Gagamitin ang gemini-3.7-flash bilang default fallback
    const targetModel = VALID_MODELS.includes(model) ? model : 'gemini-3.7-flash';

    let systemInstructionText = "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside standard markdown code blocks.";

    if (mode === 'school') {
      systemInstructionText += " Act as an academic assistant. Help with homework, school projects, essays, research, and study guides with detailed, accurate, and educational explanations.";
    } else if (mode === 'coder') {
      systemInstructionText += " Act as an expert software engineer and senior programmer. Provide clean, well-commented code, debugging solutions, and system architectural designs.";
    } else if (mode === 'tagalog') {
      systemInstructionText += " Speak strictly in natural, pure Tagalog/Filipino language as a warm, friendly, and helpful companion. Avoid heavy English unless technical terms require it.";
    } else if (mode === 'affiliate') {
      systemInstructionText += " Act as a top-tier digital affiliate marketing expert and strategist. Help write compelling product scripts, promotional copy, sales hooks, call-to-actions, and social media engagement strategies for TikTok/Shopee/Lazada affiliate marketing.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstructionText += ` ${customPrompt}`;
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

    if (message) parts.push({ text: message });

    let geminiRes = null;
    let lastErrorText = '';

    // Subukan ang bawat API key at maglagay ng delay kung mag-429 Rate Limit
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];

      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            contents: [{ parts }],
            tools: [{ googleSearch: {} }]
          })
        }
      );

      if (geminiRes.ok) break;

      lastErrorText = await geminiRes.text();

      // Kapag 429 Too Many Requests, mag-wait ng 1.5 seconds bago gumamit ng susunod na API key
      if (geminiRes.status === 429) {
        await delay(1500);
      } else {
        break; // Kapag ibang error (tulad ng 400 Bad Request), huwag nang subukan sa ibang key
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(JSON.stringify({ error: lastErrorText }), { 
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
