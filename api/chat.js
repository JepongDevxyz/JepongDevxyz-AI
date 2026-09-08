export const config = {
  runtime: 'edge',
};

/* =========================================================
   JEPONGDEVXYZ AI
   MULTI-PROVIDER + MULTI-KEY ROTATION + AUTO FALLBACK
========================================================= */

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    models: [
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite'
    ],
    defaultModel: 'gemini-flash-latest'
  },

  cloudflare: {
    label: 'Cloudflare',
    models: [
      '@cf/zai-org/glm-4.7-flash',
      '@cf/google/gemma-4-26b-a4b-it',
      '@cf/nvidia/nemotron-3-120b-a12b'
    ],
    defaultModel: '@cf/zai-org/glm-4.7-flash'
  },

  groq: {
    label: 'Groq',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'groq/compound-mini'
    ],
    defaultModel: 'openai/gpt-oss-20b'
  },

  openrouter: {
    label: 'OpenRouter',
    models: [
      'openrouter/auto',
      'openai/gpt-oss-120b',
      'deepseek/deepseek-v3.2',
      'google/gemini-3.1-pro-preview'
    ],
    defaultModel: 'openrouter/auto'
  },

  mistral: {
    label: 'Mistral',
    models: [
      'mistral-small-latest',
      'mistral-large-latest',
      'codestral-latest',
      'ministral-8b-latest'
    ],
    defaultModel: 'mistral-small-latest'
  },

  cohere: {
    label: 'Cohere',
    models: [
      'command-a-plus-05-2026',
      'command-a-03-2025',
      'command-a-reasoning-08-2025',
      'command-r7b-12-2024'
    ],
    defaultModel: 'command-a-03-2025'
  }
};


/* =========================================================
   PROVIDER FALLBACK ORDER
========================================================= */

const FALLBACK_ORDER = [
  'cloudflare',
  'groq',
  'mistral',
  'cohere',
  'openrouter',
  'gemini'
];


/* =========================================================
   HELPERS
========================================================= */

function json(
  data,
  status = 200,
  extraHeaders = {}
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',

        ...extraHeaders
      }
    }
  );
}


/* =========================================================
   KEY PARSER
========================================================= */

function parseKeys(
  pluralName,
  singleName
) {
  const raw =
    process.env[pluralName] ||
    process.env[singleName] ||
    '';

  return raw
    .split(/[\n,]+/)
    .map(key => key.trim())
    .filter(Boolean);
}


/* =========================================================
   SHUFFLE
========================================================= */

function shuffleArray(input) {
  const arr = [...input];

  for (
    let i = arr.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [
      arr[i],
      arr[j]
    ] = [
      arr[j],
      arr[i]
    ];
  }

  return arr;
}


/* =========================================================
   PROVIDER KEYS
========================================================= */

function getProviderKeys(provider) {

  switch (provider) {

    case 'gemini':
      return parseKeys(
        'GEMINI_API_KEYS',
        'GEMINI_API_KEY'
      );

    case 'groq':
      return parseKeys(
        'GROQ_API_KEYS',
        'GROQ_API_KEY'
      );

    case 'openrouter':
      return parseKeys(
        'OPENROUTER_API_KEYS',
        'OPENROUTER_API_KEY'
      );

    case 'mistral':
      return parseKeys(
        'MISTRAL_API_KEYS',
        'MISTRAL_API_KEY'
      );

    case 'cohere':
      return parseKeys(
        'COHERE_API_KEYS',
        'COHERE_API_KEY'
      );

    default:
      return [];
  }
}


/* =========================================================
   CLOUDFLARE ACCOUNT + TOKEN PAIRS

   Preferred:

   CLOUDFLARE_ACCOUNTS=
   accountId1:token1,accountId2:token2

   Old single-account variables still work.
========================================================= */

