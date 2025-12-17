import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

if (!existsSync(distDir)) {
  console.error('No se encontró el directorio "dist". Ejecuta "npm run build" antes de iniciar el servidor.');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 8080;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const getContentType = (filePath) => mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

const serveFile = async (filePath, res) => {
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    if (filePath.endsWith('index.html')) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error interno del servidor');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Recurso no encontrado');
    console.error('Error al servir', filePath, error.message);
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const requestedPath = decodeURIComponent(url.pathname);
  const hasExtension = path.extname(requestedPath) !== '';
  let filePath = path.join(distDir, requestedPath);

  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    await serveFile(filePath, res);
  } catch (error) {
    if (!hasExtension) {
      await serveFile(path.join(distDir, 'index.html'), res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Recurso no encontrado');
      console.error('Recurso no encontrado', filePath, error.message);
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor listo en http://0.0.0.0:${PORT}`);
});
