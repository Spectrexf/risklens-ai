import Suggestion from "../models/Suggestion.js";
import User from "../models/User.js";
import sanitizeHtml from "sanitize-html";

function cleanText(text) {
  return sanitizeHtml(text || "", {
    allowedTags: [],        // no HTML
    allowedAttributes: {},  // sin atributos
    disallowedTagsMode: "discard"
  });
}

export class SuggestionController {

  async create(req, res) {
    try {
      const texto = cleanText(req.body.texto);

      if (!texto || texto.trim().length < 5)
        return res.status(400).json({
          ok: false,
          error: "La sugerencia es demasiado corta"
        });

      if (texto.length > 1000)
        return res.status(400).json({
          ok: false,
          error: "Máximo 1000 caracteres"
        });

      const user = await User.findById(req.userId);

      if (!user)
        return res.status(404).json({
          ok: false,
          error: "Usuario no encontrado"
        });

      const suggestion = await Suggestion.create({
        userId: req.userId,
        email: user.email,
        texto: texto.trim()
      });

      res.status(201).json({ ok: true, suggestion });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async list(req, res) {
    try {
      if (req.role !== "admin")
        return res.status(403).json({
          ok: false,
          error: "Acceso denegado"
        });

      const items = await Suggestion.find()
        .sort({ createdAt: -1 })
        .limit(100);

      res.json({ ok: true, items });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async marcarLeida(req, res) {
    try {
      if (req.role !== "admin")
        return res.status(403).json({
          ok: false,
          error: "Acceso denegado"
        });

      await Suggestion.findByIdAndUpdate(req.params.id, {
        leida: true
      });

      res.json({ ok: true });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}