function getCloudflareAccounts() {

  const raw =
    process.env.CLOUDFLARE_ACCOUNTS ||
    '';

  const accounts = [];


  if (raw.trim()) {

    const entries =
      raw
        .split(/[\n,]+/)
        .map(x => x.trim())
        .filter(Boolean);


    for (const entry of entries) {

      /*
       * Cloudflare tokens normally
       * do not contain ":",
       * so first ":" separates ID/token.
       */

      const separator =
        entry.indexOf(':');

      if (separator === -1) {
        continue;
      }


      const accountId =
        entry
          .slice(
            0,
            separator
          )
          .trim();

      const apiToken =
        entry
          .slice(
            separator + 1
          )
          .trim();


      if (
        accountId &&
        apiToken
      ) {
        accounts.push({
          accountId,
          apiToken
        });
      }
    }
  }


  /*
   * Backward-compatible
   * single Cloudflare account.
   */

  const oldAccountId =
    process.env
      .CLOUDFLARE_ACCOUNT_ID;

  const oldToken =
    process.env
      .CLOUDFLARE_API_TOKEN;


  if (
    oldAccountId &&
    oldToken
  ) {

    const alreadyAdded =
      accounts.some(
        item =>
          item.accountId ===
            oldAccountId &&
          item.apiToken ===
            oldToken
      );


    if (!alreadyAdded) {

      accounts.push({
        accountId:
          oldAccountId.trim(),

        apiToken:
          oldToken.trim()
      });
    }
  }


  return accounts;
}


/* =========================================================
   CONFIGURED?
========================================================= */

function configured(provider) {

  if (provider === 'cloudflare') {

    return (
      getCloudflareAccounts()
        .length > 0
    );
  }


  if (
    [
      'gemini',
      'groq',
      'openrouter',
      'mistral',
      'cohere'
    ].includes(provider)
  ) {

    return (
      getProviderKeys(provider)
        .length > 0
    );
  }


  return false;
}


/* =========================================================
   RETRYABLE ERROR
========================================================= */

function isRetryableStatus(status) {

  return [
    401,
    403,
    408,
    409,
    425,
    429,
    500,
    502,
    503,
    504
  ].includes(status);
}


/* =========================================================
   SYSTEM PROMPT
========================================================= */

function buildSystemInstruction(
  mode,
  customPrompt,
  liveWebContext,
  studyTool
) {

  let text =
    'You are JepongDevxyz AI. ' +
    'Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). ' +
    'Be accurate and helpful. ' +
    'Always place programming code inside fenced Markdown code blocks.';


  if (liveWebContext) {
    text += liveWebContext;
  }


  if (mode === 'school') {

    text +=
      ' Act as an academic assistant for students. ' +
      'Explain concepts clearly and step-by-step.';

  } else if (mode === 'coder') {

    text +=
      ' Act as a senior software engineer. ' +
      'Diagnose bugs, explain tradeoffs, and provide clean production-minded code.';

  } else if (mode === 'tagalog') {

    text +=
      ' Reply naturally in Filipino/Tagalog unless technical English terms are clearer.';

  } else if (mode === 'affiliate') {

    text +=
      ' Act as a digital marketing writing assistant for safe and age-appropriate products.';

  } else if (
    mode === 'custom' &&
    customPrompt
  ) {

    text += ` ${customPrompt}`;
  }


  /* STUDY TOOLS */

  if (studyTool === 'quiz') {

    text +=
      ' STUDY TOOL: Create a short quiz from the topic. Ask questions first and do not immediately reveal all answers.';

  } else if (
    studyTool === 'reviewer'
  ) {

    text +=
      ' STUDY TOOL: Create a structured reviewer with headings, key ideas, definitions, examples, and recap.';

  } else if (
    studyTool === 'flashcards'
  ) {

    text +=
      ' STUDY TOOL: Produce concise flashcards using Q: and A: format.';

  } else if (
    studyTool === 'explain'
  ) {

    text +=
      ' STUDY TOOL: Explain simply with short steps, an analogy, and one concrete example.';
  }


  return text;
}


/* =========================================================
   WEB / WEATHER
========================================================= */

