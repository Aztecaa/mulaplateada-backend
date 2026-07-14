// routes/productos.js
import express from "express";
const router = express.Router();

let productos = [];

router.get("/", (req, res) => {
    res.json(productos);
});

// agregar producto (solo unidades sueltas)
router.post("/", (req, res) => {
    let {
        codigo = "",
        nombre = "",
        precio = 0,
        cantidad = 0,
    } = req.body;

    if (!codigo || !nombre) {
        return res.status(400).json({ ok: false, msg: "Faltan datos obligatorios" });
    }

    cantidad = Number(cantidad) || 0;
    precio = Number(precio) || 0;

    // Buscar si ya existe
    let existente = productos.find((p) => p.codigo === codigo);

    if (existente) {
        // Si existe, solo sumamos unidades y actualizamos precio
        existente.cantidad += cantidad;
        existente.precio = precio;
    } else {
        // Si no existe, lo agregamos
        productos.push({
            codigo,
            nombre,
            precio,
            cantidad,
        });
    }

    // Emitir actualización por socket si existe io en el request
    if (req.io) req.io.emit("stockActualizado", productos);

    res.json({ ok: true, productos });
});

export { productos };
export default router;