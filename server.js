import http from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');
const defaultPort = 8080;

const mimeTypes = new Map([
  ['.html', 'text/html'],
  ['.js', 'application/javascript'],
  ['.css', 'text/css'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain'],
]);

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes.get(ext) || 'application/octet-stream';
};

const sanitizePath = (requestedPath) => {
  const decoded = decodeURIComponent(requestedPath);
  const normalized = path.posix.normalize(decoded);
  const withoutTraversal = normalized.replace(/^\.\.(?:\/.+)?$/, '');
  const relativePath = withoutTraversal.startsWith('/')
    ? withoutTraversal.slice(1)
    : withoutTraversal;
  return path.join(distDir, relativePath);
};

const serveFile = async (filePath) => {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error('Not a file');
  }
  const data = await readFile(filePath);
  return { data, contentType: getContentType(filePath) };
};

const requestHandler = async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetPath = sanitizePath(url.pathname);

  try {
    const { data, contentType } = await serveFile(targetPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    try {
      const { data, contentType } = await serveFile(indexPath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (err) {
      console.error('Failed to serve request', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
};

const port = Number(process.env.PORT) || defaultPort;

const server = http.createServer((req, res) => {
  requestHandler(req, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
