import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge', // Mas mabilis na streaming support sa Vercel
};

export default async function handler(req) {
  // 1. Method Validation
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. API Key Rotation (with trim fix)
    const rawKeys = process.env.GEMINI_API_KEY;
    if (!rawKeys) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY environment variable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKeys = rawKeys.split(',').map(key => key.trim()).filter(Boolean);
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const ai = new GoogleGenAI({ apiKey: selectedKey });
    const body = await req.json();
    const { prompt, model: requestedModel, type, context } = body;

    // 3. Image Generation Mode (with Fallback to Pollinations)
    const isImageRequest = type === 'image' || (prompt && /generate image|draw|picture/i.test(prompt));
    
    if (isImageRequest) {
      try {
        const imageResponse = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });

        const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

        return new Response(JSON.stringify({ url: imageUrl }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (imgError) {
        // Fallback to Pollinations AI
        const fallbackUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}&model=flux`;
        return new Response(JSON.stringify({ url: fallbackUrl, fallback: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 4. Model Selection Mapping Fix
    let selectedModel = 'gemini-1.5-flash';
    if (requestedModel?.includes('pro')) {
      selectedModel = 'gemini-1.5-pro';
    } else if (requestedModel?.includes('lite') || requestedModel?.includes('flash-lite')) {
      selectedModel = 'gemini-1.5-flash'; // Fallback to standard fast model
    }

    // 5. System Persona Instructions
    let systemInstruction = "You are JepongDevxyz AI, developed by Jay-Ar Lee Espiritu.";
    if (context === 'school') {
      systemInstruction += " Focus on educational, clear, and academic explanations.";
    } else if (context === 'coding') {
      systemInstruction += " Provide clean, optimized code snippets with minimal unnecessary talk.";
    } else if (context === 'tiktok') {
      systemInstruction += " Act as a TikTok affiliate marketing expert. Give practical growth strategies.";
    } else {
      systemInstruction += " Respond naturally in Tagalog/English mix, friendly and engaging.";
    }

    // 6. Content Streaming Response
    const responseStream = await ai.models.generateContentStream({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of responseStream) {
          if (chunk.text) {
            controller.enqueue(encoder.encode(chunk.text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