async function getLiveWebContext(
  message,
  webSearch
) {

  if (
    !webSearch ||
    !message
  ) {
    return '';
  }


  try {

    const weather =
      /(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i
        .test(message);


    if (weather) {

      const match =
        message.match(
          /(?:sa|in|for|at)\s+([a-zA-Z\s,.-]+)/i
        );


      const location =
        match
          ? match[1].trim()
          : 'Guimba';


      const response =
        await fetch(
          `https://wttr.in/${encodeURIComponent(
            location
          )}?format=j1`,
          {
            headers: {
              'User-Agent':
                'JepongDevxyz-AI/1.0'
            },

            signal:
              AbortSignal.timeout(
                3500
              )
          }
        );


      if (response.ok) {

        const data =
          await response.json();

        const current =
          data
            .current_condition?.[0] ||
          {};

        const nearest =
          data
            .nearest_area?.[0] ||
          {};


        return `

[REAL-TIME WEATHER]
Location: ${nearest.areaName?.[0]?.value || location}
Temperature: ${current.temp_C || 'N/A'}°C
Feels like: ${current.FeelsLikeC || 'N/A'}°C
Condition: ${current.weatherDesc?.[0]?.value || 'Unknown'}
Humidity: ${current.humidity || 'N/A'}%
Wind: ${current.windspeedKmph || 'N/A'} km/h
Rain: ${current.precipMM || 'N/A'} mm.
`;
      }

    } else {

      const response =
        await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(
            message
          )}&format=json&no_html=1&skip_disambig=1`,
          {
            signal:
              AbortSignal.timeout(
                3000
              )
          }
        );


      if (response.ok) {

        const data =
          await response.json();


        if (data.AbstractText) {

          return `

[LIVE WEB RESULT]
${data.AbstractText}

Source:
${data.AbstractURL || 'Internet'}
`;
        }
      }
    }

  } catch (_) {
    /* Continue without web */
  }


  return '';
}


/* =========================================================
   NORMALIZE HISTORY
========================================================= */

function normalizeHistory(
  history = []
) {

  return history
    .filter(
      item =>
        item &&
        item.text
    )
    .map(item => ({

      role:
        item.role === 'bot' ||
        item.role === 'model'
          ? 'assistant'
          : 'user',

      content:
        item.text
    }));
}


/* =========================================================
   OPENAI STYLE MESSAGES
========================================================= */

function buildOpenAIMessages(
  history,
  message,
  systemInstruction
) {

  const messages = [
    {
      role:
        'system',

      content:
        systemInstruction
    },

    ...normalizeHistory(history)
  ];


  /*
   * Frontend history may already
   * contain current user prompt.
   */

  if (
    messages.length > 1 &&
    messages.at(-1)
      .role === 'user'
  ) {

    messages.pop();
  }


  if (message?.trim()) {

    messages.push({
      role:
        'user',

      content:
        message.trim()
    });
  }


  return messages;
}


/* =========================================================
   SMART ROUTER
========================================================= */

function smartRoute(
  mode,
  files,
  message
) {

  const hasImage =
    Array.isArray(files) &&
    files.some(
      file =>
        file?.mimeType
          ?.startsWith('image/') &&
        file?.data
    );


  if (hasImage) {

    if (configured('cloudflare')) {

      return {
        provider:
          'cloudflare',

        model:
          '@cf/google/gemma-4-26b-a4b-it',

        reason:
          'vision'
      };
    }


    if (configured('gemini')) {

      return {
        provider:
          'gemini',

        model:
          'gemini-flash-latest',

        reason:
          'vision'
      };
    }
  }


  const coding =
    mode === 'coder' ||
    /\b(code|coding|debug|javascript|html|css|python|node|api|bug|error|typescript|php|java|react|sql)\b/i
      .test(
        message ||
        ''
      );


  if (coding) {

    if (configured('groq')) {

      return {
        provider:
          'groq',

        model:
          'openai/gpt-oss-120b',

        reason:
          'coding'
      };
    }


    if (configured('mistral')) {

      return {
        provider:
          'mistral',

        model:
          'codestral-latest',

        reason:
          'coding'
      };
    }
  }


  if (
    mode === 'school'
  ) {

    if (configured('gemini')) {

      return {
        provider:
          'gemini',

        model:
          'gemini-flash-latest',

        reason:
          'school'
      };
    }


    if (configured('cohere')) {

      return {
        provider:
          'cohere',

        model:
          'command-a-03-2025',

        reason:
          'school'
      };
    }
  }


  return null;
}


/* =========================================================
   RESPONSE HEADERS
========================================================= */

function passthroughHeaders(
  upstream,
  provider,
  model,
  fallbackFrom = '',
  routedReason = '',
  keyIndex = 0,
  keyCount = 1
) {

  const headers = {

    'Content-Type':
      'text/plain; charset=utf-8',

    'Cache-Control':
      'no-cache, no-transform',

    'X-AI-Provider':
      provider,

    'X-AI-Model':
      model,

    'X-AI-Fallback-From':
      fallbackFrom,

    'X-AI-Route-Reason':
      routedReason,

    /*
     * Safe metadata only.
     * Never sends actual API key.
     */

    'X-AI-Key-Index':
      String(keyIndex + 1),

    'X-AI-Key-Count':
      String(keyCount),

    'Access-Control-Expose-Headers':
      [
        'X-AI-Provider',
        'X-AI-Model',
        'X-AI-Fallback-From',
        'X-AI-Route-Reason',
        'X-AI-Key-Index',
        'X-AI-Key-Count',
        'X-RateLimit-Limit-Requests',
        'X-RateLimit-Remaining-Requests',
        'X-RateLimit-Reset-Requests',
        'X-RateLimit-Limit-Tokens',
        'X-RateLimit-Remaining-Tokens',
        'X-RateLimit-Reset-Tokens',
        'Retry-After'
      ].join(', ')
  };


  const rateHeaders = [
    'x-ratelimit-limit-requests',
    'x-ratelimit-remaining-requests',
    'x-ratelimit-reset-requests',
    'x-ratelimit-limit-tokens',
    'x-ratelimit-remaining-tokens',
    'x-ratelimit-reset-tokens',
    'retry-after'
  ];


  for (
    const name of rateHeaders
  ) {

    const value =
      upstream?.headers
        ?.get(name);


    if (value) {

      headers[name] =
        value;
    }
  }


  return headers;
}


/* =========================================================
   OPENAI SSE → PLAIN TEXT
========================================================= */

function openAIStreamToText(body) {

  const decoder =
    new TextDecoder();

  const encoder =
    new TextEncoder();


  return body.pipeThrough(
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
              stream: true
            }
          );


        const lines =
          this.buffer
            .split('\n');


        this.buffer =
          lines.pop() ||
          '';


        for (
          const line of lines
        ) {

          const trimmed =
            line.trim();


          if (
            !trimmed.startsWith(
              'data:'
            )
          ) {
            continue;
          }


          const raw =
            trimmed
              .slice(5)
              .trim();


          if (
            !raw ||
            raw === '[DONE]'
          ) {
            continue;
          }


          try {

            const parsed =
              JSON.parse(raw);


            const text =
              parsed
                .choices?.[0]
                ?.delta
                ?.content ??

              parsed
                .choices?.[0]
                ?.message
                ?.content;


            if (
              typeof text ===
                'string' &&
              text
            ) {

              controller.enqueue(
                encoder.encode(
                  text
                )
              );
            }

          } catch (_) {}
        }
      }
    })
  );
}


/* =========================================================
   COHERE SSE → PLAIN TEXT
========================================================= */

function cohereStreamToText(body) {

  const decoder =
    new TextDecoder();

  const encoder =
    new TextEncoder();


  return body.pipeThrough(
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
              stream: true
            }
          );


        const lines =
          this.buffer
            .split('\n');


        this.buffer =
          lines.pop() ||
          '';


        for (
          const line of lines
        ) {

          const trimmed =
            line.trim();


          if (
            !trimmed.startsWith(
              'data:'
            )
          ) {
            continue;
          }


          try {

            const parsed =
              JSON.parse(
                trimmed
                  .slice(5)
                  .trim()
              );


            const text =
              parsed
                ?.delta
                ?.message
                ?.content
                ?.text;


            if (
              parsed?.type ===
                'content-delta' &&
              text
            ) {

              controller.enqueue(
                encoder.encode(
                  text
                )
              );
            }

          } catch (_) {}
        }
      }
    })
  );
}


/* =========================================================
   GEMINI
   MULTI-KEY ROTATION
========================================================= */

async function runGemini({
  model,
  history,
  files,
  message,
  systemInstruction,
  fallbackFrom = '',
  routedReason = ''
}) {

  const keys =
    shuffleArray(
      getProviderKeys(
        'gemini'
      )
    );


  if (!keys.length) {

    return {
      ok: false,
      status: 500,
      error:
        'Gemini API key is not configured.'
    };
  }


  const target =
    PROVIDERS
      .gemini
      .models
      .includes(model)

      ? model

      : PROVIDERS
          .gemini
          .defaultModel;


  const currentParts = [];


  if (
    Array.isArray(files)
  ) {

    for (
      const file of files
    ) {

      if (
        file?.data &&
        file?.mimeType
      ) {

        currentParts.push({
          inline_data: {
            mime_type:
              file.mimeType,

            data:
              file.data
          }
        });
      }
    }
  }


  if (message?.trim()) {

    currentParts.push({
      text:
        message.trim()
    });
  }


  const contents = [];


  for (
    const item of history ||
    []
  ) {

    const role =
      item.role === 'bot' ||
      item.role === 'model'

        ? 'model'

        : 'user';


    if (item.text?.trim()) {

      contents.push({
        role,

        parts: [
          {
            text:
              item.text.trim()
          }
        ]
      });
    }
  }


  if (
    currentParts.length &&
    contents.at(-1)
      ?.role === 'user'
  ) {

    contents.pop();
  }


  if (currentParts.length) {

    contents.push({
      role:
        'user',

      parts:
        currentParts
    });
  }


  if (!contents.length) {

    return {
      ok: false,
      status: 400,
      error:
        'No prompt provided.'
    };
  }


  let lastError =
    '';

  let lastStatus =
    500;


  for (
    let i = 0;
    i < keys.length;
    i++
  ) {

    const apiKey =
      keys[i];


    try {

      const response =
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            target
          )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
            apiKey
          )}`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                system_instruction: {
                  parts: [
                    {
                      text:
                        systemInstruction
                    }
                  ]
                },

                contents
              }),

            signal:
              AbortSignal.timeout(
                25000
              )
          }
        );


      if (response.ok) {

        const decoder =
          new TextDecoder();

        const encoder =
          new TextEncoder();


        const stream =
          response.body.pipeThrough(
            new TransformStream({

              start() {
                this.buffer =
                  '';
              },


              transform(
                chunk,
                controller
              ) {

                this.buffer +=
                  decoder.decode(
                    chunk,
                    {
                      stream:
                        true
                    }
                  );


                const lines =
                  this.buffer
                    .split('\n');


                this.buffer =
                  lines.pop() ||
                  '';


                for (
                  const line of lines
                ) {

                  const trimmed =
                    line.trim();


                  if (
                    !trimmed
                      .startsWith(
                        'data:'
                      )
                  ) {
                    continue;
                  }


                  try {

                    const parsed =
                      JSON.parse(
                        trimmed
                          .slice(5)
                          .trim()
                      );


                    const parts =
                      parsed
                        .candidates?.[0]
                        ?.content
                        ?.parts ||
                      [];


                    for (
                      const part of parts
                    ) {

                      if (
                        part.text
                      ) {

                        controller.enqueue(
                          encoder.encode(
                            part.text
                          )
                        );
                      }
                    }

                  } catch (_) {}
                }
              }
            })
          );


        return {
          ok: true,

          response:
            new Response(
              stream,
              {
                headers:
                  passthroughHeaders(
                    response,
                    'gemini',
                    target,
                    fallbackFrom,
                    routedReason,
                    i,
                    keys.length
                  )
              }
            )
        };
      }


      lastStatus =
        response.status;

      lastError =
        await response
          .text()
          .catch(
            () =>
              `Gemini ${response.status}`
          );


      if (
        !isRetryableStatus(
          response.status
        )
      ) {
        break;
      }


      /*
       * Retry using next key.
       */

    } catch (error) {

      lastStatus =
        502;

      lastError =
        error?.message ||
        String(error);
    }
  }


  return {
    ok: false,

    status:
      lastStatus,

    error:
      lastError ||
      'All Gemini keys are unavailable.'
  };
}


