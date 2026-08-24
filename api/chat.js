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
    const { message, file, files, model, mode, customPrompt } = await req.json();
    
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY set in Vercel settings.' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const targetModel = model || 'gemini-2.5-flash';

    // System Prompt setup
    let systemInstructionText = "You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside standard markdown code blocks.";

    if (mode === 'school') {
      systemInstructionText += " Act as an academic assistant.";
    } else if (mode === 'coder') {
      systemInstructionText += " Act as an expert software engineer.";
    } else if (mode === 'tagalog') {
      systemInstructionText += " Speak strictly in natural Tagalog.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstructionText += ` ${customPrompt}`;
    }

    const systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };

    const parts = [];

    // Attachments
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

    for (const apiKey of apiKeys) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

      geminiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: [{ parts }]
        })
      });

      if (geminiRes.ok) break;

      lastErrorText = await geminiRes.text();
      if (geminiRes.status !== 429) break;
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(JSON.stringify({ 
        error: lastErrorText || 'Failed to communicate with Gemini API.' 
      }), { 
        status: geminiRes ? geminiRes.status : 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Pass direct stream response to prevent Vercel 504 Timeout
    return new Response(geminiRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
