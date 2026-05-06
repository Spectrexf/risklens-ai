import YahooFinance from "yahoo-finance2";

export class YahooFinanceService {

  constructor() {
    this.yf    = new YahooFinance();
    this.cache = new Map();
    this.ttl   = 24 * 60 * 60 * 1000; // 24 horas
  }

  getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  setCached(key, data) {
    this.cache.set(key, { data, time: Date.now() });
  }

  async buscarTicker(companyName) {
    const results = await this.yf.search(companyName);

    if (!results || !results.quotes || results.quotes.length === 0)
      throw new Error("No se encontró la empresa: " + companyName);

    const equities = [];
    for (let i = 0; i < results.quotes.length; i++) {
      if (results.quotes[i].quoteType === "EQUITY" && results.quotes[i].symbol) {
        equities.push({
          ticker:   results.quotes[i].symbol,
          nombre:   results.quotes[i].longname || results.quotes[i].shortname || companyName,
          exchange: results.quotes[i].exchange || ""
        });
      }
    }

    if (equities.length === 0)
      throw new Error("No se encontraron acciones para: " + companyName);

    return equities.slice(0, 5);
  }

  async fetchPrecios(ticker) {
    const key    = "precios_" + ticker;
    const cached = this.getCached(key);
    if (cached) return cached;

    const fechaFin    = new Date();
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 24);

    const result = await this.yf.chart(ticker, {
      period1:  fechaInicio.toISOString().split("T")[0],
      period2:  fechaFin.toISOString().split("T")[0],
      interval: "1mo"
    });

    const quotes  = result.quotes || [];
    if (quotes.length < 6)
      throw new Error("Datos históricos insuficientes para " + ticker);

    const precios = [];
    for (let i = 0; i < quotes.length; i++) {
      precios.push(quotes[i].adjclose || quotes[i].close);
    }

    this.setCached(key, precios);
    return precios;
  }

  async fetchFundamentales(ticker) {
    const key    = "fundamentales_" + ticker;
    const cached = this.getCached(key);
    if (cached) return cached;

    const quote = await this.yf.quote(ticker);

    const data = {
      nombre:         quote.longName           || quote.shortName || ticker,
      precio:         quote.regularMarketPrice || 0,
      precioAnterior: quote.regularMarketPreviousClose || 0,
      cambio:         quote.regularMarketChangePercent || 0,
      beta:           quote.beta               || 1,
      peRatio:        quote.trailingPE         || null,
      pbRatio:        quote.priceToBook        || null,
      eps:            quote.trailingEps        || null,
      marketCap:      quote.marketCap          || null,
      dividendo:      quote.dividendYield      || null,
      semanaAlta:     quote.fiftyTwoWeekHigh   || null,
      semanaBaja:     quote.fiftyTwoWeekLow    || null,
      volumen:        quote.regularMarketVolume || null,
      volumenMedio:   quote.averageDailyVolume3Month || null,
      sector:         quote.sector             || null,
      industria:      quote.industry           || null
    };

    this.setCached(key, data);
    return data;
  }

  async fetchResumenFinanciero(ticker) {
    const key    = "resumen_" + ticker;
    const cached = this.getCached(key);
    if (cached) return cached;

    try {
      const summary = await this.yf.quoteSummary(ticker, {
        modules: ["financialData", "defaultKeyStatistics"]
      });

      const fin = summary.financialData       || {};
      const kst = summary.defaultKeyStatistics || {};

      const data = {
        ingresos:        fin.totalRevenue      || null,
        ebitda:          fin.ebitda            || null,
        margenBruto:     fin.grossMargins      || null,
        margenOperativo: fin.operatingMargins  || null,
        margenNeto:      fin.profitMargins     || null,
        roe:             fin.returnOnEquity    || null,
        roa:             fin.returnOnAssets    || null,
        deudaEquity:     fin.debtToEquity      || null,
        freeCashFlow:    fin.freeCashflow      || null,
        currentRatio:    fin.currentRatio      || null,
        recomendacion:   fin.recommendationKey || null,
        precioObjetivo:  fin.targetMeanPrice   || null,
        beta:            kst.beta              || null,
        per:             kst.trailingPE        || null,
        peg:             kst.pegRatio          || null,
        bookValue:       kst.bookValue         || null,
        shortFloat:      kst.shortPercentOfFloat || null
      };

      this.setCached(key, data);
      return data;
    } catch (err) {
      console.warn("⚠️ No se pudo obtener resumen financiero:", err.message);
      return {};
    }
  }
}