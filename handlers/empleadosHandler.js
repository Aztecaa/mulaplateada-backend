// handlers/empleadosHandler.js
// Registro de empleados y su valor por hora (usado para calcular lo que se les debe)
import { createArrayStore, generarId } from "../utils/jsonStore.js";

const store = createArrayStore("empleados.json");
export const empleados = store.items;

export const cargarEmpleadosIniciales = store.cargar;

export async function agregarEmpleado({ nombre, valorHora }) {
    nombre = String(nombre || "").trim();
    valorHora = Number(valorHora) || 0;

    if (!nombre || valorHora <= 0) {
        throw new Error("Nombre y valor hora (mayor a 0) son obligatorios");
    }

    const empleado = {
        id: generarId(),
        nombre,
        valorHora,
        activo: true,
    };

    empleados.push(empleado);
    await store.guardar();
    return empleado;
}

export async function editarEmpleado({ id, nombre, valorHora, activo }) {
    const empleado = empleados.find((e) => e.id === id);
    if (!empleado) throw new Error("Empleado no encontrado");

    if (nombre !== undefined) empleado.nombre = String(nombre).trim();
    if (valorHora !== undefined) empleado.valorHora = Number(valorHora) || empleado.valorHora;
    if (activo !== undefined) empleado.activo = Boolean(activo);

    await store.guardar();
    return empleado;
}

export async function eliminarEmpleado(id) {
    const index = empleados.findIndex((e) => e.id === id);
    if (index !== -1) empleados.splice(index, 1);
    await store.guardar();
}
