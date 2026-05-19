// ============================================================
//  IFTS 16 - Programación Sobre Redes
//  Ejercicio: Tolerancia a Fallos y Consistencia de Datos
//  Archivo: master.js
//
//  El Master cumple dos roles:
//    1. Spawn y supervisión del Worker (lo revive si cae)
//    2. Servidor de telemetría HTTP en el puerto 4000
//       donde se puede ver el estado del sistema en tiempo real
// ============================================================

import { fork }      from 'node:child_process';
import http          from 'node:http';
import fs            from 'node:fs';
import path          from 'node:path';

// ── Configuración ────────────────────────────────────────────
const WORKER_SCRIPT   = path.join(process.cwd(), 'worker.js');
const TELEMETRY_PORT  = 4000;
const LOG_FILE        = path.join(process.cwd(), 'master.log');

// ── Estado del sistema ───────────────────────────────────────
// El Master lleva registro de cuántas veces revivió al Worker
// y el historial de eventos para mostrarlo en la telemetría.
let workerProcess   = null;
let revivimientos   = 0;
let estadoWorker    = 'iniciando';
const historial     = [];

// ── guardarLog ───────────────────────────────────────────────
function guardarLog(texto) {
  const linea = `[${new Date().toISOString()}] ${texto}\n`;
  process.stdout.write(linea);
  fs.appendFileSync(LOG_FILE, linea);
  historial.unshift(linea.trim()); // más reciente primero
  if (historial.length > 50) historial.pop(); // límite de 50 entradas
}

// ── spawnWorker ───────────────────────────────────────────────
// Lanza el proceso Worker con fork() y configura los listeners
// para detectar crashes y revivirlo automáticamente.
function spawnWorker() {
  guardarLog('MASTER | Iniciando Worker...');
  estadoWorker = 'corriendo';

  // fork() crea un proceso hijo Node.js y mantiene un canal IPC
  // (Inter-Process Communication) para enviar mensajes entre procesos.
  workerProcess = fork(WORKER_SCRIPT);

  // ── Mensajes desde el Worker ─────────────────────────────
  // El Worker puede enviar eventos al Master con process.send()
  workerProcess.on('message', (msg) => {
    guardarLog(`WORKER → MASTER | ${JSON.stringify(msg)}`);
  });

  // ── Worker terminó (crash o cierre normal) ───────────────
  // El evento 'exit' se dispara siempre que el proceso hijo termina.
  // 'code' es el código de salida: 0 = normal, 1 = error/crash.
  workerProcess.on('exit', (code, signal) => {
    estadoWorker = 'caído';

    if (signal === 'SIGKILL') {
      // kill -9 desde la terminal: el SO mató al proceso de forma forzada
      guardarLog(`MASTER |   Worker eliminado por señal ${signal} (kill -9). Peticiones en vuelo: PERDIDAS.`);
    } else {
      guardarLog(`MASTER |  Worker terminó con código ${code}. Reviviendo...`);
    }

    revivimientos++;

    // Esperamos 1 segundo antes de revivir para evitar un loop frenético
    // en caso de que el Worker crashee al arrancar.
    setTimeout(() => {
      guardarLog(`MASTER |  Revivimiento #${revivimientos} del Worker.`);
      spawnWorker();
    }, 1000);
  });

  // ── Error al lanzar el Worker ────────────────────────────
  workerProcess.on('error', (err) => {
    guardarLog(`MASTER | Error al lanzar Worker: ${err.message}`);
  });
}

// ── Servidor de Telemetría ────────────────────────────────────
// Expone una API HTTP simple para monitorear el estado del sistema.
// Acceder desde el navegador a: http://localhost:4000
const telemetria = http.createServer((req, res) => {

  if (req.url === '/' || req.url === '/estado') {
    const estado = {
      timestamp:    new Date().toISOString(),
      workerPID:    workerProcess?.pid ?? null,
      estadoWorker,
      revivimientos,
      historial:    historial.slice(0, 10), // últimos 10 eventos
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(estado, null, 2));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

telemetria.listen(TELEMETRY_PORT, () => {
  guardarLog(`MASTER | Telemetría disponible en http://localhost:${TELEMETRY_PORT}/estado`);
});

// ── Arranque ──────────────────────────────────────────────────
guardarLog('MASTER | Sistema iniciado.');
spawnWorker();
