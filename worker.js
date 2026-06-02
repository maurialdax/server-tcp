

import http  from 'node:http';
import fs    from 'node:fs';
import path  from 'node:path';
 
const PORT          = 3001;
const EVIDENCIA_LOG = path.join(process.cwd(), 'evidencia.log');
 
function guardarEvidencia(contenido) {
  const linea = `[${new Date().toISOString()}] ${contenido}\n`;
  fs.appendFileSync(EVIDENCIA_LOG, linea);
}
 
const server = http.createServer((req, res) => {
 
  // ── GET / — health check ──────────────────────────────────
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ estado: 'ok', pid: process.pid }));
    return;
  }
 
  // ── POST /escribir-evidencia ──────────────────────────────
  if (req.url === '/escribir-evidencia' && req.method === 'POST') {
    const idPeticion = Date.now();
 
    console.log(`[WORKER PID:${process.pid}] Petición ${idPeticion} recibida. Escribiendo en 3 segundos...`);
    console.log(`[WORKER PID:${process.pid}] ⚠️  Podés matarme ahora con: taskkill /PID ${process.pid} /F`);
 
    process.send?.({ evento: 'escritura-iniciada', idPeticion, pid: process.pid });
 
    setTimeout(() => {
      // Escribimos la evidencia en disco
      guardarEvidencia(`Evidencia petición ${idPeticion} - PID Worker: ${process.pid}`);
      console.log(`[WORKER PID:${process.pid}] Petición ${idPeticion}: escritura completada. Respondiendo al cliente...`);
 
      // Sin crash automático: siempre respondemos correctamente
      process.send?.({ evento: 'escritura-exitosa', idPeticion, pid: process.pid });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        estado:     'ok',
        mensaje:    'Evidencia escrita correctamente.',
        idPeticion,
        pid:        process.pid,
      }));
 
    }, 3000);
 
    return;
  }
 
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});
 
server.listen(PORT, () => {
  console.log(`[WORKER PID:${process.pid}] Escuchando en http://localhost:${PORT}`);
  console.log(`[WORKER PID:${process.pid}] Para matar este proceso: taskkill /PID ${process.pid} /F`);
  process.send?.({ evento: 'worker-listo', pid: process.pid, puerto: PORT });
});
 
server.on('error', (err) => {
  console.error(`[WORKER] Error: ${err.message}`);
  process.exit(1);
});