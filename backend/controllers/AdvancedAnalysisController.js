import { YahooFinanceService } from "../services/yahooFinance.service.js";
import { QuantAnalysisService } from "../services/quantAnalysis.service.js";
import { OllamaService }        from "../services/ollama.service.js";
import Analysis                 from "../models/Analysis.js";
import { streamAnalysisPdf }    from "../services/pdf.service.js";

export class AdvancedAnalysisController {

  constructor() {
    this.yahoo  = new YahooFinanceService();
    this.quant  = new QuantAnalysisService();
    this.ollama = new OllamaService();
  }

  async search(req, res) {
    try {
      const query = req.query.q || "";
      if (!query || query.length < 2)
        return res.status(400).json({ ok: false, error: "Introduce al menos 2 caracteres" });

      const resultados = await this.yahoo.buscarTicker(query);
      res.json({ ok: true, resultados });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async analyze(req, res) {
    try {
      const ticker  = req.body.ticker;
      const capital = req.body.capital || 10000;

      if (!ticker)
        return res.status(400).json({ ok: false, error: "Ticker requerido" });

      if (req.plan === "free" && req.role !== "admin") {
        const count = await Analysis.countDocuments({ userId: req.userId });
        if (count >= 5) {
          return res.status(403).json({
            ok:    false,
            error: "Has alcanzado el límite de 5 análisis del plan Free. Actualiza a Premium para continuar."
          });
        }
      }

      const [precios, preciosSP500, fundamentales, resumen] = await Promise.all([
        this.yahoo.fetchPrecios(ticker),
        this.yahoo.fetchPrecios("^GSPC"),
        this.yahoo.fetchFundamentales(ticker),
        this.yahoo.fetchResumenFinanciero(ticker)
      ]);

      const retornosMercado = this.quant.calcRetornos(preciosSP500);

      const analisis = this.quant.analizar(
        precios,
        fundamentales,
        resumen,
        retornosMercado,
        capital
      );

      const prompt = this.buildPrompt(ticker, analisis, capital);

      let aiReport = "";
      try {
        aiReport = await this.ollama.generate(prompt);
      } catch (err) {
        console.warn("⚠️ Ollama no disponible:", err.message);
        aiReport = this.fallbackReport(analisis);
      }

      const saved = await Analysis.create({
        userId:      req.userId,
        companyName: fundamentales.nombre || ticker,
        inputData:   { ticker, capital, modo: "automatico" },
        ratios: {
          riskScore:      this.calcRiskScore(analisis),
          liquidityRatio: resumen.currentRatio || null,
          debtToEquity:   resumen.deudaEquity  != null ? resumen.deudaEquity / 100 : null,
          roe:            resumen.roe           || null,
          netMargin:      resumen.margenNeto    || null,
          sharpe:         analisis.sharpe,
          beta:           analisis.beta,
          drawdown:       analisis.drawdown,
          var95:          analisis.varPct95
        },
        aiReport,
        analisisAvanzado: analisis
      });

      res.json({ ok: true, analysis: saved, analisis, aiReport });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  calcRiskScore(analisis) {
    let score = 50;

    if (analisis.sharpe >= 1.5)        score += 20;
    else if (analisis.sharpe >= 1)     score += 15;
    else if (analisis.sharpe >= 0.5)   score += 8;
    else if (analisis.sharpe >= 0)     score += 2;
    else if (analisis.sharpe < 0)      score -= 15;

    if (analisis.beta <= 0.6)          score += 12;
    else if (analisis.beta <= 1.0)     score += 7;
    else if (analisis.beta <= 1.5)     score += 2;
    else if (analisis.beta > 2)        score -= 15;
    else                               score -= 8;

    if (analisis.drawdown <= 0.10)      score += 12;
    else if (analisis.drawdown <= 0.20) score += 6;
    else if (analisis.drawdown <= 0.30) score += 2;
    else if (analisis.drawdown > 0.40)  score -= 15;
    else                                score -= 8;

    if (analisis.retornoAnual >= 20)      score += 10;
    else if (analisis.retornoAnual >= 10) score += 6;
    else if (analisis.retornoAnual >= 0)  score += 2;
    else                                   score -= 10;

    const r = analisis.resumen || {};

    if (r.margenNeto != null) {
      if (r.margenNeto >= 0.20)      score += 8;
      else if (r.margenNeto >= 0.10) score += 4;
      else if (r.margenNeto < 0)     score -= 8;
    }

    if (r.roe != null) {
      if (r.roe >= 0.20)      score += 6;
      else if (r.roe >= 0.10) score += 3;
      else if (r.roe < 0)     score -= 6;
    }

    if (r.deudaEquity != null) {
      if (r.deudaEquity <= 50)       score += 4;
      else if (r.deudaEquity <= 150) score += 2;
      else if (r.deudaEquity > 300)  score -= 6;
    }

    if (r.freeCashFlow != null) {
      if (r.freeCashFlow > 0) score += 4;
      else                    score -= 4;
    }

    if (score < 0)   score = 0;
    if (score > 100) score = 100;
    return Math.round(score);
  }

  buildPrompt(ticker, a, capital) {
    const f  = a.fundamentales;
    const r  = a.resumen;
    const mc = a.monteCarlo;
    const w  = a.wyckoff;

    const fmt = function(v, dec, suf) {
      if (v === null || v === undefined) return "N/A";
      return Number(v).toFixed(dec || 2) + (suf || "");
    };

    return "Eres un analista cuantitativo senior de Goldman Sachs con 20 años de experiencia en renta variable y gestión de riesgo institucional. " +
      "Redacta un research report profesional en español para " + (f.nombre || ticker) + " (" + ticker + ") " +
      "dirigido a inversores institucionales. El informe debe ser denso, técnico y aportar valor analítico real en cada línea. " +
      "Usa los datos proporcionados para justificar cada afirmación. No uses frases genéricas ni relleno. Máximo 500 palabras.\n\n" +

      "═══════════════════════════════════════\n" +
      "DATOS CUANTITATIVOS CALCULADOS\n" +
      "═══════════════════════════════════════\n" +
      "Retorno anual histórico: " + fmt(a.retornoAnual) + "% | Retorno mensual (μ): " + fmt(a.retornoMensual) + "%\n" +
      "Volatilidad anual (σ): " + fmt(a.volatilidadAnual) + "% | Volatilidad mensual: " + fmt(a.volatilidad) + "%\n" +
      "Sharpe Ratio: " + fmt(a.sharpe) + " | Sortino Ratio: " + fmt(a.sortino) + "\n" +
      "Beta vs S&P500: " + fmt(a.beta) + " | Alpha: " + fmt(a.alpha) + "% | CAPM esperado: " + fmt(a.retornoCAPM) + "%\n" +
      "Drawdown máximo: " + fmt(a.drawdown) + "% | VaR 95%: " + fmt(a.varPct95) + "% | VaR 99%: " + fmt(a.varPct99) + "%\n\n" +

      "═══════════════════════════════════════\n" +
      "SIMULACIÓN MONTE CARLO (" + capital + "€, 10.000 trayectorias, 12 meses)\n" +
      "═══════════════════════════════════════\n" +
      "Escenario muy pesimista (P5):  " + mc.percentil5  + "€\n" +
      "Escenario pesimista (P25):     " + mc.percentil25 + "€\n" +
      "Escenario base (P50):          " + mc.percentil50 + "€\n" +
      "Escenario optimista (P75):     " + mc.percentil75 + "€\n" +
      "Escenario muy optimista (P95): " + mc.percentil95 + "€\n" +
      "Probabilidad de ganancia: " + mc.probGanancia + "% | Probabilidad de pérdida: " + mc.probPerdida + "%\n\n" +

      "═══════════════════════════════════════\n" +
      "ANÁLISIS TÉCNICO WYCKOFF\n" +
      "═══════════════════════════════════════\n" +
      "Fase: " + w.fase + " | Tendencia reciente: " + w.tendencia + "% | Posición en rango: " + w.posicion + "%\n" +
      "Interpretación: " + w.descripcion + "\n\n" +

      "═══════════════════════════════════════\n" +
      "DATOS FUNDAMENTALES\n" +
      "═══════════════════════════════════════\n" +
      "Precio: " + fmt(f.precio) + "$ | Rango 52s: " + fmt(f.semanaBaja) + "$–" + fmt(f.semanaAlta) + "$\n" +
      "Market Cap: " + (f.marketCap ? (f.marketCap / 1e9).toFixed(2) + "B$" : "N/A") + " | Sector: " + (f.sector || "N/A") + " | Industria: " + (f.industria || "N/A") + "\n" +
      "P/E: " + fmt(f.peRatio) + " | P/B: " + fmt(f.pbRatio) + " | PEG: " + fmt(r.peg) + " | EPS: " + fmt(f.eps) + "$\n" +
      "Margen bruto: " + fmt(r.margenBruto, 1, "%") + " | Margen operativo: " + fmt(r.margenOperativo, 1, "%") + " | Margen neto: " + fmt(r.margenNeto, 1, "%") + "\n" +
      "ROE: " + (r.roe ? (r.roe * 100).toFixed(1) + "%" : "N/A") + " | ROA: " + (r.roa ? (r.roa * 100).toFixed(1) + "%" : "N/A") + "\n" +
      "FCF: " + (r.freeCashFlow ? (r.freeCashFlow / 1e9).toFixed(2) + "B$" : "N/A") + " | Deuda/Equity: " + fmt(r.deudaEquity) + " | Current Ratio: " + fmt(r.currentRatio) + "\n" +
      "Ingresos: " + (r.ingresos ? (r.ingresos / 1e9).toFixed(2) + "B$" : "N/A") + " | EBITDA: " + (r.ebitda ? (r.ebitda / 1e9).toFixed(2) + "B$" : "N/A") + "\n" +
      "Precio objetivo analistas: " + fmt(r.precioObjetivo) + "$ | Consenso: " + (r.recomendacion || "N/A").toUpperCase() + "\n" +
      "Dividendo: " + fmt(f.dividendo, 2, "%") + " | Beta fundamental: " + fmt(f.beta) + "\n\n" +

      "═══════════════════════════════════════\n" +
      "INSTRUCCIONES DEL INFORME\n" +
      "═══════════════════════════════════════\n" +
      "Estructura OBLIGATORIA con exactamente estas 5 secciones numeradas:\n\n" +

      "**1. RESUMEN EJECUTIVO**\n" +
      "- Perfil riesgo/retorno en 3-4 líneas con datos concretos\n" +
      "- Recomendación inicial BUY/HOLD/SELL con justificación basada en los datos\n" +
      "- Nivel de convicción: Alto / Medio / Bajo\n\n" +

      "**2. ANÁLISIS CUANTITATIVO**\n" +
      "- Interpreta el Sharpe y Sortino: ¿compensa el riesgo asumido?\n" +
      "- Beta: ¿activo defensivo o agresivo respecto al mercado?\n" +
      "- Alpha y CAPM: ¿genera valor por encima del riesgo sistemático?\n" +
      "- Drawdown máximo: contexto e implicaciones para el inversor\n\n" +

      "**3. MONTE CARLO Y GESTIÓN DE RIESGO**\n" +
      "- Interpreta la distribución de los 10.000 escenarios a 12 meses\n" +
      "- Asimetría entre escenarios alcistas y bajistas\n" +
      "- VaR 95% y 99%: implicaciones prácticas para una cartera de " + capital + "€\n" +
      "- Stress test: impacto estimado si el mercado cae un 20%\n\n" +

      "**4. ANÁLISIS FUNDAMENTAL Y TÉCNICO**\n" +
      "- Calidad del negocio: márgenes, ROE, FCF — ¿es un negocio eficiente?\n" +
      "- Valoración relativa: P/E, PEG, P/B — ¿está caro o barato vs sector?\n" +
      "- Solidez del balance: deuda, liquidez, cobertura\n" +
      "- Wyckoff: fase exacta, implicaciones para el timing de entrada\n" +
      "- Potencial vs precio objetivo de analistas (" + fmt(r.precioObjetivo) + "$)\n\n" +

      "**5. CONCLUSIÓN Y RECOMENDACIÓN**\n" +
      "- Recomendación final: BUY / HOLD / SELL\n" +
      "- Horizonte temporal recomendado\n" +
      "- Escenario ALCISTA: catalizadores específicos y precio objetivo\n" +
      "- Escenario NEUTRAL: rango esperado de cotización\n" +
      "- Escenario BAJISTA: riesgos principales y stop loss sugerido\n" +
      "- Nivel de convicción final con justificación\n";
  }

  fallbackReport(a) {
    const rec = a.sharpe >= 1 ? "BUY" : a.sharpe >= 0.5 ? "HOLD" : "SELL";
    return "RESUMEN EJECUTIVO: Análisis cuantitativo completado.\n\n" +
      "ANÁLISIS CUANTITATIVO: Sharpe " + a.sharpe +
      ", Sortino " + a.sortino +
      ", Volatilidad anual " + a.volatilidadAnual +
      "%, Drawdown máximo " + a.drawdown + "%.\n\n" +
      "WYCKOFF: " + a.wyckoff.fase + " — " + a.wyckoff.descripcion + "\n\n" +
      "MONTE CARLO: Probabilidad de ganancia " + a.monteCarlo.probGanancia +
      "%, escenario neutral " + a.monteCarlo.percentil50 + "€.\n\n" +
      "RECOMENDACIÓN: " + rec + " — Horizonte 12 meses.";
  }
}