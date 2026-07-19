// handlers/resumenHandler.js
// Combina ventas + gastos + pagos a empleados para dar una foto financiera
// (del mes actual o de cualquier período "YYYY-MM").
import { ventasDelPeriodo } from "./ventasHandler.js";
import { totalGastos, gastosPorCategoria } from "./gastosHandler.js";
import { totalPagos, pagos } from "./pagosHandler.js";
import { turnos, totalGeneradoPorEmpleado } from "./turnosHandler.js";
import { totalPagadoAEmpleado } from "./pagosHandler.js";
import { empleados } from "./empleadosHandler.js";

const metodosLabel = {
    transferencia: "Transferencia",
    qr: "QR",
    debitomc: "Débito MC",
    debitovs: "Débito VS",
    ctacte: "Cuenta Cte",
};

export function calcularResumenPeriodo(periodo = null) {
    const ventasPeriodo = ventasDelPeriodo(periodo);

    const cantidadTickets = ventasPeriodo.length;
    const totalVentas = Number(ventasPeriodo.reduce((acc, v) => acc + v.total, 0).toFixed(2));
    const ticketPromedio = cantidadTickets ? Number((totalVentas / cantidadTickets).toFixed(2)) : 0;

    const desglosePorMetodo = {};
    Object.keys(metodosLabel).forEach((key) => {
        const deEseMetodo = ventasPeriodo.filter((v) => v.metodoPago === key);
        desglosePorMetodo[key] = {
            cantidad: deEseMetodo.length,
            total: Number(deEseMetodo.reduce((acc, v) => acc + v.total, 0).toFixed(2)),
        };
    });

    const productosMap = {};
    ventasPeriodo.forEach((v) => {
        v.items.forEach((item) => {
            if (!productosMap[item.codigo]) {
                productosMap[item.codigo] = { codigo: item.codigo, nombre: item.nombre, cantidad: 0, total: 0 };
            }
            productosMap[item.codigo].cantidad += Number(item.cantidad) || 0;
            productosMap[item.codigo].total += (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
        });
    });
    const topProductos = Object.values(productosMap)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
        .map((p) => ({ ...p, total: Number(p.total.toFixed(2)) }));

    const totalGastosPeriodo = Number(totalGastos(periodo).toFixed(2));
    const gastosPorCategoriaPeriodo = gastosPorCategoria(periodo);

    const totalPagosPeriodo = Number(totalPagos(periodo).toFixed(2));

    const saldosEmpleados = empleados.map((e) => {
        const generado = Number(totalGeneradoPorEmpleado(e.id, periodo).toFixed(2));
        const pagado = Number(totalPagadoAEmpleado(e.id, periodo).toFixed(2));
        return {
            empleadoId: e.id,
            nombre: e.nombre,
            valorHora: e.valorHora,
            generado,
            pagado,
            saldoPendiente: Number((generado - pagado).toFixed(2)),
        };
    });
    const totalGeneradoEmpleados = Number(saldosEmpleados.reduce((acc, s) => acc + s.generado, 0).toFixed(2));
    const totalSaldoPendienteEmpleados = Number(
        saldosEmpleados.reduce((acc, s) => acc + s.saldoPendiente, 0).toFixed(2)
    );

    const balanceNeto = Number((totalVentas - totalGastosPeriodo - totalPagosPeriodo).toFixed(2));

    return {
        periodo: periodo || "actual",
        fecha: new Date().toISOString(),
        ventas: {
            totalVentas,
            cantidadTickets,
            ticketPromedio,
            desglosePorMetodo,
            topProductos,
        },
        gastos: {
            total: totalGastosPeriodo,
            porCategoria: gastosPorCategoriaPeriodo,
        },
        pagosEmpleados: {
            total: totalPagosPeriodo,
            totalGenerado: totalGeneradoEmpleados,
            totalSaldoPendiente: totalSaldoPendienteEmpleados,
            saldosPorEmpleado: saldosEmpleados,
        },
        balanceNeto,
    };
}

export function periodoActual() {
    return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}
