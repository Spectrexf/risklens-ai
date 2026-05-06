import jwt     from "jsonwebtoken";
import { ENV } from "../config/env.js";

export class AuthMiddleware {

  static verify(req, res, next) {
    const auth  = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Token requerido" });
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      req.userId    = decoded.userId;
      req.role      = decoded.role;
      req.plan      = decoded.plan;
      next();
    } catch (err) {
      return res.status(401).json({ ok: false, error: "Token inválido o expirado" });
    }
  }
}