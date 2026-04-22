// Importamos el módulo nativo 'net' de Node.js.
// Este módulo provee una API para crear servidores y clientes TCP/IPC.
// No requiere instalación externa (viene incluido en Node.js).
import net from 'node:net';

// Importamos 'fs' y 'path' para manejar el archivo de log
import fs from 'node:fs';
import path from 'node:path';

// ── Configuración del log ────────────────────────────────────
// Ruta del archivo donde se guardarán todos los mensajes y eventos
const LOG_FILE = path.join(process.cwd(), 'chat.log');

// Mapa de clientes conectados: socket → { nick, ip, port }
// Permite identificar a cada cliente y hacer broadcast a todos
const clientes = new Map();

// ── guardarLog ───────────────────────────────────────────────
// Escribe una línea en chat.log con fecha y hora (ISO 8601).
// Usa fs.appendFile para no sobreescribir el historial previo.
function guardarLog(texto) {
  const linea = `[${new Date().toISOString()}] ${texto}\n`;
  fs.appendFile(LOG_FILE, linea, (err) => {
    if (err) console.error('Error al escribir log:', err.message);
  });
}

// ── Broadcast ────────────────────────────────────────────────
// Envía un mensaje a todos los clientes conectados.
// Si se pasa "excluir", ese socket no recibe el mensaje.
function broadcast(mensaje, excluir = null) {
  for (const [socket] of clientes) {
    if (socket !== excluir) {
      socket.write(mensaje);
    }
  }
}

/**
 * net.createServer([options], [connectionListener])
 * --------------------------------------------------
 * Crea una nueva instancia de servidor TCP.
 * El callback que recibe es el manejador del evento 'connection',
 * que se dispara cada vez que un cliente establece una conexión.
 *
 * @param {net.Socket} socket - Objeto que representa la conexión
 *   con el cliente. A través de él podemos leer datos entrantes
 *   y escribir datos de vuelta al cliente.
 */
