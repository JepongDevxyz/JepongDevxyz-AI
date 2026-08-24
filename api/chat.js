import { NextResponse } from 'next/server';

export const runtime = 'edge';

// I-map ang frontend dropdown selections papunta sa opisyal na Google API model IDs
const MODEL_MAPPING = {
  'gemini-3.7-flash': 'gemini-1.5-flash',
  'gemini-3.7-extended-thinking': 'gemini-1.5-pro',
  'gemini-3.6-flash': 'gemini-1.5-flash',
  'gemini-3.5-flash-lite': 'gemini-1.5-flash',
  'gemini-3.1-pro': 'gemini-1.5-pro'
};

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, files, model, mode, customPrompt } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // 1. Model Mapping
    const targetModel = MODEL_MAPPING[model] || 'gemini-1.5-flash';

    // 2. System Instructions base sa Mode
    let systemInstructionText = "You are a helpful, smart, and precise AI assistant.";
    if (mode === 'school') {
      systemInstructionText = "You are an expert tutor. Explain concepts clearly, step-by-step, and simply.";
    } else if (mode === 'coder') {
      systemInstructionText = "You are a senior software developer. Write clean, optimized, production-ready code.";
    } else if (mode === 'tagalog') {
      systemInstructionText = "Sumagot ka sa Tagalog o Taglish sa natural, maayos, at madaling maunawaang paraan.";
    } else if (mode === 'affiliate') {
      systemInstructionText = "You are a TikTok & E-commerce Affiliate Marketing Specialist.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstructionText = customPrompt;
    }

    // 3. i-Format ang Content Parts
    const userParts = [];

    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach((file) => {
        if (file.mimeType && file.data) {
          const cleanBase64 = file.data.includes(',') ? file.data.split(',')[1] : file.data;
          userParts.push({
            inline_data: {
              mime_type: file.mimeType,
              data: cleanBase64
            }
          });
        }
      });
    }

    if (message) {
      userParts.push({ text: message });
    }

    const payload = {
      contents: [{ role: 'user', parts: userParts }],
      systemInstruction: { parts: [{ text: systemInstructionText }] }
    };

    // 4. API Request sa Google Gemini Endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Google API Error:', errorText);
      return NextResponse.json(
        { error: `API Error (${geminiResponse.status}): ${errorText}` },
        { status: geminiResponse.status }
      );
    }

    // 5. Safe SSE Stream Parser
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.replace('data: ', '').trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              const parts = data.candidates?.[0]?.content?.parts;
              if (parts && Array.isArray(parts)) {
                for (const part of parts) {
                  if (part.text) {
                    controller.enqueue(encoder.encode(part.text));
                  }
                }
              }
            } catch (e) {
              // I-skip lang ang mga partial/broken JSON chunks
            }
          }
        }
      }
    });

    return new Response(geminiResponse.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Server Handler Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