/* =========================================================
   CLOUDFLARE
   MULTI-ACCOUNT ROTATION
========================================================= */

async function runCloudflare({
  model,
  history,
  files,
  message,
  systemInstruction,
  fallbackFrom = '',
  routedReason = ''
}) {

  const accounts =
    shuffleArray(
      getCloudflareAccounts()
    );


  if (!accounts.length) {

    return {
      ok: false,
      status: 500,
      error:
        'Cloudflare credentials are not configured.'
    };
  }


  let target =
    PROVIDERS
      .cloudflare
      .models
      .includes(model)

      ? model

      : PROVIDERS
          .cloudflare
          .defaultModel;


  const hasImage =
    Array.isArray(files) &&
    files.some(
      file =>
        file?.data &&
        file?.mimeType
          ?.startsWith(
            'image/'
          )
    );


  if (hasImage) {

    target =
      '@cf/google/gemma-4-26b-a4b-it';
  }


  const messages =
    buildOpenAIMessages(
      history,
      message,
      systemInstruction
    );


  if (hasImage) {

    const last =
      messages.pop();


    const content = [
      {
        type:
          'text',

        text:
          last?.content ||
          message ||
          'Analyze this image.'
      }
    ];


    for (
      const file of files
    ) {

      if (
        file?.data &&
        file?.mimeType
          ?.startsWith(
            'image/'
          )
      ) {

        content.push({
          type:
            'image_url',

          image_url: {
            url:
              `data:${file.mimeType};base64,${file.data}`
          }
        });
      }
    }


    messages.push({
      role:
        'user',

      content
    });
  }


  let lastStatus =
    500;

  let lastError =
    '';


  for (
    let i = 0;
    i < accounts.length;
    i++
  ) {

    const account =
      accounts[i];


    try {

      const response =
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
            account.accountId
          )}/ai/v1/chat/completions`,
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Bearer ${account.apiToken}`,

              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                model:
                  target,

                messages,

                stream:
                  true,

                max_completion_tokens:
                  2048,

                temperature:
                  0.7
              }),

            signal:
              AbortSignal.timeout(
                30000
              )
          }
        );


      if (response.ok) {

        return {
          ok: true,

          response:
            new Response(
              openAIStreamToText(
                response.body
              ),
              {
                headers:
                  passthroughHeaders(
                    response,
                    'cloudflare',
                    target,
                    fallbackFrom,
                    routedReason,
                    i,
                    accounts.length
                  )
              }
            )
        };
      }


      lastStatus =
        response.status;

      lastError =
        await response
          .text()
          .catch(
            () =>
              `Cloudflare ${response.status}`
          );


      if (
        !isRetryableStatus(
          response.status
        )
      ) {
        break;
      }

    } catch (error) {

      lastStatus =
        502;

      lastError =
        error?.message ||
        String(error);
    }
  }


  return {
    ok: false,

    status:
      lastStatus,

    error:
      lastError ||
      'All Cloudflare accounts are unavailable.'
  };
}


