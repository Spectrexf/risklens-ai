import yahooFinance from "yahoo-finance2";

export class PortfolioService {

  constructor() {
    this.N_SIMULACIONES = 10000;
    this.N_PASOS        = 12;
    this.N_CARTERAS     = 8000;
    this.RF_MENSUAL     = 0.045 / 12;
  }

  // Busca el ticker por nombre de empresa en Yahoo Finance
  async buscarTicker(companyName) {
    try {
      const results = await yahooFinance.search(companyName);
      if (!results || !results.quotes || results.quotes.length === 0)
        return null;

      for (let i = 0; i < results.quotes.length; i++) {
        const q = results.quotes[i];
        if (q.quoteType === "EQUITY" && q.symbol) {
          return q.symbol;
        }
      }
      return null;
    } catch (err) {
      console.warn("⚠️ No se encontró ticker para: " + companyName);
      return null;
    }
  }

  // Descarga precios históricos y calcula retornos reales
  async fetchPreciosHistoricos(ticker) {
  const fechaFin    = new Date();
  const fechaInicio = new Date();
  fechaInicio.setMonth(fechaInicio.getMonth() - 24);

  const result = await yahooFinance.chart(ticker, {
    period1:  fechaInicio.toISOString().split("T")[0],
    period2:  fechaFin.toISOString().split("T")[0],
    interval: "1mo"
  });

  const quotes = result.quotes || [];
  if (quotes.length < 6)
    throw new Error("Datos insuficientes para " + ticker);

  const precios = [];
  for (let i = 0; i < quotes.length; i++) {
    const p = quotes[i].adjclose || quotes[i].close;
    if (p != null) precios.push(p);
  }

  return precios;
}

  // Calcula retornos mensuales a partir de precios
  calcRetornos(precios) {
    const retornos = [];
    for (let i = 1; i < precios.length; i++) {
      retornos.push((precios[i] - precios[i - 1]) / precios[i - 1]);
    }
    return retornos;
  }

  calcMedia(arr) {
    let suma = 0;
    for (let i = 0; i < arr.length; i++) suma += arr[i];
    return suma / arr.length;
  }

  calcDesviacion(arr, media) {
    let suma = 0;
    for (let i = 0; i < arr.length; i++) {
      suma += (arr[i] - media) * (arr[i] - media);
    }
    return Math.sqrt(suma / arr.length);
  }

  // Obtiene datos fundamentales de Yahoo Finance
  async fetchDatosFundamentales(ticker) {
    try {
      const quote = await yahooFinance.quote(ticker);
      return {
        beta:             quote.beta             || 1,
        peRatio:          quote.trailingPE       || null,
        marketCap:        quote.marketCap        || null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow:  quote.fiftyTwoWeekLow  || null,
        precioActual:     quote.regularMarketPrice || null
      };
    } catch (err) {
      console.warn("⚠️ No se pudieron obtener fundamentales de " + ticker);
      return { beta: 1, peRatio: null, marketCap: null, precioActual: null };
    }
  }

  // Construye la matriz de transición de Markov
  // P(subida | estado anterior)
  buildMarkovMatrix(retornos) {
    let subidaDadoSubida = 0;
    let bajadaDadoSubida = 0;
    let subidaDadoBajada = 0;
    let bajadaDadoBajada = 0;

    for (let i = 1; i < retornos.length; i++) {
      const anterior = retornos[i - 1] >= 0 ? 1 : 0;
      const actual   = retornos[i]     >= 0 ? 1 : 0;

      if (anterior === 1 && actual === 1) subidaDadoSubida++;
      if (anterior === 1 && actual === 0) bajadaDadoSubida++;
      if (anterior === 0 && actual === 1) subidaDadoBajada++;
      if (anterior === 0 && actual === 0) bajadaDadoBajada++;
    }

    const totalDesdeSubida = subidaDadoSubida + bajadaDadoSubida;
    const totalDesdeBajada = subidaDadoBajada + bajadaDadoBajada;

    const pSubidaDadoSubida = totalDesdeSubida > 0
      ? subidaDadoSubida / totalDesdeSubida
      : 0.55;

    const pSubidaDadoBajada = totalDesdeBajada > 0
      ? subidaDadoBajada / totalDesdeBajada
      : 0.45;

    return { desdeSubida: pSubidaDadoSubida, desdeBajada: pSubidaDadoBajada };
  }

  // Simula N trayectorias con modelo binomial + Markov
  simularEmpresa(retornoMedio, volatilidad, markov) {
    const U = Math.exp(volatilidad);
    const D = 1 / U;

    const pInicial = (retornoMedio + 1 - D) / (U - D);
    const pBase    = Math.max(0.1, Math.min(0.9, pInicial));

    const retornos = new Array(this.N_SIMULACIONES);

    for (let i = 0; i < this.N_SIMULACIONES; i++) {
      let valor  = 1.0;
      let estado = Math.random() < pBase ? 1 : 0;

      for (let t = 0; t < this.N_PASOS; t++) {
        const p = estado === 1
          ? markov.desdeSubida
          : markov.desdeBajada;

        if (Math.random() < p) {
          valor  *= U;
          estado  = 1;
        } else {
          valor  *= D;
          estado  = 0;
        }
      }

      retornos[i] = valor - 1;
    }

    return retornos;
  }

