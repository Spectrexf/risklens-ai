import Analysis              from "../models/Analysis.js";
import { OllamaService }     from "../services/ollama.service.js";
import { streamAnalysisPdf } from "../services/pdf.service.js";

export class AnalysisController {

  constructor() {
    this.ollama = new OllamaService();
  }

  calcRatios(input) {
    const currentAssets      = input.currentAssets      || 0;
    const currentLiabilities = input.currentLiabilities || 0;
    const totalDebt          = input.totalDebt          || 0;
    const equity             = input.equity             || 0;
    const netIncome          = input.netIncome          || 0;
    const revenue            = input.revenue            || 0;
    const totalAssets        = input.totalAssets        || 0;

    let liquidityRatio = null;
    let debtToEquity   = null;
    let roe            = null;
    let netMargin      = null;
    let roa            = null;

    if (currentLiabilities > 0) liquidityRatio = currentAssets / currentLiabilities;
    if (equity > 0)             debtToEquity   = totalDebt / equity;
    if (equity > 0)             roe            = netIncome / equity;
    if (revenue > 0)            netMargin      = netIncome / revenue;
    if (totalAssets > 0)        roa            = netIncome / totalAssets;

    let score = 50;

    if (liquidityRatio !== null) {
      if (liquidityRatio >= 1.5) score += 15;
      else if (liquidityRatio >= 1) score += 5;
      else score -= 15;
    }

    if (debtToEquity !== null) {
      if (debtToEquity <= 0.5) score += 15;
      else if (debtToEquity <= 1) score += 5;
      else score -= 15;
    }

    if (roe !== null) {
      if (roe >= 0.15) score += 10;
      else if (roe >= 0) score += 3;
      else score -= 10;
    }

    if (netMargin !== null) {
      if (netMargin >= 0.1) score += 10;
      else if (netMargin >= 0) score += 3;
      else score -= 10;
    }

    if (score < 0)   score = 0;
    if (score > 100) score = 100;
    score = Math.round(score);

    return { liquidityRatio, debtToEquity, roe, netMargin, roa, riskScore: score };
  }

  buildPrompt(companyName, ratios) {
  let roeText    = ratios.roe            != null ? (ratios.roe * 100).toFixed(1) + "%"    : "N/A";
  let marginText = ratios.netMargin      != null ? (ratios.netMargin * 100).toFixed(1) + "%" : "N/A";
  let roaText    = ratios.roa            != null ? (ratios.roa * 100).toFixed(1) + "%"    : "N/A";
  let liquidText = ratios.liquidityRatio != null ? ratios.liquidityRatio.toFixed(2)        : "N/A";
  let debtText   = ratios.debtToEquity   != null ? ratios.debtToEquity.toFixed(2)          : "N/A";

  return "Eres un analista financiero senior. Genera un informe PROFESIONAL y DETALLADO en español para \"" + companyName + "\".\n\n" +
    "DATOS FINANCIEROS:\n" +
    "- Score de riesgo: " + ratios.riskScore + "/100\n" +
    "- Ratio de liquidez: " + liquidText + " (>1.5 saludable, <1 riesgo)\n" +
    "- Deuda/Patrimonio: " + debtText + " (<0.5 conservador, >1 agresivo)\n" +
    "- ROE: " + roeText + " (>15% excelente)\n" +
    "- Margen neto: " + marginText + " (>10% bueno)\n" +
    "- ROA: " + roaText + "\n\n" +
    "ESTRUCTURA OBLIGATORIA (5 secciones):\n\n" +
    "1. RESUMEN EJECUTIVO\n" +
    "   - Perfil general de la empresa y situación financiera actual\n" +
    "   - Recomendación inicial en esta sección\n\n" +
    "2. ANÁLISIS DE LIQUIDEZ Y SOLVENCIA\n" +
    "   - Interpreta el ratio de liquidez: ¿puede hacer frente a sus obligaciones a corto plazo?\n" +
    "   - Evalúa el nivel de endeudamiento y su impacto en la estabilidad financiera\n\n" +
    "3. ANÁLISIS DE RENTABILIDAD\n" +
    "   - Interpreta ROE, ROA y margen neto en contexto sectorial\n" +
    "   - ¿Genera valor para el accionista? ¿Es eficiente en el uso de activos?\n\n" +
    "4. RIESGOS Y FORTALEZAS\n" +
    "   - Identifica las 2-3 fortalezas principales basándote en los datos\n" +
    "   - Identifica los 2-3 riesgos principales o puntos de mejora\n\n" +
    "5. CONCLUSIÓN Y RECOMENDACIÓN\n" +
    "   - Nivel de riesgo: Bajo / Medio / Alto\n" +
    "   - Recomendación clara con justificación basada en los datos\n" +
    "   - Horizonte temporal sugerido\n\n" +
    "FORMATO: Profesional, denso, sin relleno. Máximo 300 palabras. Usa los datos reales.";
}

  async list(req, res) {
    try {
      const items = await Analysis
        .find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(50);
      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async create(req, res) {
    try {
      const companyName = req.body.companyName;
      const inputData   = req.body.inputData;

      if (!companyName || !inputData)
        return res.status(400).json({ ok: false, error: "companyName e inputData requeridos" });

      if (req.plan === 'free') {
        const count = await Analysis.countDocuments({ userId: req.userId });
        if (count >= 5) {
          return res.status(403).json({
            ok:    false,
            error: "Has alcanzado el límite de 5 análisis del plan Free. Actualiza a Premium para continuar."
          });
        }
      }

      const ratios = this.calcRatios(inputData);

      let aiReport;
      try {
        aiReport = await this.ollama.generate(this.buildPrompt(companyName, ratios));
      } catch (err) {
        console.warn("⚠️  Ollama no disponible:", err.message);

        let roeText    = "N/A";
        let marginText = "N/A";
        let liquidText = "N/A";
        let debtText   = "N/A";

        if (ratios.roe            != null) roeText    = (ratios.roe * 100).toFixed(1) + "%";
        if (ratios.netMargin      != null) marginText = (ratios.netMargin * 100).toFixed(1) + "%";
        if (ratios.liquidityRatio != null) liquidText = ratios.liquidityRatio.toFixed(2);
        if (ratios.debtToEquity   != null) debtText   = ratios.debtToEquity.toFixed(2);

        aiReport =
          "Análisis de " + companyName + ": Score " + ratios.riskScore + "/100. " +
          "Liquidez: " + liquidText + ". " +
          "Deuda/Patrimonio: " + debtText + ". " +
          "ROE: " + roeText + ". " +
          "Margen: " + marginText + ".";
      }

      const analysis = await Analysis.create({
        userId: req.userId,
        companyName,
        inputData,
        ratios,
        aiReport
      });

      res.status(201).json({ ok: true, analysis });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async pdf(req, res) {
    try {
      const analysis = await Analysis.findOne({
        _id:    req.params.id,
        userId: req.userId
      });

      if (!analysis)
        return res.status(404).json({ ok: false, error: "Análisis no encontrado" });

      streamAnalysisPdf(res, analysis);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }
}