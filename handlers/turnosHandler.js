// handlers/turnosHandler.js
// Registro de horas trabajadas por empleado. Cada turno "genera" un monto
// (horas * valorHora del empleado AL MOMENTO de cargarlo, para no alterar
// retroactivamente lo generado si después se le cambia el valor hora).
import { createArrayStore, generarId } from "../utils/jsonStore.js";
import { empleados } from "./empleadosHandler.js";

const store = createArrayStore("turnos.json");
export const turnos = store.items;

export const cargarTurnosIniciales = store.cargar;

export async function registrarTurno({ empleadoId, horas, fecha, nota }) {
    const empleado = empleados.find((e) => e.id === empleadoId);
    if (!empleado) throw new Error("Empleado no encontrado");

    horas = Number(horas) || 0;
    if (horas <= 0) throw new Error("Las horas deben ser mayores a 0");

    const turno = {
        id: generarId(),
        empleadoId,
        empleadoNombre: empleado.nombre,
        horas,
        valorHora: empleado.valorHora, // snapshot
        montoGenerado: Number((horas * empleado.valorHora).toFixed(2)),
        fecha: fecha || new Date().toISOString(),
        nota: nota || "",
    };

    turnos.push(turno);
    await store.guardar();
    return turno;
}

export async function eliminarTurno(id) {
    const index = turnos.findIndex((t) => t.id === id);
    if (index !== -1) turnos.splice(index, 1);
    await store.guardar();
}

// Total generado (a pagar) por un empleado, opcionalmente por período "YYYY-MM"
export function totalGeneradoPorEmpleado(empleadoId, periodo = null) {
    return turnos
        .filter((t) => t.empleadoId === empleadoId && (!periodo || t.fecha.startsWith(periodo)))
        .reduce((acc, t) => acc + t.montoGenerado, 0);
}
