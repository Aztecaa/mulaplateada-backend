// handlers/pagosHandler.js
// Pagos EFECTIVAMENTE realizados a empleados (adelantos, sueldos, etc).
// El saldo pendiente de un empleado = totalGeneradoPorEmpleado() - totalPagadoAEmpleado()
import { createArrayStore, generarId } from "../utils/jsonStore.js";
import { empleados } from "./empleadosHandler.js";

const store = createArrayStore("pagos.json");
export const pagos = store.items;

export const cargarPagosIniciales = store.cargar;

export async function registrarPago({ empleadoId, monto, fecha, nota }) {
    const empleado = empleados.find((e) => e.id === empleadoId);
    if (!empleado) throw new Error("Empleado no encontrado");

    monto = Number(monto) || 0;
    if (monto <= 0) throw new Error("El monto debe ser mayor a 0");

    const pago = {
        id: generarId(),
        empleadoId,
        empleadoNombre: empleado.nombre,
        monto,
        fecha: fecha || new Date().toISOString(),
        nota: nota || "",
    };

    pagos.push(pago);
    await store.guardar();
    return pago;
}

export async function eliminarPago(id) {
    const index = pagos.findIndex((p) => p.id === id);
    if (index !== -1) pagos.splice(index, 1);
    await store.guardar();
}

export function totalPagadoAEmpleado(empleadoId, periodo = null) {
    return pagos
        .filter((p) => p.empleadoId === empleadoId && (!periodo || p.fecha.startsWith(periodo)))
        .reduce((acc, p) => acc + p.monto, 0);
}

export function totalPagos(periodo = null) {
    return pagos
        .filter((p) => !periodo || p.fecha.startsWith(periodo))
        .reduce((acc, p) => acc + p.monto, 0);
}