const server = net.createServer((socket) => {

  // ── Evento: nueva conexión establecida ──────────────────────
  // socket.remoteAddress → IP del cliente
  // socket.remotePort    → Puerto efímero asignado por el SO al cliente
  console.log(`[CONEXIÓN] Cliente conectado desde ${socket.remoteAddress}:${socket.remotePort}`);

  // Asignamos un nick provisorio y registramos al cliente en el mapa
  const nickInicial = `Usuario_${socket.remotePort}`;
  clientes.set(socket, { nick: nickInicial, ip: socket.remoteAddress, port: socket.remotePort });
  guardarLog(`CONEXION | ${nickInicial} | ${socket.remoteAddress}:${socket.remotePort}`);

  // Mensaje de bienvenida y comandos disponibles
  socket.write(`Bienvenido al chat! Tu nick es: ${nickInicial}\n`);
  socket.write(`Comandos: /nick <nombre> | /lista | /salir\n`);
  socket.write(`---\n`);

  // Avisamos al resto que alguien se conectó
  broadcast(`>> ${nickInicial} se unió al chat.\n`, socket);

  // ── Evento: 'data' ──────────────────────────────────────────
  // Se dispara cada vez que el socket recibe datos del cliente.
  // 'data' es un Buffer (flujo de datos binarios). Al concatenarlo
  // con una cadena de texto, Node.js lo convierte automáticamente
  // a UTF-8.
  socket.on('data', (data) => {
    const mensaje = data.toString().trim(); // eliminamos saltos de línea/espacios
    console.log(`[DATOS RECIBIDOS] ${socket.remoteAddress}:${socket.remotePort}: "${mensaje}"`);

    const info = clientes.get(socket);
    const nick = info.nick;

    if (!mensaje) return;

    // ── Comando: /nick <nuevo_nick> ──────────────────────────
    // Permite al usuario cambiar su nombre en el chat
    if (mensaje.startsWith('/nick ')) {
      const nuevoNick = mensaje.slice(6).trim();
      if (!nuevoNick) { socket.write('Uso: /nick <nombre>\n'); return; }
      const anterior = nick;
      info.nick = nuevoNick;
      clientes.set(socket, info);
      socket.write(`Tu nick ahora es: ${nuevoNick}\n`);
      broadcast(`>> ${anterior} ahora se llama ${nuevoNick}.\n`, socket);
      guardarLog(`NICK | ${anterior} -> ${nuevoNick}`);
      return;
    }

    // ── Comando: /lista ──────────────────────────────────────
    // Muestra todos los usuarios conectados en este momento
    if (mensaje === '/lista') {
      const lista = [...clientes.values()].map(c => `  - ${c.nick}`).join('\n');
      socket.write(`Usuarios conectados:\n${lista}\n`);
      return;
    }

    // ── Comando: /salir ──────────────────────────────────────
    // Desconecta al usuario del servidor
    if (mensaje === '/salir') {
      socket.write('Hasta luego!\n');
      socket.end();
      return;
    }

    // ── Mensaje normal → broadcast + log ────────────────────
    // Guardamos el mensaje en el log y lo enviamos a todos los demás
    guardarLog(`MENSAJE | ${nick} | ${mensaje}`);
    broadcast(`[${nick}]: ${mensaje}\n`, socket);

    /**
     * socket.write(data[, encoding][, callback])
     * -------------------------------------------
     * Envía datos al cliente a través del socket TCP.
     * Retorna 'true' si los datos fueron enviados al kernel,
     * o 'false' si fueron almacenados en el buffer interno
     * (back-pressure). En un servidor de eco sencillo no es
     * necesario manejar el back-pressure.
     *
     * Respondemos con el prefijo [ECHO-SERVER] > seguido del
     * mensaje original recibido, tal como exige el enunciado.
     */
    socket.write(`[ECHO-SERVER] > ${mensaje}\n`);
  });

  // ── Evento: 'end' ───────────────────────────────────────────
  // Se dispara cuando el cliente envía un paquete FIN (cierre
  // ordenado del lado del cliente según RFC 9293 §3.5).
  // Representa la mitad del cierre TCP (half-close).
  socket.on('end', () => {
    console.log(`[FIN] El cliente ${socket.remoteAddress}:${socket.remotePort} cerró la conexión (FIN recibido).`);
    const info = clientes.get(socket);
    if (info) {
      guardarLog(`DESCONEXION | ${info.nick} | ${info.ip}:${info.port}`);
      broadcast(`>> ${info.nick} abandonó el chat.\n`);
      clientes.delete(socket);
    }
  });

  // ── Evento: 'close' ─────────────────────────────────────────
  // Se dispara cuando el socket fue completamente cerrado
  // (incluyendo el cierre de ambos lados). El parámetro
  // 'hadError' indica si el cierre fue causado por un error.
  socket.on('close', (hadError) => {
    const razon = hadError ? 'con error' : 'sin errores';
    console.log(`[CIERRE] Conexión con ${socket.remoteAddress}:${socket.remotePort} finalizada ${razon}.`);
    clientes.delete(socket);
  });

  // ── Evento: 'error' ─────────────────────────────────────────
  // Manejo de errores a nivel de socket individual.
  // Sin este handler, un error no capturado detendría el proceso.
  socket.on('error', (err) => {
    console.error(`[ERROR SOCKET] ${socket.remoteAddress}:${socket.remotePort} → ${err.message}`);
    clientes.delete(socket);
  });

});

// ── Manejo de errores del servidor ──────────────────────────────
// Captura errores a nivel de servidor, por ejemplo si el puerto
// ya está en uso (EADDRINUSE).
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] El puerto 3000 ya está en uso. Liberalo antes de iniciar el servidor.`);
  } else {
    console.error(`[ERROR SERVIDOR] ${err.message}`);
  }
  process.exit(1);
});

// ── Inicio del servidor ─────────────────────────────────────────
// server.listen(port, [hostname], [callback])
// Pone al servidor en modo escucha activa en el puerto 3000.
// El callback se ejecuta una vez que el servidor está listo.
server.listen(3000, () => {

  /**
   * server.address()
   * ----------------
   * Retorna un objeto con la información del socket del servidor:
   *   { address: '::', family: 'IPv6', port: 3000 }
   * Usamos esto para confirmar en consola la dirección y puerto
   * reales en los que el servidor quedó escuchando.
   */
  const info = server.address();
  console.log(`Echo server TCP escuchando en ${info.address}:${info.port}`);
  guardarLog('SERVIDOR INICIADO');
});
