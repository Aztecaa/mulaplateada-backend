// handlers/cierresHandler.js
// "Fotos" guardadas del resumen financiero de un mes puntual, para que el
// empleador pueda revisar rendimientos guardados mes a mes aunque los datos
// originales (ventas/gastos/pagos) sigan creciendo con el tiempo.
import { createArrayStore, generarId } from "../utils/jsonStore.js";
import { calcularResumenPeriodo } from "./resumenHandler.js";

const store = createArrayStore("cierres.json");
export const cierres = store.items;

export const cargarCierresIniciales = store.cargar;

export async function guardarCierre(periodo, usuario) {
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
        throw new Error("Período inválido, formato esperado YYYY-MM");
    }

    const resumen = calcularResumenPeriodo(periodo);

    const existente = cierres.find((c) => c.periodo === periodo);
    const cierre = {
        id: existente ? existente.id : generarId(),
        periodo,
        guardadoEl: new Date().toISOString(),
        guardadoPor: usuario || "desconocido",
        resumen,
    };

    if (existente) {
        Object.assign(existente, cierre);
    } else {
        cierres.push(cierre);
    }

    cierres.sort((a, b) => (a.periodo < b.periodo ? 1 : -1)); // más reciente primero
    await store.guardar();
    return cierre;
}

export async function eliminarCierre(id) {
    const index = cierres.findIndex((c) => c.id === id);
    if (index !== -1) cierres.splice(index, 1);
    await store.guardar();
}
