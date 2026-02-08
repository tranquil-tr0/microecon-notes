import { serve } from "bun";

const server = serve({
  port: 3001,
  async fetch(request) {
    const url = new URL(request.url);
    // Decode path to handle spaces
    let path = decodeURIComponent(url.pathname);

    // Default to index.html
    if (path === '/') {
      path = '/index.html';
    }

    // Serve files from dist directory
    const filePath = `./dist${path}`;
    console.log(`Request: ${url.pathname} -> ${path} -> ${filePath}`);

    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        console.log(`File not found: ${filePath}`);
        return new Response('Not Found', { status: 404 });
      }

      // Set appropriate content type
      const contentType = getContentType(path);

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        }
      });
    } catch (error) {
      console.error(`Error serving ${path}:`, error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
});

function getContentType(path: string): string {
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.mkv')) return 'video/webm';
  if (path.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

console.log(`Server running at http://localhost:${server.port}/`);