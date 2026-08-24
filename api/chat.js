import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Tugma sa mga pinagpipilian sa iyong Frontend Dropdown Menu
const VALID_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.7-extended-thinking',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro'
];

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, files, model, mode, customPrompt } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing' },
        { status: 500 }
      );
    }

    // 1. Model Validation with Fallback
    const selectedModel = VALID_MODELS.includes(model) ? model : 'gemini-3.6-flash';

    // 2. System Instructions based on Mode
    let systemInstructionText = "You are a helpful, smart, and precise AI assistant.";
    if (mode === 'school') {
      systemInstructionText = "You are an expert tutor. Explain concepts clearly, step-by-step, and simply. Help the student learn effectively.";
    } else if (mode === 'coder') {
      systemInstructionText = "You are a senior software developer. Write clean, optimized, production-ready code. Provide concise explanations and best practices.";
    } else if (mode === 'tagalog') {
      systemInstructionText = "Sumagot ka sa Tagalog o Taglish sa natural, maayos, at madaling maunawaang paraan.";
    } else if (mode === 'affiliate') {
      systemInstructionText = "You are a TikTok & E-commerce Affiliate Marketing Specialist. Give persuasive copy, strategy tips, viral hooks, and high-converting product descriptions.";
    } else if (mode === 'custom' && customPrompt) {
      systemInstructionText = customPrompt;
    }

    // 3. Prepare Contents (Text + File Attachments)
    const userParts = [];

    if (files && Array.isArray(files) && files.length > 0) {
      files.forEach((file) => {
        if (file.mimeType && file.data) {
          userParts.push({
            inline_data: {
              mime_type: file.mimeType,
              data: file.data
            }
          });
        }
      });
    }

    if (message) {
      userParts.push({ text: message });
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: userParts
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      }
    };

    // 4. API Request to Gemini (SSE Streaming)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error:', errorText);
      return NextResponse.json(
        { error: `Gemini API Error: ${geminiResponse.statusText}`, details: errorText },
        { status: geminiResponse.status }
      );
    }

    // 5. Robust SSE Transform Stream Handler (Iwas-Crash sa Incomplete Chunks)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');

        // Itatabi ang huling hindi pa kumpletong linya sa buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.replace('data: ', '').trim();
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
            } catch (err) {
              // Lalaktawan lamang ang invalid chunk nang hindi nagso-throw ng 500 server error
            }
          }
        }
      },
      flush(controller) {
        if (buffer.trim().startsWith('data: ')) {
          try {
            const jsonStr = buffer.trim().replace('data: ', '').trim();
            const data = JSON.parse(jsonStr);
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch (err) {}
        }
      }
    });

    const readableStream = geminiResponse.body.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
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
