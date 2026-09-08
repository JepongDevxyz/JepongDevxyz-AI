export const config = {
  runtime: 'edge',
};

const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];

const CLOUDFLARE_MODELS = [
  '@cf/zai-org/glm-4.7-flash',
  '@cf/google/gemma-4-26b-a4b-it',
  '@cf/nvidia/nemotron-3-120b-a12b'
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
  });
}

function buildSystemInstruction(mode, customPrompt, liveWebContext) {
  let text =
    'You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Always structure code responses inside standard markdown code blocks.';

  if (liveWebContext) {
    text += liveWebContext;
  }

  if (mode === 'school') {
    text +=
      ' Act as an academic assistant. Help with homework, school projects, essays, research, and study guides with detailed, accurate, and educational explanations.';
  } else if (mode === 'coder') {
    text +=
      ' Act as an expert software engineer and senior programmer. Provide clean, well-commented code, debugging solutions, and system architectural designs.';
  } else if (mode === 'tagalog') {
    text +=
      ' Speak strictly in natural, pure Tagalog/Filipino language as a warm, friendly, and helpful companion. Avoid heavy English unless technical terms require it.';
  } else if (mode === 'affiliate') {
    text +=
      ' Act as a top-tier digital affiliate marketing expert and strategist. Help write compelling product scripts, promotional copy, sales hooks, call-to-actions, and social media engagement strategies.';
  } else if (mode === 'custom' && customPrompt) {
    text += ` ${customPrompt}`;
  }

  return text;
}

async function getLiveWebContext(message, webSearch) {
  if (!webSearch || !message) {
    return '';
  }

  try {
    const isWeatherQuery =
      /(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i.test(message);

    if (isWeatherQuery) {
      const locMatch = message.match(
        /(?:sa|in|for|at)\s+([a-zA-Z\s,.-]+)/i
      );

      const location = locMatch
        ? locMatch[1].trim()
        : 'Guimba';

      const weatherRes = await fetch(
        `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
        {
          headers: {
            'User-Agent': 'curl/7.68.0'
          },
          signal: AbortSignal.timeout(3500),
        }
      );

      if (weatherRes.ok) {
        const wData = await weatherRes.json();

        const current =
          wData.current_condition?.[0] || {};

        const nearest =
          wData.nearest_area?.[0] || {};

        return `

[REAL-TIME LIVE WEATHER DATA]:
Location: ${nearest.areaName?.[0]?.value || location}, ${nearest.region?.[0]?.value || ''}, Philippines
Current Temperature: ${current.temp_C || 'N/A'}°C
Feels like: ${current.FeelsLikeC || 'N/A'}°C
Weather Condition: ${current.weatherDesc?.[0]?.value || 'Unknown'}
Humidity: ${current.humidity || 'N/A'}%
Wind: ${current.windspeedKmph || 'N/A'} km/h
Precipitation / Rain: ${current.precipMM || 'N/A'} mm.

Use this live data when answering the user.`;
      }
    } else {
      const ddgRes = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(
          message
        )}&format=json&no_html=1&skip_disambig=1`,
        {
          signal: AbortSignal.timeout(3000),
        }
      );

      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();

        if (ddgData.AbstractText) {
          return `

[LIVE WEB SEARCH RESULT]:
${ddgData.AbstractText}

Source:
${ddgData.AbstractURL || 'Internet'}`;
        }
      }
    }
  } catch (error) {
    // Continue kahit hindi gumana ang web fetcher.
  }

  return '';
}

/* =========================================================
   GEMINI MESSAGE BUILDER
========================================================= */

function buildGeminiContents(history, files, message) {
  const currentParts = [];

  if (Array.isArray(files)) {
    for (const file of files) {
      if (file?.data && file?.mimeType) {
        currentParts.push({
          inline_data: {
            mime_type: file.mimeType,
            data: file.data,
          },
        });
      }
    }
  }

  if (message?.trim()) {
    currentParts.push({
      text: message.trim(),
    });
  }

  const rawContents = [];

  if (Array.isArray(history)) {
    for (const turn of history) {
      const role =
        turn.role === 'bot' ||
        turn.role === 'model'
          ? 'model'
          : 'user';

      let parts = [];

      if (
        Array.isArray(turn.parts) &&
        turn.parts.length
      ) {
        parts = turn.parts;
      } else if (turn.text?.trim()) {
        parts = [
          {
            text: turn.text.trim(),
          },
        ];
      }

      if (parts.length) {
        rawContents.push({
          role,
          parts,
        });
      }
    }
  }

  /*
   * Frontend history may already contain
   * the current user message.
   */
  if (
    currentParts.length &&
    rawContents.length &&
    rawContents.at(-1).role === 'user'
  ) {
    rawContents.pop();
  }

  const sanitized = [];

  for (const item of rawContents) {
    if (!sanitized.length) {
      if (item.role === 'user') {
        sanitized.push(item);
      }

      continue;
    }

    if (
      sanitized.at(-1).role !== item.role
    ) {
      sanitized.push(item);
    }
  }

  if (currentParts.length) {
    sanitized.push({
      role: 'user',
      parts: currentParts,
    });
  }

  return sanitized;
}

