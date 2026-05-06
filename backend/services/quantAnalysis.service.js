export class QuantAnalysisService {
  constructor() {
    this.RF_ANUAL = 0.045;
    this.RF_MENSUAL = 0.045 / 12;
    this.N_SIMULACIONES = 10000;
  }

  // Calcula retornos mensuales
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

  // Sharpe Ratio
  calcSharpe(retornoMensual, volatilidadMensual) {
    if (volatilidadMensual === 0) return 0;
    return (retornoMensual - this.RF_MENSUAL) / volatilidadMensual;
  }

  // Sortino Ratio — solo penaliza la volatilidad negativa
  calcSortino(retornos, retornoMedio) {
    const negativos = [];
    for (let i = 0; i < retornos.length; i++) {
      if (retornos[i] < this.RF_MENSUAL) {
        negativos.push(
          (retornos[i] - this.RF_MENSUAL) * (retornos[i] - this.RF_MENSUAL),
        );
      }
    }
    if (negativos.length === 0) return 999;
    let suma = 0;
    for (let i = 0; i < negativos.length; i++) suma += negativos[i];
    const downside = Math.sqrt(suma / retornos.length);
    if (downside === 0) return 0;
    return (retornoMedio - this.RF_MENSUAL) / downside;
  }

  // Máximo drawdown
  calcDrawdown(precios) {
    let maxPrecio = precios[0];
    let maxDrawdown = 0;

    for (let i = 1; i < precios.length; i++) {
      if (precios[i] > maxPrecio) maxPrecio = precios[i];
      const dd = (maxPrecio - precios[i]) / maxPrecio;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return maxDrawdown;
  }

  // Beta respecto al mercado
  calcBeta(retornosActivo, retornosMercado) {
    const n = Math.min(retornosActivo.length, retornosMercado.length);
    const rA = retornosActivo.slice(-n);
    const rM = retornosMercado.slice(-n);
    const mA = this.calcMedia(rA);
    const mM = this.calcMedia(rM);

    let cov = 0;
    let varM = 0;
    for (let i = 0; i < n; i++) {
      cov += (rA[i] - mA) * (rM[i] - mM);
      varM += (rM[i] - mM) * (rM[i] - mM);
    }

    if (varM === 0) return 1;
    return cov / varM;
  }

  // Alpha (rendimiento extra ajustado al mercado)
  calcAlpha(retornoActivo, beta, retornoMercado) {
    const capm = this.RF_MENSUAL + beta * (retornoMercado - this.RF_MENSUAL);
    return retornoActivo - capm;
  }

  // CAPM — retorno esperado
  calcCAPM(beta, retornoMercadoMensual) {
    return this.RF_MENSUAL + beta * (retornoMercadoMensual - this.RF_MENSUAL);
  }

  // Value at Risk (95% y 99%)
  calcVaR(retornos, capital) {
    const sorted = retornos.slice().sort(function (a, b) {
      return a - b;
    });
    const idx95 = Math.floor(sorted.length * 0.05);
    const idx99 = Math.floor(sorted.length * 0.01);
    return {
      var95: Math.abs(sorted[idx95]) * capital,
      var99: Math.abs(sorted[idx99 || 0]) * capital,
      pct95: Math.abs(sorted[idx95]),
      pct99: Math.abs(sorted[idx99 || 0]),
    };
  }

  // Monte Carlo — simula N trayectorias
  calcMonteCarlo(retornoMedio, volatilidad, horizonteMeses, capital) {
    const resultados = new Array(this.N_SIMULACIONES);

    for (let i = 0; i < this.N_SIMULACIONES; i++) {
      let valor = capital;
      for (let t = 0; t < horizonteMeses; t++) {
        // Box-Muller para generar normal
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const r = retornoMedio + volatilidad * z;
        valor *= 1 + r;
      }
      resultados[i] = valor;
    }

    resultados.sort(function (a, b) {
      return a - b;
    });

    const media = this.calcMedia(resultados);
    const perdidas = [];
    for (let i = 0; i < resultados.length; i++) {
      if (resultados[i] < capital) perdidas.push(resultados[i]);
    }

    return {
      mediaFinal: Math.round(media),
      percentil5: Math.round(
        resultados[Math.floor(this.N_SIMULACIONES * 0.05)],
      ),
      percentil25: Math.round(
        resultados[Math.floor(this.N_SIMULACIONES * 0.25)],
      ),
      percentil50: Math.round(
        resultados[Math.floor(this.N_SIMULACIONES * 0.5)],
      ),
      percentil75: Math.round(
        resultados[Math.floor(this.N_SIMULACIONES * 0.75)],
      ),
      percentil95: Math.round(
        resultados[Math.floor(this.N_SIMULACIONES * 0.95)],
      ),
      probPerdida: Math.round((perdidas.length / this.N_SIMULACIONES) * 100),
      probGanancia: Math.round(
        ((this.N_SIMULACIONES - perdidas.length) / this.N_SIMULACIONES) * 100,
      ),
    };
  }

  // Análisis Wyckoff simplificado basado en precio y volumen
  calcWyckoff(precios, volumenes) {
    if (!precios || precios.length < 6)
      return { fase: "Indeterminada", descripcion: "Datos insuficientes" };

    const n = precios.length;
    const mitad = Math.floor(n / 2);
    const preciosFin = precios.slice(mitad);
    const preciosIni = precios.slice(0, mitad);

    const mediaFin = this.calcMedia(preciosFin);
    const mediaIni = this.calcMedia(preciosIni);
    const tendencia = (mediaFin - mediaIni) / mediaIni;

    const precioActual = precios[n - 1];
    const precioMax = Math.max.apply(null, precios);
    const precioMin = Math.min.apply(null, precios);
    const rango = precioMax - precioMin;
    const posicion = rango > 0 ? (precioActual - precioMin) / rango : 0.5;

    let fase;
    let descripcion;

    if (tendencia < -0.1 && posicion < 0.3) {
      fase = "Acumulación";
      descripcion =
        "El activo muestra señales de acumulación institucional. Precio en zona baja con posible spring. Vigilar ruptura alcista con volumen.";
    } else if (tendencia > 0.1 && posicion > 0.4 && posicion < 0.8) {
      fase = "Markup";
      descripcion =
        "Fase de expansión alcista en curso. Retrocesos son oportunidades de entrada. BOS confirmado con volumen creciente.";
    } else if (tendencia > 0.05 && posicion > 0.75) {
      fase = "Distribución";
      descripcion =
        "Posible techo de mercado. Volumen decreciente en subidas indica distribución. Precaución ante posible reversión.";
    } else if (tendencia < -0.05 && posicion > 0.4) {
      fase = "Markdown";
      descripcion =
        "Fase bajista activa. Rebotes técnicos son oportunidades de venta. Esperar señales de acumulación en soporte.";
    } else {
      fase = "Consolidación";
      descripcion =
        "Movimiento lateral sin dirección clara. Esperar ruptura del rango con volumen para definir siguiente fase.";
    }

    return {
      fase,
      descripcion,
      tendencia: Math.round(tendencia * 100),
      posicion: Math.round(posicion * 100),
    };
  }

  // Análisis completo
  analizar(precios, fundamentales, resumen, retornosMercado, capital) {
    const retornos = this.calcRetornos(precios);
    const retornoMedio = this.calcMedia(retornos);
    const volatilidad = this.calcDesviacion(retornos, retornoMedio);
    const retornoMercadoM = this.calcMedia(retornosMercado);
    const beta = this.calcBeta(retornos, retornosMercado);
    const alpha = this.calcAlpha(retornoMedio, beta, retornoMercadoM);
    const retornoCAPM = this.calcCAPM(beta, retornoMercadoM);
    const sharpe = this.calcSharpe(retornoMedio, volatilidad);
    const sortino = this.calcSortino(retornos, retornoMedio);
    const drawdown = this.calcDrawdown(precios);
    const var_ = this.calcVaR(retornos, capital);
    const monteCarlo = this.calcMonteCarlo(
      retornoMedio,
      volatilidad,
      12,
      capital,
    );
    const wyckoff = this.calcWyckoff(precios, []);

    return {
      retornoMensual: Math.round(retornoMedio * 10000) / 100,
      retornoAnual: Math.round(retornoMedio * 12 * 10000) / 100,
      volatilidad: Math.round(volatilidad * 10000) / 100,
      volatilidadAnual: Math.round(volatilidad * Math.sqrt(12) * 10000) / 100,
      sharpe: Math.round(sharpe * 100) / 100,
      sortino: Math.round(sortino * 100) / 100,
      drawdown: Math.round(drawdown * 10000) / 100,
      beta: Math.round(beta * 100) / 100,
      alpha: Math.round(alpha * 10000) / 100,
      retornoCAPM: Math.round(retornoCAPM * 12 * 10000) / 100,
      var95: Math.round(var_.var95),
      var99: Math.round(var_.var99),
      varPct95: Math.round(var_.pct95 * 10000) / 100,
      varPct99: Math.round(var_.pct99 * 10000) / 100,
      monteCarlo,
      wyckoff,
      fundamentales,
      resumen,
    };
  }
}
