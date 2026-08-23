export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required.' }), { status: 400 });
    }

    const rawKeys = process.env.GEMINI_API_KEY || '';
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API keys configured.' }), { status: 500 });
    }

    let imagenRes = null;
    let lastErrorText = '';

    for (const apiKey of apiKeys) {
      imagenRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: prompt }],
            parameters: {
              sampleCount: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1'
            }
          })
        }
      );

      if (imagenRes.ok) break;

      lastErrorText = await imagenRes.text();
      if (imagenRes.status !== 429) break;
    }

    if (!imagenRes || !imagenRes.ok) {
      return new Response(JSON.stringify({ success: false, error: lastErrorText }), { status: imagenRes ? imagenRes.status : 500 });
    }

    const data = await imagenRes.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      return new Response(JSON.stringify({ success: false, error: 'No image data returned.' }), { status: 500 });
    }

    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    return new Response(JSON.stringify({ success: true, imageUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
