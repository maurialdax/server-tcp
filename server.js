
// Importamos el módulo nativo 'net' de Node.js.
// Este módulo provee una API para crear servidores y clientes TCP/IPC.
// No requiere instalación externa (viene incluido en Node.js).
const net = require('net');

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

  // ── Evento: 'data' ──────────────────────────────────────────
  // Se dispara cada vez que el socket recibe datos del cliente.
  // 'data' es un Buffer (flujo de datos binarios). Al concatenarlo
  // con una cadena de texto, Node.js lo convierte automáticamente
  // a UTF-8.
  socket.on('data', (data) => {
    const mensaje = data.toString().trim(); // eliminamos saltos de línea/espacios
    console.log(`[DATOS RECIBIDOS] ${socket.remoteAddress}:${socket.remotePort} → "${mensaje}"`);

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
  });

  // ── Evento: 'close' ─────────────────────────────────────────
  // Se dispara cuando el socket fue completamente cerrado
  // (incluyendo el cierre de ambos lados). El parámetro
  // 'hadError' indica si el cierre fue causado por un error.
  socket.on('close', (hadError) => {
    const razon = hadError ? 'con error' : 'sin errores';
    console.log(`[CIERRE] Conexión con ${socket.remoteAddress}:${socket.remotePort} finalizada ${razon}.`);
  });

  // ── Evento: 'error' ─────────────────────────────────────────
  // Manejo de errores a nivel de socket individual.
  // Sin este handler, un error no capturado detendría el proceso.
  socket.on('error', (err) => {
    console.error(`[ERROR SOCKET] ${socket.remoteAddress}:${socket.remotePort} → ${err.message}`);
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
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        IFTS 16 - Echo Server TCP activo          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Dirección : ${info.address.padEnd(35)}║`);
  console.log(`║  Puerto    : ${String(info.port).padEnd(35)}║`);
  console.log(`║  Familia   : ${info.family.padEnd(35)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Para conectar:  nc localhost 3000               ║');
  console.log('║  Para capturar:  sudo tcpdump -i lo -n port 3000 ║');
  console.log('╚══════════════════════════════════════════════════╝');
});
