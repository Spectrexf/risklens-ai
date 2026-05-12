import Post from "../models/Post.js";
import sanitizeHtml from "sanitize-html";

export class PostController {

  async list(req, res) {
    try {
      const filter = req.role === "admin" ? {} : { publicado: true };
      const items = await Post.find(filter).sort({ createdAt: -1 });

      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async create(req, res) {
    try {
      if (req.role !== "admin")
        return res.status(403).json({ ok: false, error: "Acceso denegado" });

      const titulo = sanitizeHtml(req.body.titulo || "", {
        allowedTags: [],
        allowedAttributes: {}
      });

      const contenido = sanitizeHtml(req.body.contenido || "", {
        allowedTags: [],
        allowedAttributes: {}
      });

      const imagen = req.body.imagen || null;

      if (!titulo || !contenido)
        return res.status(400).json({
          ok: false,
          error: "Título y contenido requeridos"
        });

      const publicado = req.body.publicado === true;

      const post = await Post.create({
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        imagen,
        autorId: req.userId,
        publicado
      });

      res.status(201).json({ ok: true, post });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async togglePublicar(req, res) {
    try {
      if (req.role !== "admin")
        return res.status(403).json({ ok: false, error: "Acceso denegado" });

      const post = await Post.findById(req.params.id);

      if (!post)
        return res.status(404).json({ ok: false, error: "Post no encontrado" });

      post.publicado = !post.publicado;
      await post.save();

      res.json({ ok: true, publicado: post.publicado });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async eliminar(req, res) {
    try {
      if (req.role !== "admin")
        return res.status(403).json({ ok: false, error: "Acceso denegado" });

      await Post.findByIdAndDelete(req.params.id);

      res.json({ ok: true });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async uploadImage(req, res) {
    try {
      if (req.role !== "admin")
        return res.status(403).json({ ok: false, error: "Acceso denegado" });

      if (!req.file)
        return res.status(400).json({
          ok: false,
          error: "No se subió ninguna imagen"
        });

      const url = `http://localhost:3001/uploads/${req.file.filename}`;

      res.json({ ok: true, url });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}
