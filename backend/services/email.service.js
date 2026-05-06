import { Resend } from "resend";
import { ENV } from "../config/env.js";

export class EmailService {
    constructor() {
        this.resend = new Resend(ENV.RESEND_API_KEY);
    }
    async sendPasswordReset(email, token) {
        const url = "http://localhost:3001/reset-password.html?token=" + token;
        
        await this.resend.emails.send({
            from: "RiskLens AI <onboarding@resend.dev>",
            to: email,
            subject: "Recuperación de contraseña — RiskLens AI",
            html:
            "<div style='font-family:sans-serif;max-width:480px;margin:0 auto'>" +
            "<h2 style='color:#0d1117'>RiskLens AI</h2>" +
            "<p>Has solicitado restablecer tu contraseña.</p>" +
            "<p>Haz clic en el botón para crear una nueva contraseña. El enlace expira en <strong>15 minutos</strong>.</p>" +
            "<a href='" +
            url +
            "' style='display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;font-weight:600'>Restablecer contraseña</a>" +
            "<p style='color:#6b7280;font-size:12px;margin-top:24px'>Si no solicitaste esto ignora este email.</p>" +
            "</div>",
        });
    }
}
