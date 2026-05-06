import PDFDocument from "pdfkit";

export function streamAnalysisPdf(res, analysis) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=RiskLens_" +
      (analysis.companyName || analysis._id).replace(/\s+/g, "_") +
      ".pdf",
  );

  const doc = new PDFDocument({ margin: 0, size: "A4" });
  doc.pipe(res);

  const W = doc.page.width;
  const MARGIN = 50;

  // ── CABECERA OSCURA ───────────────────────────────────────
  doc.rect(0, 0, W, 90).fill("#0d1117");

  doc
    .fill("#3b82f6")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("RISKLENS AI  ·  INFORME FINANCIERO PROFESIONAL", MARGIN, 22, {
      characterSpacing: 1.5,
    });

  doc
    .fill("#ffffff")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(analysis.companyName || "—", MARGIN, 38, {
      width: W - MARGIN * 2 - 120,
    });

  const fecha = new Date(analysis.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc
    .fill("#6b7280")
    .fontSize(8)
    .font("Helvetica")
    .text(fecha, W - MARGIN - 110, 22, { width: 110, align: "right" });

  // Badge de riesgo
  const r = analysis.ratios || {};
  let riskLabel = "RIESGO MEDIO";
  let riskBg = "#d97706";
  if (r.riskScore >= 70) {
    riskLabel = "RIESGO BAJO";
    riskBg = "#16a34a";
  }
  if (r.riskScore < 40) {
    riskLabel = "RIESGO ALTO";
    riskBg = "#dc2626";
  }

  const scoreText = r.riskScore != null ? String(r.riskScore) + "/100" : "—";
  doc.rect(W - MARGIN - 110, 38, 110, 36).fill(riskBg);
  doc
    .fill("#ffffff")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(riskLabel, W - MARGIN - 110, 44, { width: 110, align: "center" });
  doc
    .fill("#ffffff")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(scoreText, W - MARGIN - 110, 56, { width: 110, align: "center" });

  doc.y = 106;

  // ── SECCIÓN RATIOS ────────────────────────────────────────
  const av = analysis.analisisAvanzado;

  const ratios = av
    ? [
        {
          label: "Retorno Anual",
          value: av.retornoAnual != null ? av.retornoAnual + "%" : "—",
        },
        {
          label: "Volatilidad",
          value: av.volatilidadAnual != null ? av.volatilidadAnual + "%" : "—",
        },
        {
          label: "Sharpe Ratio",
          value: av.sharpe != null ? String(av.sharpe) : "—",
        },
        {
          label: "Sortino Ratio",
          value: av.sortino != null ? String(av.sortino) : "—",
        },
        { label: "Beta", value: av.beta != null ? String(av.beta) : "—" },
        { label: "Alpha", value: av.alpha != null ? av.alpha + "%" : "—" },
        {
          label: "CAPM Esperado",
          value: av.retornoCAPM != null ? av.retornoCAPM + "%" : "—",
        },
        {
          label: "Drawdown Máx.",
          value: av.drawdown != null ? av.drawdown + "%" : "—",
        },
        {
          label: "VaR 95%",
          value: av.varPct95 != null ? av.varPct95 + "%" : "—",
        },
        {
          label: "VaR 99%",
          value: av.varPct99 != null ? av.varPct99 + "%" : "—",
        },
        {
          label: "Prob. Ganancia",
          value: av.monteCarlo != null ? av.monteCarlo.probGanancia + "%" : "—",
        },
        {
          label: "Escenario Base",
          value: av.monteCarlo != null ? av.monteCarlo.percentil50 + "€" : "—",
        },
      ]
    : [
        {
          label: "Score de Riesgo",
          value: r.riskScore != null ? r.riskScore + " / 100" : "—",
        },
        {
          label: "Liquidez",
          value:
            r.liquidityRatio != null
              ? Number(r.liquidityRatio).toFixed(2)
              : "—",
        },
        {
          label: "Deuda/Patrimonio",
          value:
            r.debtToEquity != null ? Number(r.debtToEquity).toFixed(2) : "—",
        },
        {
          label: "ROE",
          value: r.roe != null ? (Number(r.roe) * 100).toFixed(1) + "%" : "—",
        },
        {
          label: "Margen Neto",
          value:
            r.netMargin != null
              ? (Number(r.netMargin) * 100).toFixed(1) + "%"
              : "—",
        },
        {
          label: "ROA",
          value: r.roa != null ? (Number(r.roa) * 100).toFixed(1) + "%" : "—",
        },
      ];

  // Título sección
  doc
    .fill("#0d1117")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("INDICADORES CLAVE", MARGIN, doc.y, { characterSpacing: 1.5 });
  doc.moveDown(0.4);

  // Grid de ratios 3 columnas
  const colCount = 3;
  const cellW = (W - MARGIN * 2 - (colCount - 1) * 8) / colCount;
  const cellH = 44;
  const startY = doc.y;
  const rows = Math.ceil(ratios.length / colCount);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < colCount; col++) {
      const idx = row * colCount + col;
      if (idx >= ratios.length) continue;

      const x = MARGIN + col * (cellW + 8);
      const y = startY + row * (cellH + 6);

      doc.rect(x, y, cellW, cellH).fill("#f8fafc").stroke("#e2e8f0");
      doc
        .fill("#6b7280")
        .fontSize(7)
        .font("Helvetica")
        .text(ratios[idx].label.toUpperCase(), x + 8, y + 8, {
          width: cellW - 16,
          characterSpacing: 0.5,
        });
      doc
        .fill("#0d1117")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(ratios[idx].value, x + 8, y + 20, { width: cellW - 16 });
    }
  }

  doc.y = startY + rows * (cellH + 6) + 16;

  // ── SEPARADOR ─────────────────────────────────────────────
  doc.rect(MARGIN, doc.y, W - MARGIN * 2, 1).fill("#e2e8f0");
  doc.moveDown(1);

  // ── INFORME IA ────────────────────────────────────────────
  doc
    .fill("#0d1117")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("INFORME DE ANÁLISIS GENERADO POR IA", MARGIN, doc.y, {
      characterSpacing: 1.5,
    });
  doc.moveDown(0.6);

  const report = analysis.aiReport || "Sin informe disponible.";
  const lines = report.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      doc.moveDown(0.3);
      continue;
    }

    const isBold = line.startsWith("**") && line.includes("**", 2);
    line = line
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/^#+\s*/, "")
      .trim();
    if (!line) continue;

    const isSection = /^[1-9]\.\s/.test(line);

    if (isSection || isBold) {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        doc.y = MARGIN;
      }
      doc.moveDown(0.3);
      doc.rect(MARGIN, doc.y, 3, 12).fill("#3b82f6");
      doc
        .fill("#0d1117")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(line, MARGIN + 10, doc.y, { width: W - MARGIN * 2 - 10 });
      doc.moveDown(0.3);
    } else {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        doc.y = MARGIN;
      }
      doc
        .fill("#374151")
        .fontSize(9.5)
        .font("Helvetica")
        .text(line, MARGIN, doc.y, {
          align: "justify",
          lineGap: 3,
          width: W - MARGIN * 2,
        });
    }
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  doc.moveDown(2);
  doc.rect(MARGIN, doc.y, W - MARGIN * 2, 1).fill("#e2e8f0");
  doc.moveDown(0.5);
  doc
    .fill("#9ca3af")
    .fontSize(7.5)
    .font("Helvetica")
    .text(
      "RiskLens AI  ·  Generado el " +
        fecha +
        "  ·  Este informe es orientativo y no constituye asesoramiento financiero profesional.",
      MARGIN,
      doc.y,
      { align: "center", width: W - MARGIN * 2 },
    );

  doc.end();
}
