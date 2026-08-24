import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, prompt, mode, customPrompt, model: selectedModel } = req.body;
    const userPrompt = message || prompt || '';
    const rawMode = String(mode || '').toLowerCase();

    // 1. CHECK API KEYS (Random key rotation)
    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return res.status(500).json({ error: 'Walang GEMINI_API_KEY na nakaset sa Vercel Environment Variables.' });
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const ai = new GoogleGenAI({ apiKey });

    // 2. IMAGE GENERATOR MODE
    if (rawMode.includes('image') || rawMode.includes('imagen') || rawMode.includes('🎨')) {
      if (!userPrompt.trim()) {
        return res.status(400).send('Maglagay ng prompt para sa lilikhaing larawan.');
      }

      try {
        const response = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: userPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });

        const base64Bytes = response.generatedImages[0].image.imageBytes;
        const markdownImage = `![${userPrompt}](data:image/jpeg;base64,${base64Bytes})`;
        return res.status(200).send(markdownImage);

      } catch (imgError) {
        console.warn("Imagen generation failed, falling back to Pollinations:", imgError.message);
        // Fallback to Pollinations upon error or quota limit
        const seed = Math.floor(Math.random() * 1000000);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(userPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
        return res.status(200).send(`![${userPrompt}](${fallbackUrl})`);
      }
    }

    // 3. CHAT TEXT MODE (Dynamic Model Selection)
    // Updated default models to valid standard aliases
    let targetModel = 'gemini-2.0-flash'; 

    if (selectedModel) {
      const lowerModel = String(selectedModel).toLowerCase();
      if (lowerModel.includes('pro')) {
        targetModel = 'gemini-1.5-pro';
      } else if (lowerModel.includes('flash-lite')) {
        targetModel = 'gemini-2.0-flash-lite';
      } else if (lowerModel.includes('flash')) {
        targetModel = 'gemini-2.0-flash';
      }
    }

    // Dynamic Persona System Prompt
    let systemInstruction = "You are JepongDevxyz AI developed by Jepong Devxyz (Jay-Ar Lee Espiritu). Always format code inside markdown code blocks.";

    if (rawMode.includes('custom')) {
      systemInstruction = `Act according to this persona: "${customPrompt || userPrompt}".`;
    } else if (rawMode.includes('school') || rawMode.includes('homework')) {
      systemInstruction += " Act as an academic assistant for homework.";
    } else if (rawMode.includes('coder') || rawMode.includes('code')) {
      systemInstruction += " Act as an expert programmer.";
    } else if (rawMode.includes('tagalog')) {
      systemInstruction += " Speak strictly in Tagalog/Filipino.";
    } else if (rawMode.includes('affiliate')) {
      systemInstruction += " Act as a TikTok Affiliate Marketing Specialist.";
    }

    // Initialize Stream
    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    return res.end();

  } catch (error) {
    console.error("Chat Server Error:", error);
    if (!res.headersSent) {
      return res.status(500).send(`Server Error: ${error.message}`);
    }
    res.end();
  }
}