  // Genera pesos aleatorios que sumen 1
  generarPesos(n) {
    const raw  = [];
    let   suma = 0;

    for (let i = 0; i < n; i++) {
      const v = Math.random();
      raw.push(v);
      suma += v;
    }

    const pesos = [];
    for (let i = 0; i < n; i++) {
      pesos.push(raw[i] / suma);
    }
    return pesos;
  }

  // Optimiza cartera maximizando ratio Sharpe
  optimizarCartera(empresas) {
    let mejorSharpe  = -Infinity;
    let mejorPesos   = null;
    let mejorRetorno = 0;
    let mejorRiesgo  = 0;

    for (let k = 0; k < this.N_CARTERAS; k++) {
      const pesos = this.generarPesos(empresas.length);

      let retornoCartera = 0;
      let varianzaCartera = 0;

      for (let i = 0; i < empresas.length; i++) {
        retornoCartera  += pesos[i] * empresas[i].retornoMedio;
        varianzaCartera += (pesos[i] * empresas[i].volatilidad) ** 2;
      }

      const riesgoCartera = Math.sqrt(varianzaCartera);

      const sharpe = riesgoCartera > 0
        ? (retornoCartera - this.RF_MENSUAL) / riesgoCartera
        : 0;

      if (sharpe > mejorSharpe) {
        mejorSharpe  = sharpe;
        mejorPesos   = pesos;
        mejorRetorno = retornoCartera;
        mejorRiesgo  = riesgoCartera;
      }
    }

    return {
      pesos:   mejorPesos,
      retorno: mejorRetorno,
      riesgo:  mejorRiesgo,
      sharpe:  mejorSharpe
    };
  }

  // Función principal — recibe análisis de MongoDB
  async analizar(analyses, capital) {
    const empresas = [];

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const nombre   = analysis.companyName;

      let retornoMedio  = 0;
      let volatilidad   = 0.05;
      let markov        = { desdeSubida: 0.55, desdeBajada: 0.45 };
      let ticker        = null;
      let precioActual  = null;
      let beta          = 1;

      // Intentamos obtener datos reales de Yahoo Finance
      try {
        ticker = await this.buscarTicker(nombre);

        if (ticker) {
          const precios    = await this.fetchPreciosHistoricos(ticker);
          const retornos   = this.calcRetornos(precios);
          retornoMedio     = this.calcMedia(retornos);
          volatilidad      = this.calcDesviacion(retornos, retornoMedio);
          markov           = this.buildMarkovMatrix(retornos);

          const fundamentales = await this.fetchDatosFundamentales(ticker);
          beta         = fundamentales.beta;
          precioActual = fundamentales.precioActual;

          console.log("✅ Datos Yahoo Finance para: " + nombre + " (" + ticker + ")");
        }
      } catch (err) {
        console.warn("⚠️ Usando datos del sistema para: " + nombre);
      }

      // Si no hay datos de Yahoo, usamos los ratios del sistema como fallback
      if (retornoMedio === 0 && analysis.ratios) {
        const score      = analysis.ratios.riskScore || 50;
        retornoMedio     = (score / 100) * 0.02 - 0.005;
        volatilidad      = 0.03 + ((100 - score) / 100) * 0.04;
        markov.desdeSubida = 0.45 + (score / 100) * 0.2;
        markov.desdeBajada = 0.35 + (score / 100) * 0.15;
      }

      // Corremos simulación binomial + Markov
      const simulaciones = this.simularEmpresa(retornoMedio, volatilidad, markov);
      const retornoSim   = this.calcMedia(simulaciones);
      const riesgoSim    = this.calcDesviacion(simulaciones, retornoSim);

      empresas.push({
        id:           analysis._id,
        nombre,
        ticker:       ticker || "N/A",
        precioActual: precioActual || null,
        beta,
        retornoMedio: retornoSim,
        volatilidad:  riesgoSim,
        riskScore:    analysis.ratios.riskScore || 50
      });
    }

    const optima = this.optimizarCartera(empresas);

    const activos = [];

    for (let i = 0; i < empresas.length; i++) {
      const peso            = optima.pesos[i];
      const capitalAsignado = Math.round(capital * peso * 100) / 100;

      activos.push({
        id:              empresas[i].id,
        empresa:         empresas[i].nombre,
        ticker:          empresas[i].ticker,
        precioActual:    empresas[i].precioActual,
        beta:            Math.round(empresas[i].beta * 100) / 100,
        peso:            Math.round(peso * 1000) / 10,
        capitalAsignado,
        retornoEsperado: Math.round(empresas[i].retornoMedio * 1000) / 10,
        volatilidad:     Math.round(empresas[i].volatilidad * 1000) / 10,
        riskScore:       empresas[i].riskScore
      });
    }

    return {
      ok:                   true,
      capital,
      retornoEsperadoAnual: Math.round(optima.retorno * 12 * 1000) / 10,
      riesgoAnual:          Math.round(optima.riesgo * Math.sqrt(12) * 1000) / 10,
      sharpe:               Math.round(optima.sharpe * 100) / 100,
      activos
    };
  }
}