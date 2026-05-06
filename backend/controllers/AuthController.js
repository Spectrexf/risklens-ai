import bcrypt           from "bcrypt";
import jwt              from "jsonwebtoken";
import crypto           from "crypto";
import User             from "../models/User.js";
import ResetToken       from "../models/ResetToken.js";
import { EmailService } from "../services/email.service.js";
import { ENV }          from "../config/env.js";

export class AuthController {

  async register(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.status(400).json({ ok: false, error: "Email y contraseña requeridos" });

      const exists = await User.findOne({ email });
      if (exists)
        return res.status(409).json({ ok: false, error: "El email ya está registrado" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user         = await User.create({ email, passwordHash });

      const token = jwt.sign(
        { userId: user._id, role: user.role, plan: user.plan },
        ENV.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        ok: true,
        token,
        user: { id: user._id, email: user.email, role: user.role, plan: user.plan }
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.status(400).json({ ok: false, error: "Email y contraseña requeridos" });

      const user = await User.findOne({ email });
      if (!user)
        return res.status(401).json({ ok: false, error: "Credenciales incorrectas" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid)
        return res.status(401).json({ ok: false, error: "Credenciales incorrectas" });

      const token = jwt.sign(
        { userId: user._id, role: user.role, plan: user.plan },
        ENV.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        ok: true,
        token,
        user: { id: user._id, email: user.email, role: user.role, plan: user.plan }
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async getMe(req, res) {
    try {
      const user = await User.findById(req.userId).select("-passwordHash");
      if (!user)
        return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

      res.json({ ok: true, user });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async upgradePlan(req, res) {
    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { plan: "premium", subscriptionStatus: "active" },
        { new: true }
      ).select("-passwordHash");

      if (!user)
        return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

      res.json({ ok: true, user });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email)
        return res.status(400).json({ ok: false, error: "Email requerido" });

      const user = await User.findOne({ email });
      if (!user) return res.json({ ok: true });

      const token = crypto.randomBytes(32).toString("hex");

      await ResetToken.deleteMany({ userId: user._id });
      await ResetToken.create({
        userId:    user._id,
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      const emailSvc = new EmailService();
      await emailSvc.sendPasswordReset(email, token);

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password)
        return res.status(400).json({ ok: false, error: "Token y contraseña requeridos" });

      if (password.length < 6)
        return res.status(400).json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" });

      const resetToken = await ResetToken.findOne({ token });
      if (!resetToken || resetToken.expiresAt < new Date())
        return res.status(400).json({ ok: false, error: "Token inválido o expirado" });

      const hash = await bcrypt.hash(password, 10);

      await User.findByIdAndUpdate(resetToken.userId, { passwordHash: hash });
      await ResetToken.deleteMany({ userId: resetToken.userId });

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}