/* =========================================================
   OPENAI-COMPATIBLE PROVIDERS

   GROQ
   OPENROUTER
   MISTRAL
========================================================= */

async function runOpenAICompatible(
  provider,
  {
    model,
    history,
    message,
    systemInstruction,
    fallbackFrom = '',
    routedReason = ''
  }
) {

  const config = {

    groq: {
      url:
        'https://api.groq.com/openai/v1/chat/completions'
    },

    openrouter: {
      url:
        'https://openrouter.ai/api/v1/chat/completions'
    },

    mistral: {
      url:
        'https://api.mistral.ai/v1/chat/completions'
    }

  }[provider];


  if (!config) {

    return {
      ok: false,
      status: 400,
      error:
        'Unsupported provider.'
    };
  }


  const keys =
    shuffleArray(
      getProviderKeys(
        provider
      )
    );


  if (!keys.length) {

    return {
      ok: false,
      status: 500,
      error:
        `${PROVIDERS[provider].label} API key is not configured.`
    };
  }


  const target =
    PROVIDERS[
      provider
    ].models.includes(
      model
    )

      ? model

      : PROVIDERS[
          provider
        ].defaultModel;


  const messages =
    buildOpenAIMessages(
      history,
      message,
      systemInstruction
    );


  let lastStatus =
    500;

  let lastError =
    '';


  for (
    let i = 0;
    i < keys.length;
    i++
  ) {

    const apiKey =
      keys[i];


    const headers = {

      Authorization:
        `Bearer ${apiKey}`,

      'Content-Type':
        'application/json'
    };


    if (
      provider ===
      'openrouter'
    ) {

      headers[
        'HTTP-Referer'
      ] =
        process.env.SITE_URL ||
        'https://jepongdevxyz.ai';


      headers[
        'X-Title'
      ] =
        'JepongDevxyz AI';
    }


    try {

      const response =
        await fetch(
          config.url,
          {
            method:
              'POST',

            headers,

            body:
              JSON.stringify({

                model:
                  target,

                messages,

                stream:
                  true,

                max_tokens:
                  2048,

                temperature:
                  0.7
              }),

            signal:
              AbortSignal.timeout(
                30000
              )
          }
        );


      if (response.ok) {

        return {
          ok: true,

          response:
            new Response(
              openAIStreamToText(
                response.body
              ),
              {
                headers:
                  passthroughHeaders(
                    response,
                    provider,
                    target,
                    fallbackFrom,
                    routedReason,
                    i,
                    keys.length
                  )
              }
            )
        };
      }


      lastStatus =
        response.status;

      lastError =
        await response
          .text()
          .catch(
            () =>
              `${provider} ${response.status}`
          );


      if (
        !isRetryableStatus(
          response.status
        )
      ) {
        break;
      }


      /*
       * Automatically use next key.
       */

    } catch (error) {

      lastStatus =
        502;

      lastError =
        error?.message ||
        String(error);
    }
  }


  return {
    ok: false,

    status:
      lastStatus,

    error:
      lastError ||
      `All ${PROVIDERS[provider].label} keys are unavailable.`
  };
}


