# Chat TCP Multiusuario - IFTS 16

Servidor TCP hecho con Node.js que permite la comunicación entre múltiples usuarios en tiempo real. Todos los mensajes y conexiones quedan registrados en un archivo de log.

## Archivos

- `server.js` — Servidor TCP multiusuario con broadcast y logs
- `client.js` — Cliente de consola para conectarse al chat
- `package.json` — Configuración del proyecto (necesario para usar `import`)
- `chat.log` — Se crea automáticamente al iniciar el servidor

## ¿Cómo correrlo?

Primero iniciá el servidor:

```
node server.js
```

En otra terminal, conectate con el cliente:

```
node client.js
```

Podés abrir tantas terminales con `node client.js` como quieras para simular múltiples usuarios. Lo que escriba uno le llega a todos los demás.

## Comandos disponibles

Una vez conectado podés usar:

- `/nick <nombre>` — Cambia tu nombre en el chat
- `/lista` — Muestra los usuarios conectados
- `/salir` — Te desconecta del chat

## Archivo de log

Cada conexión, mensaje y desconexión queda registrado en `chat.log`. Ejemplo:

```
[2025-04-22T10:00:00.000Z] SERVIDOR INICIADO
[2025-04-22T10:00:05.000Z] CONEXION | Usuario_54321 | ::1:54321
[2025-04-22T10:00:10.000Z] NICK | Usuario_54321 -> Juan
[2025-04-22T10:00:15.000Z] MENSAJE | Juan | Hola a todos!
[2025-04-22T10:00:30.000Z] DESCONEXION | Juan | ::1:54321
```

## ¿Cómo capturar el handshake?

Abrí Wireshark, seleccioná la interfaz Loopback y usá el filtro:

```
tcp.port == 3000
```

Cuando te conectes vas a ver los tres paquetes del handshake: SYN, SYN-ACK y ACK.
