// handlers/gastosHandler.js
// Gastos generales de la cafetería (insumos, servicios, alquiler, mantenimiento, etc.)
// NOTA: los pagos a empleados NO van acá, tienen su propio módulo (pagosHandler.js)
import { createArrayStore, generarId } from "../utils/jsonStore.js";

export const CATEGORIAS_GASTO = [
    "Insumos",
    "Servicios",
    "Alquiler",
    "Mantenimiento",
    "Impuestos",
    "Otros",
];

const store = createArrayStore("gastos.json");
export const gastos = store.items;

export const cargarGastosIniciales = store.cargar;

export async function agregarGasto({ concepto, monto, categoria, usuario, fecha }) {
    const gasto = {
        id: generarId(),
        concepto: String(concepto || "").trim(),
        monto: Number(monto) || 0,
        categoria: CATEGORIAS_GASTO.includes(categoria) ? categoria : "Otros",
        usuario: usuario || "desconocido",
        fecha: fecha || new Date().toISOString(),
    };

    if (!gasto.concepto || gasto.monto <= 0) {
        throw new Error("Concepto y monto (mayor a 0) son obligatorios");
    }

    gastos.push(gasto);
    await store.guardar();
    return gasto;
}

export async function eliminarGasto(id) {
    const index = gastos.findIndex((g) => g.id === id);
    if (index !== -1) gastos.splice(index, 1);
    await store.guardar();
}

// Suma total de gastos, opcionalmente filtrados por período "YYYY-MM"
export function totalGastos(periodo = null) {
    return gastos
        .filter((g) => !periodo || g.fecha.startsWith(periodo))
        .reduce((acc, g) => acc + g.monto, 0);
}

export function gastosPorCategoria(periodo = null) {
    const resumen = {};
    gastos
        .filter((g) => !periodo || g.fecha.startsWith(periodo))
        .forEach((g) => {
            if (!resumen[g.categoria]) resumen[g.categoria] = { cantidad: 0, total: 0 };
            resumen[g.categoria].cantidad += 1;
            resumen[g.categoria].total += g.monto;
        });
    return resumen;
}
