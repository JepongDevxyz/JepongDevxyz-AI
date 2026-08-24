import { NextResponse } from 'next/server';

export const runtime = 'edge';

const VALID_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.7-extended-thinking',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro'
];

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, files, model, mode, customPrompt } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CONFIG_ERROR: Ang GEMINI_API_KEY ay wala sa environment variables.' },
        { status: 500 }
      );
    }

    // Model selection logic
    let selectedModel = VALID_MODELS.includes(model) ? model : 'gemini-3.6-flash';
    if (model === 'gemini-3.7-extended-thinking') {
      selectedModel = 'gemini-3.7-flash'; // I-fallback sa 3.7 flash kung gamit ang extended thinking flag
    }

    // System Instructions
    let systemInstructionText = "You are a helpful, smart, and precise AI assistant.";
    if (mode === 'school') {
      systemInstructionText = "You are an expert tutor. Explain concepts clearly, step-by-step, and simply.";
    } else if (mode === 'coder') {
      systemInstructionText = "You are a senior software developer. Write clean, optimized code.";
    } else if (mode === 'tagalog') {
      systemInstructionText = "Sumagot ka sa Tagalog o Taglish sa natural, maayos, at madaling maunawaang paraan.";
    } else if (mode === 'affiliate') {
      systemInstructionText = "You are a TikTok & E-commerce Affiliate Marketing Specialist.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstructionText = customPrompt;
    }

    // Structure Request Parts
    const userParts = [];

    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach((file) => {
        if (file.mimeType && file.data) {
          // Tanggalin ang base64 header prefix kung naisama mula sa frontend
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

    if (userParts.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST: Walang text message o file na naipasa sa request.' },
        { status: 400 }
      );
    }

    const payload = {
      contents: [{ role: 'user', parts: userParts }],
      systemInstruction: { parts: [{ text: systemInstructionText }] }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error Detail:', errorText);
      
      // Ibalik ang eksaktong dahilan galing sa Google para makita sa app
      return NextResponse.json(
        { error: `GEMINI_API_REJECTED (${geminiResponse.status}): ${errorText}` },
        { status: geminiResponse.status }
      );
    }

    // SSE Stream Transformation
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
              // Ignore partial JSON parse errors safely
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

  } catch (err) {
    console.error('Unhandled Edge Error:', err);
    return NextResponse.json(
      { error: `SERVER_EXCEPTIONAL_CRASH: ${err.message || 'Unknown Error'}` },
      { status: 500 }
    );
  }
}
