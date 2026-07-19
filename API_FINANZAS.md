# Backend Mula Plateada — Módulo de Finanzas (gastos, pagos a empleados, cierres mensuales)

Este documento resume lo que se agregó al backend en esta sesión, para que el
próximo chat (donde vamos a construir el Dashboard y las pantallas nuevas en
el frontend) tenga toda la referencia de la API sin tener que releer el código.

## Qué se agregó

Todo funciona igual que el stock actual: eventos de **Socket.IO** en tiempo
real + persistencia en archivos JSON dentro de `backend/data/`. Cualquier
dispositivo conectado recibe los cambios al instante, igual que ya pasa hoy
con `stockActualizado`.

Archivos nuevos:
```
backend/
  utils/jsonStore.js          # helper genérico de persistencia (no se usa desde el frontend)
  handlers/gastosHandler.js
  handlers/empleadosHandler.js
  handlers/turnosHandler.js    # horas trabajadas por empleado
  handlers/pagosHandler.js     # pagos efectivamente realizados a empleados
  handlers/ventasHandler.js    # historial de tickets, ahora persistido en el server
  handlers/resumenHandler.js   # combina todo en un resumen financiero
  handlers/cierresHandler.js   # "fotos" guardadas mes a mes
  handlers/finanzasSocket.js   # registra todos los eventos de socket de arriba
```

`server.js` e `index.js` fueron modificados para cargar estos datos al
arrancar y registrar los eventos en cada conexión (`initFinanzasSocket`).

Los archivos `.env` de configuración no cambiaron. `.gitignore` ya ignoraba
`/data/*.json`, así que estos nuevos datos NO se suben a git (igual que
`chat.json`).

## Modelo de datos

### Empleado (`empleadosActualizado`)
```json
{ "id": "...", "nombre": "Juan Perez", "valorHora": 2000, "activo": true }
```

### Turno / horas trabajadas (`turnosActualizado`)
```json
{
  "id": "...",
  "empleadoId": "...",
  "empleadoNombre": "Juan Perez",
  "horas": 8,
  "valorHora": 2000,          // valor hora AL MOMENTO de cargar el turno (snapshot)
  "montoGenerado": 16000,     // horas * valorHora
  "fecha": "2026-07-18T...",
  "nota": "Turno mañana"
}
```

### Pago a empleado (`pagosActualizado`)
```json
{ "id": "...", "empleadoId": "...", "empleadoNombre": "Juan Perez", "monto": 5000, "fecha": "...", "nota": "Adelanto" }
```
> Saldo pendiente de un empleado = suma de `montoGenerado` de sus turnos − suma de `monto` de sus pagos.

### Gasto (`gastosActualizado`)
```json
{ "id": "...", "concepto": "Café en grano", "monto": 15000, "categoria": "Insumos", "usuario": "...", "fecha": "..." }
```
Categorías válidas (`categoriasGasto`): `Insumos`, `Servicios`, `Alquiler`, `Mantenimiento`, `Impuestos`, `Otros`.

### Venta (`ventasActualizado`)
```json
{
  "id": "...",
  "fecha": "2026-07-18T...",
  "metodoPago": "qr",
  "items": [{ "codigo": "999", "nombre": "Cafe test", "precio": 100, "cantidad": 1 }],
  "total": 100,
  "usuario": "..."
}
```

### Resumen financiero (`resumenMesActualizado`, y respuesta de `solicitarResumenPeriodo`)
Combina ventas + gastos + pagos de un período `"YYYY-MM"` (o el mes actual):
```json
{
  "periodo": "2026-07",
  "fecha": "...",
  "ventas": {
    "totalVentas": 100, "cantidadTickets": 1, "ticketPromedio": 100,
    "desglosePorMetodo": { "transferencia": {"cantidad":0,"total":0}, "qr": {"cantidad":1,"total":100}, "...": "..." },
    "topProductos": [{ "codigo": "999", "nombre": "Cafe test", "cantidad": 1, "total": 100 }]
  },
  "gastos": { "total": 15000, "porCategoria": { "Insumos": { "cantidad": 1, "total": 15000 } } },
  "pagosEmpleados": {
    "total": 5000, "totalGenerado": 16000, "totalSaldoPendiente": 11000,
    "saldosPorEmpleado": [{ "empleadoId": "...", "nombre": "Juan Perez", "valorHora": 2000, "generado": 16000, "pagado": 5000, "saldoPendiente": 11000 }]
  },
  "balanceNeto": -19900   // totalVentas - totalGastos - totalPagos
}
```

