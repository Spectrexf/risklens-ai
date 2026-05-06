import { RssService } from "../services/rss.service.js";

export class NewsController {

  constructor() {
    this.rss = new RssService();
  }

  async list(req, res) {
    try {
      const items = await this.rss.fetchNews();
      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}