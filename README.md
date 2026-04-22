# Servidor de Eco TCP
 
Servidor TCP simple hecho con Node.js que repite todo lo que el cliente le manda.
 
 
## ¿Cómo correrlo?
 
Primero iniciá el servidor:
 
```
node server.js
```
 
En otra terminal, conectate:
 
```
ncat localhost 3000
```
 
Escribí cualquier mensaje y presioná Enter. Vas a ver la respuesta del servidor.
 
## ¿Cómo capturar el handshake?
 
Abrí Wireshark, seleccioná la interfaz Loopback y usá el filtro:
 
```
tcp.port == 3000
```
 
Cuando te conectes vas a ver los tres paquetes del handshake: SYN, SYN-ACK y ACK.
 