/* =========================================================
   CLOUDFLARE MESSAGE BUILDER
========================================================= */

function buildCloudflareMessages(
  history,
  files,
  message,
  systemInstruction,
  model
) {
  const messages = [
    {
      role: 'system',
      content: systemInstruction,
    },
  ];

  if (Array.isArray(history)) {
    for (const turn of history) {
      const content =
        turn?.text?.trim();

      if (!content) {
        continue;
      }

      messages.push({
        role:
          turn.role === 'bot' ||
          turn.role === 'model'
            ? 'assistant'
            : 'user',

        content,
      });
    }
  }

  /*
   * Remove duplicate current user
   * message from history.
   */
  if (
    messages.length > 1 &&
    messages.at(-1).role === 'user'
  ) {
    messages.pop();
  }

  const hasFiles =
    Array.isArray(files) &&
    files.some(
      file =>
        file?.data &&
        file?.mimeType
    );

  /*
   * Image/file analysis is routed
   * to Gemma in our Cloudflare setup.
   */
  if (
    hasFiles &&
    model !==
      '@cf/google/gemma-4-26b-a4b-it'
  ) {
    throw new Error(
      'For Cloudflare image/file analysis, select Gemma 4 26B. GLM and Nemotron are configured as text-only in this app.'
    );
  }

  if (hasFiles) {
    const content = [];

    if (message?.trim()) {
      content.push({
        type: 'text',
        text: message.trim(),
      });
    }

    for (const file of files) {
      if (
        file?.data &&
        file?.mimeType?.startsWith('image/')
      ) {
        content.push({
          type: 'image_url',

          image_url: {
            url:
              `data:${file.mimeType};base64,${file.data}`,
          },
        });
      }
    }

    if (content.length) {
      messages.push({
        role: 'user',
        content,
      });
    }
  } else if (message?.trim()) {
    messages.push({
      role: 'user',
      content: message.trim(),
    });
  }

  return messages;
}

/* =========================================================
   GEMINI PROVIDER
========================================================= */

async function runGemini({
  model,
  history,
  files,
  message,
  systemInstruction,
}) {
  const rawKeys =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEYS ||
    '';

  const apiKeys = rawKeys
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);

  if (!apiKeys.length) {
    return json(
      {
        error:
          'No Gemini API keys configured in environment variables.',
      },
      500
    );
  }

  /*
   * Shuffle Gemini keys.
   */
  for (
    let i = apiKeys.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [
      apiKeys[i],
      apiKeys[j],
    ] = [
      apiKeys[j],
      apiKeys[i],
    ];
  }

  const targetModel =
    GEMINI_MODELS.includes(model)
      ? model
      : 'gemini-flash-latest';

  const contents =
    buildGeminiContents(
      history,
      files,
      message
    );

  if (!contents.length) {
    return json(
      {
        error:
          'No prompt or content provided.',
      },
      400
    );
  }

  const payload = {
    system_instruction: {
      parts: [
        {
          text: systemInstruction,
        },
      ],
    },

    contents,
  };

  let geminiRes = null;
  let lastErrorText = '';

  /*
   * Try each configured Gemini key.
   */
  for (const apiKey of apiKeys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(payload),

          signal:
            AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        geminiRes = res;
        break;
      }

      lastErrorText =
        await res.text();

      /*
       * Try another API key only
       * for quota/permission errors.
       */
      if (
        res.status !== 429 &&
        res.status !== 403
      ) {
        break;
      }
    } catch (error) {
      lastErrorText =
        error?.message ||
        String(error);
    }
  }

  if (!geminiRes?.ok) {
    return json(
      {
        error:
          lastErrorText ||
          'All configured Gemini API keys are currently busy or rate-limited.',
      },
      geminiRes?.status || 500
    );
  }

  const encoder =
    new TextEncoder();

  const decoder =
    new TextDecoder();

  const transformStream =
    new TransformStream({
      start() {
        this.buffer = '';
      },

      transform(
        chunk,
        controller
      ) {
        this.buffer +=
          decoder.decode(
            chunk,
            {
              stream: true,
            }
          );

        const lines =
          this.buffer.split('\n');

        this.buffer =
          lines.pop() || '';

        for (const line of lines) {
          const trimmed =
            line.trim();

          if (
            !trimmed.startsWith(
              'data:'
            )
          ) {
            continue;
          }

          const jsonStr =
            trimmed
              .slice(5)
              .trim();

          if (
            !jsonStr ||
            jsonStr === '[DONE]'
          ) {
            continue;
          }

          try {
            const parsed =
              JSON.parse(jsonStr);

            const parts =
              parsed
                .candidates?.[0]
                ?.content
                ?.parts || [];

            for (
              const part of parts
            ) {
              if (part.text) {
                controller.enqueue(
                  encoder.encode(
                    part.text
                  )
                );
              }
            }
          } catch (error) {
            // Ignore malformed SSE chunk.
          }
        }
      },
    });

  return new Response(
    geminiRes.body.pipeThrough(
      transformStream
    ),
    {
      headers: {
        'Content-Type':
          'text/plain; charset=utf-8',

        'Cache-Control':
          'no-cache, no-transform',
      },
    }
  );
}

