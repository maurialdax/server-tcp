import net from 'node:net';
import readline from 'node:readline';

const HOST = 'localhost';
const PORT = 3000;

// readline permite leer línea por línea desde la consola
const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout
});

// Conectamos al servidor TCP
const socket = net.connect(PORT, HOST, () => {
  console.log(`Conectado al servidor ${HOST}:${PORT}`);
  console.log('Escribí un mensaje y presioná Enter. Comandos: /nick <nombre> | /lista | /salir');
  console.log('---');
});

// Cuando el servidor nos manda algo, lo mostramos en consola
socket.on('data', (data) => {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(data.toString());
  rl.prompt(true);
});

// Cuando el servidor cierra la conexión
socket.on('end', () => {
  console.log('\nDesconectado del servidor.');
  process.exit(0);
});

// Error de conexión
socket.on('error', (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

// Leemos lo que escribe el usuario y lo enviamos al servidor
rl.on('line', (linea) => {
  const texto = linea.trim();
  if (!texto) { rl.prompt(); return; }
  socket.write(texto + '\n');
  if (texto === '/salir') rl.close();
});

rl.on('close', () => {
  socket.end();
  process.exit(0);
});

rl.prompt();
