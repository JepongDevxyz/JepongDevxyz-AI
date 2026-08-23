export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