/* =========================================================
   COHERE MULTI-KEY
========================================================= */

async function runCohere({
  model,
  history,
  message,
  systemInstruction,
  fallbackFrom = '',
  routedReason = ''
}) {

  const keys =
    shuffleArray(
      getProviderKeys(
        'cohere'
      )
    );


  if (!keys.length) {

    return {
      ok: false,
      status: 500,
      error:
        'Cohere API key is not configured.'
    };
  }


  const target =
    PROVIDERS
      .cohere
      .models
      .includes(model)

      ? model

      : PROVIDERS
          .cohere
          .defaultModel;


  const messages =
    buildOpenAIMessages(
      history,
      message,
      systemInstruction
    );


  let lastStatus =
    500;

  let lastError =
    '';


  for (
    let i = 0;
    i < keys.length;
    i++
  ) {

    const apiKey =
      keys[i];


    try {

      const response =
        await fetch(
          'https://api.cohere.com/v2/chat',
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              'Content-Type':
                'application/json',

              Accept:
                'text/event-stream'
            },

            body:
              JSON.stringify({

                model:
                  target,

                messages,

                stream:
                  true,

                max_tokens:
                  2048,

                temperature:
                  0.7
              }),

            signal:
              AbortSignal.timeout(
                30000
              )
          }
        );


      if (response.ok) {

        return {
          ok: true,

          response:
            new Response(
              cohereStreamToText(
                response.body
              ),
              {
                headers:
                  passthroughHeaders(
                    response,
                    'cohere',
                    target,
                    fallbackFrom,
                    routedReason,
                    i,
                    keys.length
                  )
              }
            )
        };
      }


      lastStatus =
        response.status;

      lastError =
        await response
          .text()
          .catch(
            () =>
              `Cohere ${response.status}`
          );


      if (
        !isRetryableStatus(
          response.status
        )
      ) {
        break;
      }

    } catch (error) {

      lastStatus =
        502;

      lastError =
        error?.message ||
        String(error);
    }
  }


  return {
    ok: false,

    status:
      lastStatus,

    error:
      lastError ||
      'All Cohere keys are unavailable.'
  };
}


