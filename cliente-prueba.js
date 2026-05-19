// ============================================================
//  IFTS 16 - Programación Sobre Redes
//  Ejercicio: Tolerancia a Fallos y Consistencia de Datos
//  Archivo: cliente-prueba.js
//
//  Envía peticiones a /escribir-evidencia y reporta
//  exactamente qué recibe (o qué NO recibe) del Worker.
//  Usar esto mientras el Master está corriendo para observar
//  los Escenarios A y B del ejercicio.
// ============================================================

import http from 'node:http';

const HOST           = 'localhost';
const PORT           = 3001;
const CANTIDAD       = 5;   // cuántas peticiones enviar en total
const ESPERA_MS      = 800; // ms entre cada petición

// ── enviarPeticion ────────────────────────────────────────────
// Envía una petición POST a /escribir-evidencia y reporta
// el resultado o el error con detalle.
function enviarPeticion(numero) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    console.log(`\n[CLIENTE] Petición #${numero} enviada. Esperando respuesta (puede tardar 3s o crashear)...`);

    const opciones = {
      hostname: HOST,
      port:     PORT,
      path:     '/escribir-evidencia',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
    };

    const req = http.request(opciones, (res) => {
      let cuerpo = '';
      res.on('data', (chunk) => { cuerpo += chunk; });
      res.on('end', () => {
        const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
        console.log(`[CLIENTE] ✅ Petición #${numero} respondida en ${duracion}s`);
        console.log(`[CLIENTE]    Status: ${res.statusCode}`);
        try {
          const data = JSON.parse(cuerpo);
          console.log(`[CLIENTE]    Respuesta:`, data);
        } catch {
          console.log(`[CLIENTE]    Cuerpo:`, cuerpo);
        }
        resolve('ok');
      });
    });

    // ── Manejo de errores de red ─────────────────────────────
    // Si el Worker cae mientras procesaba nuestra petición,
    // Node.js emite un error de socket aquí.
    // ESCENARIO A → el Worker murió antes de los 3s:
    //   el cliente recibe ECONNRESET (conexión reseteada) o
    //   ECONNREFUSED (Worker ya no existe en ese puerto).
    // ESCENARIO B → kill -9 mientras había peticiones en vuelo:
    //   igual, ECONNRESET. El SO cierra el socket abruptamente.
    req.on('error', (err) => {
      const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
      console.log(`[CLIENTE] ❌ Petición #${numero} FALLÓ después de ${duracion}s`);
      console.log(`[CLIENTE]    Error: ${err.code} — ${err.message}`);
      console.log(`[CLIENTE]    ⚠️  La evidencia puede haber quedado escrita en disco sin confirmación.`);
      resolve('error');
    });

    req.end();
  });
}

// ── Loop principal ────────────────────────────────────────────
// Envía las peticiones una por una con una pequeña pausa entre ellas
// para que sea más fácil observar los crashes en tiempo real.
async function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('  IFTS 16 - Cliente de Prueba de Tolerancia a Fallos');
  console.log(`  Enviando ${CANTIDAD} peticiones a http://${HOST}:${PORT}/escribir-evidencia`);
  console.log('  Observá el Master y el Worker en paralelo.');
  console.log('════════════════════════════════════════════════════');

  let exitosas = 0;
  let fallidas  = 0;

  for (let i = 1; i <= CANTIDAD; i++) {
    const resultado = await enviarPeticion(i);
    if (resultado === 'ok') exitosas++;
    else fallidas++;

    // Esperamos un poco antes de la siguiente para no saturar
    if (i < CANTIDAD) {
      await new Promise(r => setTimeout(r, ESPERA_MS));
    }
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log(`  Resumen: ${exitosas} exitosas | ${fallidas} fallidas de ${CANTIDAD} peticiones`);
  console.log('');
  console.log('  Revisá evidencia.log para ver qué quedó guardado.');
  console.log('  Compará con las peticiones exitosas: ¿coinciden?');
  console.log('  Si no coinciden → hay inconsistencia de datos.');
  console.log('════════════════════════════════════════════════════');
}

main();
