import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, prompt, mode, customPrompt } = req.body;
    const userPrompt = message || prompt || '';
    const rawMode = String(mode || '').toLowerCase();

    // 1. CHECK API KEYS
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
        // Fallback sa Pollinations kapag quota limit o error ang Imagen
        const seed = Math.floor(Math.random() * 1000000);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(userPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
        return res.status(200).send(`![${userPrompt}](${fallbackUrl})`);
      }
    }

    // 3. CHAT TEXT MODE
    let systemInstruction = "You are JepongDevxyz AI developed by Jepong Devxyz (Jay-Ar Lee Espiritu). Always format code inside markdown code blocks.";

    if (rawMode.includes('custom')) {
      systemInstruction = `Act according to this persona: "${customPrompt || userPrompt}".`;
    } else if (rawMode.includes('school') || rawMode.includes('homework')) {
      systemInstruction += " Act as an academic assistant for homework.";
    } else if (rawMode.includes('coder') || rawMode.includes('code')) {
      systemInstruction += " Act as an expert programmer.";
    } else if (rawMode.includes('tagalog')) {
      systemInstruction += " Speak strictly in Tagalog/Filipino.";
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    return res.end();

  } catch (error) {
    return res.status(500).send(`Server Error: ${error.message}`);
  }
}
