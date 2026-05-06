const API_BASE = "http://localhost:3001";

// ── AUTH GUARD ───────────────────────────────────────────────
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// ── COLOR HELPERS ────────────────────────────────────────────
// Tu backend devuelve valores -1 a +1 (o -100 a +100), lo normalizamos
function corrToColor(v) {
  // Normalizar: si viene como porcentaje (>1), dividir por 100
  const val = Math.abs(v) > 1 ? v / 100 : v;
  if (val === 1.0) return "var(--surface2)";
  if (val >= 0.8) return `rgba(16,185,129,${0.5 + val * 0.4})`;
  if (val >= 0.5) return `rgba(16,185,129,${0.2 + val * 0.3})`;
  if (val >= 0.1) return `rgba(59,130,246,${0.1 + val * 0.2})`;
  if (val <= -0.8) return `rgba(239,68,68,${0.5 + Math.abs(val) * 0.4})`;
  if (val <= -0.5) return `rgba(239,68,68,${0.2 + Math.abs(val) * 0.3})`;
  if (val <= -0.1) return `rgba(245,158,11,${0.1 + Math.abs(val) * 0.25})`;
  return "rgba(100,116,139,0.2)";
}

function corrToTextColor(v) {
  const val = Math.abs(v) > 1 ? v / 100 : v;
  if (Math.abs(val) >= 0.7) return "var(--text)";
  return "var(--text2)";
}

function corrDisplay(v) {
  // Si viene como porcentaje entero (ej: 97), mostrar "0.97"
  const val = Math.abs(v) > 1 ? v / 100 : v;
  return val.toFixed(2);
}

// ── ESTADO ───────────────────────────────────────────────────
let currentTf = "1W";
let backendData = null; // { pairs, timeframes, matrices }

// ── RENDER HEATMAP ───────────────────────────────────────────
function renderHeatmap(pairs, matrix) {
  const table = document.getElementById("heatmapTable");
  let html = "<thead><tr><th></th>";
  for (let i = 0; i < pairs.length; i++) {
    html += `<th>${pairs[i]}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    html += `<tr><td class="heatmap-row-label">${pairs[i]}</td>`;
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      const isDiag = i === j;
      html += `<td
        class="${isDiag ? "diag" : ""}"
        style="background:${corrToColor(v)};color:${corrToTextColor(v)}"
        onmouseenter="showTooltip(event,'${pairs[i]} / ${pairs[j]}: ${corrDisplay(v)}')"
        onmouseleave="hideTooltip()"
      >${isDiag ? pairs[i].split("/")[0] : corrDisplay(v)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody>";
  table.innerHTML = html;
}

function updateSummaryCards(pairs, matrix) {
  let maxVal = -Infinity,
    minVal = Infinity;
  let maxPair = "",
    minPair = "";

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    for (let j = 0; j < row.length; j++) {
      if (i === j) continue;
      const v = row[j];
      const val = Math.abs(v) > 1 ? v / 100 : v;
      if (val > maxVal) {
        maxVal = val;
        maxPair = `${pairs[i]} ↔ ${pairs[j]}`;
      }
      if (val < minVal) {
        minVal = val;
        minPair = `${pairs[i]} ↔ ${pairs[j]}`;
      }
    }
  }

  const maxEl = document.getElementById("summaryMax");
  const minEl = document.getElementById("summaryMin");
  const cntEl = document.getElementById("summaryCount");

  if (maxEl) {
    maxEl.querySelector(".summary-val").textContent =
      (maxVal >= 0 ? "+" : "") + maxVal.toFixed(2);
    maxEl.querySelector(".summary-pair").textContent = maxPair;
  }
  if (minEl) {
    minEl.querySelector(".summary-val").textContent = minVal.toFixed(2);
    minEl.querySelector(".summary-pair").textContent = minPair;
  }
  if (cntEl) {
    cntEl.querySelector(".summary-val").textContent =
      `${pairs.length} × ${pairs.length}`;
    cntEl.querySelector(".summary-pair").textContent =
      `${pairs.length * pairs.length} combinaciones`;
  }
}

// ── SWITCH TIMEFRAME ──────────────────────────────────────────
function switchTimeframe(tf) {
  if (!backendData) return;
  const matrix = backendData.matrices[tf];
  if (!matrix) return;
  currentTf = tf;
  renderHeatmap(backendData.pairs, matrix);
  updateSummaryCards(backendData.pairs, matrix);
}

// ── LOAD FROM BACKEND ─────────────────────────────────────────
// Tu backend: POST /fx/correlations → { ok, pairs, timeframes, matrices: { "1D": [[...]], "1W": [[...]], ... } }
async function loadCorrelations() {
  const wrap = document.getElementById("heatmapTable");
  wrap.innerHTML = `<tr><td style="padding:40px;color:var(--text3);font-size:13px;text-align:center">Cargando correlaciones...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/fx/correlations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();

    if (!res.ok || data.ok === false)
      throw new Error(data.error || "Error al cargar correlaciones");

    backendData = data; // { pairs, timeframes, matrices }

    // Actualizar botones de timeframe con los que devuelve el backend
    const tfSelector = document.getElementById("timeframeSelector");
    if (data.timeframes && data.timeframes.length > 0) {
      tfSelector.innerHTML = "";
      for (let idx = 0; idx < data.timeframes.length; idx++) {
        const tf = data.timeframes[idx];
        const btn = document.createElement("button");
        btn.className = "tf-btn" + (idx === 0 ? " active" : "");
        btn.dataset.tf = tf;
        btn.textContent = tf;
        tfSelector.appendChild(btn);
      }
      currentTf = data.timeframes[0];
    }

    renderHeatmap(data.pairs, data.matrices[currentTf]);
    updateSummaryCards(data.pairs, data.matrices[currentTf]);
  } catch (err) {
    wrap.innerHTML = `<tr><td style="padding:40px;color:var(--red2);font-size:13px;text-align:center">Error: ${err.message}</td></tr>`;
  }
}

// ── TOOLTIP ───────────────────────────────────────────────────
const tooltip = document.getElementById("tooltip");
function showTooltip(e, text) {
  tooltip.textContent = text;
  tooltip.style.display = "block";
  tooltip.style.left = e.clientX + 12 + "px";
  tooltip.style.top = e.clientY - 8 + "px";
}
function hideTooltip() {
  tooltip.style.display = "none";
}

// ── TIMEFRAME BUTTONS ────────────────────────────────────────
document
  .getElementById("timeframeSelector")
  .addEventListener("click", function (e) {
    const btn = e.target.closest(".tf-btn");
    if (!btn) return;
    const btns = document.querySelectorAll(".tf-btn");
    for (let i = 0; i < btns.length; i++) {
      btns[i].classList.remove("active");
    }
    btn.classList.add("active");
    switchTimeframe(btn.dataset.tf);
  });

// ── INIT ─────────────────────────────────────────────────────
loadCorrelations();
