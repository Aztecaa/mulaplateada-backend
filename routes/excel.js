import express from "express";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // límite 10MB

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post("/", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Archivo no recibido" });

    const msg = {
        to: /* "superjonas202@gmail.com",*/"aztecaned@gmail.com",
        from: process.env.USER_EMAIL,
        subject: `📘 Reporte Excel - ${req.body.user}`,
        text: `Adjunto el reporte de cierre de caja del ${req.body.fecha}.`,
        attachments: [
            {
                content: req.file.buffer.toString("base64"),
                filename: req.file.originalname,
                type: req.file.mimetype,
                disposition: "attachment",
            },
        ],
    };

    try {
        // Enviar correo sin bloquear respuesta con setImmediate
        setImmediate(async () => {
            try {
                await sgMail.send(msg);
                console.log("✅ Correo enviado correctamente (background)");
            } catch (err) {
                console.error("❌ Error enviando correo:", err.response?.body || err);
            }
        });

        // Responder rápido al cliente
        res.json({ success: true, message: "Correo en proceso de envío" });
    } catch (error) {
        res.status(500).json({
            error: "Error enviando correo",
            details: error.message || error.response?.body,
        });
    }
});

export default router;