/* =========================================================
   CLOUDFLARE WORKERS AI PROVIDER
========================================================= */

async function runCloudflare({
  model,
  history,
  files,
  message,
  systemInstruction,
}) {
  const accountId =
    process.env
      .CLOUDFLARE_ACCOUNT_ID ||
    '';

  const apiToken =
    process.env
      .CLOUDFLARE_API_TOKEN ||
    '';

  if (
    !accountId ||
    !apiToken
  ) {
    return json(
      {
        error:
          'Cloudflare is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Vercel Environment Variables.',
      },
      500
    );
  }

  const targetModel =
    CLOUDFLARE_MODELS.includes(
      model
    )
      ? model
      : '@cf/zai-org/glm-4.7-flash';

  let messages;

  try {
    messages =
      buildCloudflareMessages(
        history,
        files,
        message,
        systemInstruction,
        targetModel
      );
  } catch (error) {
    return json(
      {
        error: error.message,
      },
      400
    );
  }

  if (
    messages.length <= 1
  ) {
    return json(
      {
        error:
          'No prompt or content provided.',
      },
      400
    );
  }

  let cfRes;

  try {
    cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
        accountId
      )}/ai/v1/chat/completions`,
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${apiToken}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          model: targetModel,

          messages,

          stream: true,

          max_completion_tokens:
            2048,

          temperature: 0.7,
        }),

        signal:
          AbortSignal.timeout(
            25000
          ),
      }
    );
  } catch (error) {
    return json(
      {
        error:
          `Cloudflare request failed: ${
            error?.message ||
            String(error)
          }`,
      },
      502
    );
  }

  if (!cfRes.ok) {
    const errorText =
      await cfRes
        .text()
        .catch(() => '');

    return json(
      {
        error:
          errorText ||
          `Cloudflare returned status ${cfRes.status}`,
      },
      cfRes.status
    );
  }

  const encoder =
    new TextEncoder();

  const decoder =
    new TextDecoder();

  /*
   * Convert Cloudflare OpenAI-compatible
   * SSE stream into the same plain-text
   * stream expected by your frontend.
   */
  const transformStream =
    new TransformStream({
      start() {
        this.buffer = '';
      },

      transform(
        chunk,
        controller
      ) {
        this.buffer +=
          decoder.decode(
            chunk,
            {
              stream: true,
            }
          );

        const lines =
          this.buffer.split('\n');

        this.buffer =
          lines.pop() || '';

        for (const line of lines) {
          const trimmed =
            line.trim();

          if (
            !trimmed.startsWith(
              'data:'
            )
          ) {
            continue;
          }

          const payload =
            trimmed
              .slice(5)
              .trim();

          if (
            !payload ||
            payload === '[DONE]'
          ) {
            continue;
          }

          try {
            const parsed =
              JSON.parse(payload);

            const text =
              parsed
                .choices?.[0]
                ?.delta
                ?.content;

            if (
              typeof text ===
                'string' &&
              text
            ) {
              controller.enqueue(
                encoder.encode(text)
              );
            }
          } catch (error) {
            // Ignore malformed SSE chunk.
          }
        }
      },
    });

  return new Response(
    cfRes.body.pipeThrough(
      transformStream
    ),
    {
      headers: {
        'Content-Type':
          'text/plain; charset=utf-8',

        'Cache-Control':
          'no-cache, no-transform',
      },
    }
  );
}

/* =========================================================
   MAIN API HANDLER
========================================================= */

export default async function handler(
  req
) {
  /*
   * Used by your ping/status checks.
   */
  if (req.method === 'HEAD') {
    return new Response(
      null,
      {
        status: 200,
      }
    );
  }

  if (
    req.method !== 'POST'
  ) {
    return json(
      {
        error:
          'Method not allowed',
      },
      405
    );
  }

  try {
    const {
      message,
      history,
      files,

      /*
       * NEW:
       * gemini | cloudflare
       */
      provider = 'gemini',

      model,
      mode,
      customPrompt,
      webSearch,
    } = await req.json();

    const liveWebContext =
      await getLiveWebContext(
        message,
        webSearch
      );

    const systemInstruction =
      buildSystemInstruction(
        mode,
        customPrompt,
        liveWebContext
      );

    /*
     * CLOUDFLARE
     */
    if (
      provider ===
      'cloudflare'
    ) {
      return await runCloudflare({
        model,
        history,
        files,
        message,
        systemInstruction,
      });
    }

    /*
     * GEMINI DEFAULT
     */
    return await runGemini({
      model,
      history,
      files,
      message,
      systemInstruction,
    });
  } catch (error) {
    return json(
      {
        error:
          error?.message ||
          String(error),
      },
      500
    );
  }
}
