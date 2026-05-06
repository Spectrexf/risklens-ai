import Analysis             from "../models/Analysis.js";
import { PortfolioService } from "../services/portfolio.service.js";
import { OllamaService }    from "../services/ollama.service.js";

export class PortfolioController {

  constructor() {
    this.portfolio = new PortfolioService();
    this.ollama    = new OllamaService();
  }

  buildPrompt(resultado) {
    let lineas = "";
    for (let i = 0; i < resultado.activos.length; i++) {
      const a = resultado.activos[i];
      lineas +=
        "- " + a.empresa + " (" + a.ticker + "): " + a.peso + "% → " +
        a.capitalAsignado + "€, retorno esperado " + a.retornoEsperado +
        "%, volatilidad " + a.volatilidad + "%, beta " + a.beta +
        ", score riesgo " + a.riskScore + "/100\n";
    }

    return "Eres un asesor financiero experto. Explica en español (máximo 180 palabras) " +
      "por qué esta distribución de cartera es óptima según el modelo estocástico binomial " +
      "con cadenas de Markov. Menciona el ratio Sharpe y el balance riesgo/retorno.\n\n" +
      "Capital total: " + resultado.capital + "€\n" +
      "Retorno esperado anual: " + resultado.retornoEsperadoAnual + "%\n" +
      "Riesgo anual: " + resultado.riesgoAnual + "%\n" +
      "Ratio Sharpe: " + resultado.sharpe + "\n\n" +
      "Distribución óptima:\n" + lineas;
  }

  async optimizar(req, res) {
    try {
      const ids     = req.body.ids;
      const capital = req.body.capital || 10000;

      if (!ids || !Array.isArray(ids) || ids.length < 2)
        return res.status(400).json({ ok: false, error: "Mínimo 2 empresas requeridas" });

      if (ids.length > 10)
        return res.status(400).json({ ok: false, error: "Máximo 10 empresas" });

      if (capital <= 0)
        return res.status(400).json({ ok: false, error: "Capital debe ser mayor que 0" });

      const analyses = await Analysis.find({
        _id:    { $in: ids },
        userId: req.userId
      });

      if (analyses.length < 2)
        return res.status(400).json({ ok: false, error: "No se encontraron suficientes análisis" });

      const resultado = await this.portfolio.analizar(analyses, capital);

      let explicacion = "";
      try {
        explicacion = await this.ollama.generate(this.buildPrompt(resultado));
      } catch (err) {
        console.warn("⚠️ Ollama no disponible:", err.message);
        explicacion =
          "Cartera optimizada con modelo estocástico binomial y cadenas de Markov. " +
          "Retorno esperado " + resultado.retornoEsperadoAnual + "% anual, " +
          "riesgo " + resultado.riesgoAnual + "%, ratio Sharpe " + resultado.sharpe + ".";
      }

      res.json({ ...resultado, explicacion });

    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}