### Cierre mensual guardado (`cierresActualizado`)
```json
{ "id": "...", "periodo": "2026-07", "guardadoEl": "...", "guardadoPor": "usuario", "resumen": { /* el objeto de arriba */ } }
```
Esto es lo que va a alimentar la vista de **"rendimientos guardados mes a mes"**: una lista de cierres, uno por período, que no cambian aunque sigan cargándose más ventas/gastos después.

## Eventos de Socket.IO disponibles

Al conectar, el server ya emite automáticamente el estado inicial de todo
(`gastosActualizado`, `categoriasGasto`, `empleadosActualizado`,
`turnosActualizado`, `pagosActualizado`, `ventasActualizado`,
`cierresActualizado`, `resumenMesActualizado`) — igual que hoy hace con
`stockActualizado`. No hace falta pedirlo, solo escuchar esos eventos.

| Emitís (`socket.emit`) | Payload | Callback (ack) | Qué dispara |
|---|---|---|---|
| `agregarGasto` | `{ concepto, monto, categoria, usuario }` | `{ ok, error? }` | `gastosActualizado`, `resumenMesActualizado` |
| `eliminarGasto` | `id` | — | `gastosActualizado`, `resumenMesActualizado` |
| `agregarEmpleado` | `{ nombre, valorHora }` | `{ ok, error? }` | `empleadosActualizado` |
| `editarEmpleado` | `{ id, nombre?, valorHora?, activo? }` | `{ ok, error? }` | `empleadosActualizado`, `resumenMesActualizado` |
| `eliminarEmpleado` | `id` | — | `empleadosActualizado` |
| `registrarTurno` | `{ empleadoId, horas, fecha?, nota? }` | `{ ok, error? }` | `turnosActualizado`, `resumenMesActualizado` |
| `eliminarTurno` | `id` | — | `turnosActualizado`, `resumenMesActualizado` |
| `registrarPago` | `{ empleadoId, monto, fecha?, nota? }` | `{ ok, error? }` | `pagosActualizado`, `resumenMesActualizado` |
| `eliminarPago` | `id` | — | `pagosActualizado`, `resumenMesActualizado` |
| `registrarVentaCompleta` | `{ metodoPago, items, usuario? }` | `{ ok, venta?, error? }` | valida y descuenta stock, `stockActualizado`, `ventasActualizado`, `resumenMesActualizado` |
| `eliminarVenta` | `id` | — | `ventasActualizado`, `resumenMesActualizado` |
| `solicitarResumenPeriodo` | `"2026-07"` | devuelve el resumen de ese período | — |
| `guardarCierre` | `{ periodo: "2026-07", usuario }` | `{ ok, cierre?, error? }` | `cierresActualizado` |
| `eliminarCierre` | `id` | — | `cierresActualizado` |

Importante sobre **ventas**: el evento viejo `confirmarVenta` (el que ya usa
`Caja.vue` hoy) se dejó intacto para no romper nada, pero **no** guarda el
ticket en el servidor, solo descuenta stock. El nuevo `registrarVentaCompleta`
hace las dos cosas (descuenta stock Y guarda el ticket persistido). Para que
las ventas cuenten en los cierres mensuales, `Caja.vue` va a tener que migrar
de `confirmarVenta` a `registrarVentaCompleta` — eso es trabajo de frontend,
pendiente para la próxima sesión.

## Qué falta (para la próxima sesión, ya con el frontend)

1. Migrar `Caja.vue` de `confirmarVenta` a `registrarVentaCompleta` (así las
   ventas quedan guardadas en el servidor, no solo en localStorage del
   navegador que las hizo).
2. Pantalla nueva **Empleados**: alta/edición de empleados y su valor hora.
3. Pantalla nueva **Horas / Turnos**: cargar horas trabajadas por empleado.
4. Pantalla nueva **Pagos**: ver saldo pendiente por empleado y registrar pagos.
5. Pantalla nueva **Gastos**: cargar gastos por categoría.
6. Rediseño del **Dashboard**: KPIs con `resumenMesActualizado`, preview de
   stock (usar `stockActualizado`, mostrar los productos con menos unidades
   primero), y una vista de **cierres mensuales** listando `cierresActualizado`
   con selector de mes para comparar rendimiento.
7. Botón "Cerrar mes" en algún lado (Dashboard o Caja) que emita `guardarCierre`.

Todo esto ya tiene el backend probado end-to-end (empleado → turno → pago →
gasto → venta → resumen → cierre), así que el frontend solo necesita
consumir estos eventos.
