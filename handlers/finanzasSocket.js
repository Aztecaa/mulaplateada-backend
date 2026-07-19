// handlers/finanzasSocket.js
// Registra todos los eventos de socket.io relacionados a las finanzas:
// gastos, empleados, turnos (horas trabajadas), pagos a empleados, ventas y cierres.
// Sigue el mismo patrón que ya usaba server.js para el stock: cada mutación
// persiste en disco y luego se re-emite el estado completo a TODOS los clientes
// conectados, para que cualquier dispositivo (caja, oficina, celular del dueño)
// vea los cambios en tiempo real.
import { gastos, agregarGasto, eliminarGasto, CATEGORIAS_GASTO } from "./gastosHandler.js";
import { empleados, agregarEmpleado, editarEmpleado, eliminarEmpleado } from "./empleadosHandler.js";
import { turnos, registrarTurno, eliminarTurno } from "./turnosHandler.js";
import { pagos, registrarPago, eliminarPago } from "./pagosHandler.js";
import { ventas, registrarVenta, eliminarVenta } from "./ventasHandler.js";
import { cierres, guardarCierre, eliminarCierre } from "./cierresHandler.js";
import { calcularResumenPeriodo, periodoActual } from "./resumenHandler.js";
import { productos } from "../routes/productos.js";
import { guardarStock } from "../stockHandler.js";

// Emite el resumen financiero del mes actual a todos los clientes.
// Se llama después de cualquier cambio en ventas, gastos o pagos.
function emitirResumenActual(io) {
    io.emit("resumenMesActualizado", calcularResumenPeriodo(periodoActual()));
}

export function initFinanzasSocket(io, socket) {
    // === ESTADO INICIAL AL CONECTAR ===
    socket.emit("gastosActualizado", gastos);
    socket.emit("categoriasGasto", CATEGORIAS_GASTO);
    socket.emit("empleadosActualizado", empleados);
    socket.emit("turnosActualizado", turnos);
    socket.emit("pagosActualizado", pagos);
    socket.emit("ventasActualizado", ventas);
    socket.emit("cierresActualizado", cierres);
    socket.emit("resumenMesActualizado", calcularResumenPeriodo(periodoActual()));

    // === GASTOS ===
    socket.on("agregarGasto", async (data, callback) => {
        try {
            await agregarGasto(data);
            io.emit("gastosActualizado", gastos);
            emitirResumenActual(io);
            callback?.({ ok: true });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("eliminarGasto", async (id) => {
        await eliminarGasto(id);
        io.emit("gastosActualizado", gastos);
        emitirResumenActual(io);
    });

    // === EMPLEADOS ===
    socket.on("agregarEmpleado", async (data, callback) => {
        try {
            await agregarEmpleado(data);
            io.emit("empleadosActualizado", empleados);
            callback?.({ ok: true });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("editarEmpleado", async (data, callback) => {
        try {
            await editarEmpleado(data);
            io.emit("empleadosActualizado", empleados);
            emitirResumenActual(io);
            callback?.({ ok: true });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("eliminarEmpleado", async (id) => {
        await eliminarEmpleado(id);
        io.emit("empleadosActualizado", empleados);
    });

    // === TURNOS (horas trabajadas) ===
    socket.on("registrarTurno", async (data, callback) => {
        try {
            await registrarTurno(data);
            io.emit("turnosActualizado", turnos);
            emitirResumenActual(io);
            callback?.({ ok: true });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("eliminarTurno", async (id) => {
        await eliminarTurno(id);
        io.emit("turnosActualizado", turnos);
        emitirResumenActual(io);
    });

    // === PAGOS A EMPLEADOS ===
    socket.on("registrarPago", async (data, callback) => {
        try {
            await registrarPago(data);
            io.emit("pagosActualizado", pagos);
            emitirResumenActual(io);
            callback?.({ ok: true });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("eliminarPago", async (id) => {
        await eliminarPago(id);
        io.emit("pagosActualizado", pagos);
        emitirResumenActual(io);
    });

    // === VENTAS ===
    // Reemplaza/complementa a "confirmarVenta" (que ya descuenta stock):
    // ahora además persiste el ticket completo en el servidor.
    socket.on("registrarVentaCompleta", async (data, callback) => {
        try {
            // 1) Validar y descontar stock
            for (const item of data.items) {
                const p = productos.find((x) => x.codigo === item.codigo);
                if (!p || p.cantidadUnidadesSueltas < item.cantidad) {
                    throw new Error(`No hay suficiente stock de ${item.nombre || item.codigo}`);
                }
            }
            data.items.forEach(({ codigo, cantidad }) => {
                const p = productos.find((x) => x.codigo === codigo);
                if (p) p.cantidadUnidadesSueltas = Math.max(p.cantidadUnidadesSueltas - cantidad, 0);
            });
            await guardarStock();
            io.emit("stockActualizado", productos);

            // 2) Registrar la venta
            const venta = await registrarVenta(data);
            io.emit("ventasActualizado", ventas);
            emitirResumenActual(io);

            callback?.({ ok: true, venta });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("eliminarVenta", async (id) => {
        await eliminarVenta(id);
        io.emit("ventasActualizado", ventas);
        emitirResumenActual(io);
    });

    // === RESUMEN / CIERRES MENSUALES ===
    socket.on("solicitarResumenPeriodo", (periodo, callback) => {
        callback?.(calcularResumenPeriodo(periodo));
    });

    socket.on("guardarCierre", async ({ periodo, usuario }, callback) => {
        try {
            const cierre = await guardarCierre(periodo, usuario);
            io.emit("cierresActualizado", cierres);
            callback?.({ ok: true, cierre });
        } catch (err) {
            callback?.({ ok: false, error: err.message });
        }
    });

    socket.on("eliminarCierre", async (id) => {
        await eliminarCierre(id);
        io.emit("cierresActualizado", cierres);
    });
}
