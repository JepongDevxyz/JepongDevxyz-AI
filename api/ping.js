export const config = {
  runtime: 'edge',
};

export default function handler() {
  return new Response('pong', {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
