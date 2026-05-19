// ============================================================
//  IFTS 16 - Programación Sobre Redes
//  Ejercicio: Tolerancia a Fallos y Consistencia de Datos
//  Archivo: worker.js
//
//  El Worker es un servidor HTTP en el puerto 3001.
//  Tiene una ruta especial /escribir-evidencia que simula
//  una operación lenta (3 segundos) con un 50% de probabilidad
//  de crashear justo después de completarla.
//
//  Esto permite observar los Escenarios A y B del ejercicio:
//    A → ¿Qué recibe el cliente si el Worker muere ANTES de los 3s?
//    B → ¿Qué pasa con las peticiones si el Worker es matado con kill -9?
// ============================================================

import http  from 'node:http';
import fs    from 'node:fs';
import path  from 'node:path';

// ── Configuración ────────────────────────────────────────────
const PORT          = 3001;
const EVIDENCIA_LOG = path.join(process.cwd(), 'evidencia.log');

// ── guardarEvidencia ──────────────────────────────────────────
// Simula una escritura lenta en disco (operación forense).
// En un caso real esto podría ser escribir un archivo grande,
// hacer flush a una base de datos, o firmar digitalmente un log.
function guardarEvidencia(contenido) {
  const linea = `[${new Date().toISOString()}] ${contenido}\n`;
  fs.appendFileSync(EVIDENCIA_LOG, linea);
}

// ── Servidor HTTP del Worker ──────────────────────────────────
const server = http.createServer((req, res) => {

  // ── Ruta: GET / ──────────────────────────────────────────
  // Ruta de health check: confirma que el Worker está vivo.
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ estado: 'ok', pid: process.pid }));
    return;
  }

  // ── Ruta: POST /escribir-evidencia ────────────────────────
  // Esta es la ruta del desafío.
  // Simula una escritura forense de 3 segundos con 50% de crash.
  if (req.url === '/escribir-evidencia' && req.method === 'POST') {
    const idPeticion = Date.now(); // identificador único de esta petición

    console.log(`[WORKER PID:${process.pid}] Petición ${idPeticion} recibida. Iniciando escritura ( segundos)...`);

    // Avisamos al Master que arrancamos a procesar
    process.send?.({ evento: 'escritura-iniciada', idPeticion, pid: process.pid });

    // ── setTimeout de 3 segundos ─────────────────────────────
    // Simula la demora de una escritura real en disco.
    // ESCENARIO A: si el Worker muere ANTES de que este timeout
    // se complete, el cliente no recibirá ninguna respuesta HTTP
    // (conexión cerrada abruptamente). La evidencia NO quedará escrita.
    setTimeout(() => {

      // Simulamos la escritura efectiva del log forense
      guardarEvidencia(`Evidencia petición ${idPeticion} - PID Worker: ${process.pid}`);
      console.log(`[WORKER PID:${process.pid}] Petición ${idPeticion}: escritura completada.`);

      // ── LA TRAMPA: 50% de probabilidad de crash post-escritura ──
      // Esto simula un crash que ocurre DESPUÉS de escribir pero
      // ANTES de responderle al cliente.
      // Consecuencia: la evidencia quedó en disco, pero el cliente
      // nunca recibe la confirmación → inconsistencia observable.
      const crashea = Math.random() < 0.5;

      if (crashea) {
        console.log(`[WORKER PID:${process.pid}]  CRASH simulado post-escritura. El cliente NO recibirá respuesta.`);
        process.send?.({ evento: 'crash-post-escritura', idPeticion, pid: process.pid });
        process.exit(1); // el Master lo detectará y lo revivirá
      }

      // Si no crasheó, respondemos al cliente normalmente
      process.send?.({ evento: 'escritura-exitosa', idPeticion, pid: process.pid });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        estado:      'ok',
        mensaje:     'Evidencia escrita correctamente.',
        idPeticion,
        pid:         process.pid,
      }));

    }, 10000); //10 segundos de espera

    return;
  }

  // ── Ruta no encontrada ────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

// ── Inicio ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[WORKER PID:${process.pid}] Escuchando en http://localhost:${PORT}`);
  process.send?.({ evento: 'worker-listo', pid: process.pid, puerto: PORT });
});

// ── Error del servidor ────────────────────────────────────────
server.on('error', (err) => {
  console.error(`[WORKER] Error: ${err.message}`);
  process.exit(1);
});