/* =========================================================
   PROVIDER ROUTER
========================================================= */

async function runProvider(
  provider,
  args
) {

  if (
    provider === 'gemini'
  ) {

    return runGemini(
      args
    );
  }


  if (
    provider ===
    'cloudflare'
  ) {

    return runCloudflare(
      args
    );
  }


  if (
    provider ===
    'cohere'
  ) {

    return runCohere(
      args
    );
  }


  if (
    [
      'groq',
      'openrouter',
      'mistral'
    ].includes(provider)
  ) {

    return runOpenAICompatible(
      provider,
      args
    );
  }


  return {
    ok: false,
    status: 400,
    error:
      'Unknown AI provider.'
  };
}


/* =========================================================
   PROVIDER STATUS / KEY COUNTS
========================================================= */

async function providerUsageSnapshot() {

  const providers = {};


  for (
    const provider of
      Object.keys(
        PROVIDERS
      )
  ) {

    let count = 0;


    if (
      provider ===
      'cloudflare'
    ) {

      count =
        getCloudflareAccounts()
          .length;

    } else {

      count =
        getProviderKeys(
          provider
        ).length;
    }


    providers[
      provider
    ] = {

      configured:
        count > 0,

      status:
        count > 0
          ? 'ready'
          : 'not-configured',

      credentials:
        count
    };
  }


  /*
   * Cloudflare Free Plan information
   */

  providers
    .cloudflare
    .freeDailyNeurons =
    10000;


  /*
   * OpenRouter:
   * Query first available key
   * when possible.
   */

  const openRouterKeys =
    getProviderKeys(
      'openrouter'
    );


  if (
    openRouterKeys.length
  ) {

    try {

      const response =
        await fetch(
          'https://openrouter.ai/api/v1/key',
          {
            headers: {
              Authorization:
                `Bearer ${openRouterKeys[0]}`
            },

            signal:
              AbortSignal.timeout(
                5000
              )
          }
        );


      if (response.ok) {

        const responseData =
          await response.json();

        const data =
          responseData.data ||
          {};


        providers
          .openrouter
          .usage = {

          limit:
            data.limit,

          limit_remaining:
            data.limit_remaining,

          limit_reset:
            data.limit_reset,

          usage:
            data.usage,

          usage_daily:
            data.usage_daily,

          usage_weekly:
            data.usage_weekly,

          usage_monthly:
            data.usage_monthly,

          is_free_tier:
            data.is_free_tier
        };
      }

    } catch (_) {}
  }


  return providers;
}


