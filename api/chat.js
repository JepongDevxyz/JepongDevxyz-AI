import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    runtime: 'edge', // Fast streaming sa Vercel Edge Runtime
};

export default async function handler(req) {
    // Payagan ang HEAD request para sa ping/network check ng dex.html
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
        const { message, files, model, mode, customPrompt } = await req.json();

        // 1. Kunan ang GEMINI_API_KEYS variable at i-split sa kuwit (,)
        const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
        const apiKeys = rawKeys
            .split(',')
            .map(k => k.trim())
            .filter(Boolean);

        if (apiKeys.length === 0) {
            return new Response(JSON.stringify({ error: 'Walang nahanap na GEMINI_API_KEYS sa environment variables.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Shuffle / Randomize ang listahan para nahahati nang pantay ang load sa 6 na keys
        const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5);

        // 3. Dynamic Model Mapping (Tumutugma na sa UI ng dex.html)
        let targetModel = 'gemini-2.5-flash';
        if (model) {
            if (model.includes('3.1-pro') || model.includes('pro')) {
                targetModel = 'gemini-2.5-pro';
            } else if (model.includes('flash-lite') || model.includes('lite')) {
                targetModel = 'gemini-2.5-flash-lite';
            } else if (model.includes('3.6-flash') || model.includes('flash')) {
                targetModel = 'gemini-2.5-flash';
            } else if (model.includes('thinking')) {
                targetModel = 'gemini-2.5-pro'; // Ginagamit ang Pro para sa deep reasoning
            } else {
                targetModel = model; // Fallback kung eksaktong model name ang ipinasa
            }
        }

        // 4. Setup System Persona/Instruction
        let systemInstruction = "You are a helpful and intelligent AI assistant.";
        if (mode === 'school') {
            systemInstruction = "You are an expert academic tutor. Explain concepts clearly with structured examples.";
        } else if (mode === 'coder') {
            systemInstruction = "You are a senior software developer. Provide clean, efficient code with explanations.";
        } else if (mode === 'tagalog') {
            systemInstruction = "Ikaw ay isang kaibigang Pilipino. Sumagot gamit ang natural at kaswal na Tagalog/Taglish.";
        } else if (mode === 'affiliate') {
            systemInstruction = "You are a persuasive affiliate marketing strategist and copywriter.";
        } else if (mode === 'custom' && customPrompt) {
            systemInstruction = customPrompt;
        }

        // 5. Format prompt parts (text + attachments)
        const promptParts = [];
        if (files && files.length > 0) {
            files.forEach(file => {
                promptParts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.data
                    }
                });
            });
        }
        if (message) {
            promptParts.push(message);
        }

        let resultStream = null;
        let lastError = null;

        // 6. ROTATION LOGIC: Subukan ang bawat key sa listahan kapag nag-fail ang nauna
        for (const apiKey of shuffledKeys) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const geminiModel = genAI.getGenerativeModel({
                    model: targetModel,
                    systemInstruction: systemInstruction,
                });

                const result = await geminiModel.generateContentStream({
                    contents: [{ role: 'user', parts: promptParts }]
                });

                resultStream = result.stream;
                break; // Kapag gumana nang maayos, lalabas na sa loop!
            } catch (err) {
                console.warn(`Key failed/rate-limited, rotating to next key... Error: ${err.message}`);
                lastError = err;
            }
        }

        // Kung sakaling mag-fail lahat ng API keys
        if (!resultStream) {
            return new Response(JSON.stringify({ 
                error: `Lahat ng ${shuffledKeys.length} API keys ay nag-error o na-reach ang rate limit. Error: ${lastError?.message}` 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 7. I-stream ang sagot pabalik sa UI
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of resultStream) {
                        const text = chunk.text();
                        controller.enqueue(encoder.encode(text));
                    }
                } catch (e) {
                    controller.error(e);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