/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(
  req
) {

  /*
   * Ping endpoint
   */

  if (
    req.method === 'HEAD'
  ) {

    return new Response(
      null,
      {
        status: 200
      }
    );
  }


  if (
    req.method !== 'POST'
  ) {

    return json(
      {
        error:
          'Method not allowed'
      },
      405
    );
  }


  try {

    const body =
      await req.json();


    /* PROVIDER STATUS */

    if (
      body.action ===
      'provider-status'
    ) {

      return json({

        providers:
          await providerUsageSnapshot(),

        cloudflare: {
          freeDailyNeurons:
            10000,

          reset:
            '00:00 UTC'
        }
      });
    }


    let {

      message,

      history = [],

      files = [],

      provider = 'gemini',

      model,

      mode,

      customPrompt,

      webSearch,

      autoFallback = true,

      smartRouter = false,

      studyTool

    } = body;


    let routedReason =
      '';


    /* SMART ROUTING */

    if (smartRouter) {

      const route =
        smartRoute(
          mode,
          files,
          message
        );


      if (
        route &&
        configured(
          route.provider
        )
      ) {

        provider =
          route.provider;

        model =
          route.model;

        routedReason =
          route.reason;
      }
    }


    /*
     * Invalid provider:
     * default Gemini.
     */

    if (
      !PROVIDERS[
        provider
      ]
    ) {

      provider =
        'gemini';
    }


    /*
     * Correct model.
     */

    model =
      PROVIDERS[
        provider
      ].models.includes(
        model
      )

        ? model

        : PROVIDERS[
            provider
          ].defaultModel;


    const liveWebContext =
      await getLiveWebContext(
        message,
        webSearch
      );


    const systemInstruction =
      buildSystemInstruction(
        mode,
        customPrompt,
        liveWebContext,
        studyTool
      );


    /* =====================================================
       TRY SELECTED PROVIDER

       Provider itself handles:
       KEY 1 → KEY 2 → KEY 3 ...
    ===================================================== */

    const first =
      await runProvider(
        provider,
        {
          model,
          history,
          files,
          message,
          systemInstruction,
          routedReason
        }
      );


    if (first.ok) {

      return first.response;
    }


    /*
     * Only provider-fallback
     * for temporary / quota errors.
     */

    const fallbackable =
      isRetryableStatus(
        first.status
      );


    /* =====================================================
       PROVIDER FALLBACK

       Example:

       Gemini
         Key 1 fail
         Key 2 fail
         Key 3 fail

            ↓

       Cloudflare
         Account 1 fail
         Account 2 succeeds
    ===================================================== */

    if (
      autoFallback &&
      fallbackable
    ) {

      const hasImage =
        Array.isArray(files) &&
        files.some(
          file =>
            file?.mimeType
              ?.startsWith(
                'image/'
              )
        );


      for (
        const fallbackProvider
        of FALLBACK_ORDER
      ) {

        if (
          fallbackProvider ===
            provider ||
          !configured(
            fallbackProvider
          )
        ) {

          continue;
        }


        /*
         * Only Gemini/Cloudflare
         * for current image pipeline.
         */

        if (
          hasImage &&
          ![
            'gemini',
            'cloudflare'
          ].includes(
            fallbackProvider
          )
        ) {

          continue;
        }


        const fallbackModel =
          PROVIDERS[
            fallbackProvider
          ].defaultModel;


        const result =
          await runProvider(
            fallbackProvider,
            {
              model:
                fallbackModel,

              history,

              files,

              message,

              systemInstruction,

              fallbackFrom:
                provider,

              routedReason:
                routedReason ||
                'fallback'
            }
          );


        if (
          result.ok
        ) {

          return result.response;
        }
      }
    }


    return json(
      {

        error:
          first.error ||
          'AI provider unavailable.',

        provider,

        status:
          first.status,

        rateLimited:
          first.status === 429,

        autoFallback
      },

      first.status ||
      500,

      {
        'X-AI-Provider':
          provider
      }
    );

  } catch (error) {

    return json(
      {
        error:
          error?.message ||
          String(error)
      },
      500
    );
  }
}
