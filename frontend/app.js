const API_BASE = 'http://localhost:3001';

const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const headers = {
  'Content-Type':  'application/json',
  'Authorization': 'Bearer ' + token
};

function renderSparklines() {
  const configs = [
    { id: 'spark1', color: 'var(--accent)',  data: [30,45,38,55,62,50,70,80,72,90] },
    { id: 'spark2', color: 'var(--green)',   data: [50,55,60,58,70,75,68,80,82,89] },
    { id: 'spark3', color: 'var(--orange)',  data: [60,55,48,50,45,42,46,44,43,43] },
    { id: 'spark4', color: 'var(--red)',     data: [28,25,20,22,18,20,17,16,16,15] }
  ];
  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const el  = document.getElementById(cfg.id);
    if (!el) continue;
    el.innerHTML = '';
    let max = -Infinity;
    for (let j = 0; j < cfg.data.length; j++) {
      if (cfg.data[j] > max) max = cfg.data[j];
    }
    for (let j = 0; j < cfg.data.length; j++) {
      const bar = document.createElement('div');
      bar.className = 'spark-bar';
      bar.style.height     = ((cfg.data[j] / max) * 36) + 'px';
      bar.style.background = cfg.color;
      bar.style.opacity    = '0.7';
      el.appendChild(bar);
    }
  }
}
renderSparklines();

let allItems      = [];
let filteredItems = [];
let selectedId    = null;
let currentFilter = 'all';
const selectedIds = new Set();

function getRiskLevel(item) {
  const score = item.ratios && item.ratios.riskScore != null ? item.ratios.riskScore : null;
  if (score === null) return 'medium';
  if (score >= 70)   return 'low';
  if (score >= 40)   return 'medium';
  return 'high';
}

function updatePortfolioBar() {
  const bar   = document.getElementById('portfolioBar');
  const count = document.getElementById('portfolioCount');
  if (!bar) return;
  if (selectedIds.size >= 2) {
    bar.style.display = 'flex';
    count.textContent = selectedIds.size + ' empresas seleccionadas';
  } else {
    bar.style.display = 'none';
  }
}

function bindCheckboxes() {
  const checkAll = document.getElementById('checkAll');
  const tbody    = document.getElementById('historyBody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  for (let i = 0; i < rows.length; i++) {
    const cb = rows[i].querySelector('input[type="checkbox"]');
    if (!cb) continue;
    cb.addEventListener('change', function() {
      if (this.checked) selectedIds.add(this.dataset.id);
      else              selectedIds.delete(this.dataset.id);
      updatePortfolioBar();
    });
  }

  if (checkAll) {
    checkAll.addEventListener('change', function() {
      const checks = tbody.querySelectorAll('input[type="checkbox"]');
      for (let i = 0; i < checks.length; i++) {
        checks[i].checked = checkAll.checked;
        if (checkAll.checked) selectedIds.add(checks[i].dataset.id);
        else                  selectedIds.delete(checks[i].dataset.id);
      }
      updatePortfolioBar();
    });
  }
}

function renderRows(items) {
  const tbody = document.getElementById('historyBody');
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:28px;font-size:13px">No hay análisis para este filtro</td></tr>';
    return;
  }

  for (let i = 0; i < items.length; i++) {
    const item      = items[i];
    const company   = item.companyName || '—';
    const date      = item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : '—';
    const score     = item.ratios && item.ratios.riskScore != null ? item.ratios.riskScore : '—';
    const risk      = getRiskLevel(item);
    let   liquidity = '—';

    if (item.ratios && item.ratios.liquidityRatio != null)
      liquidity = Number(item.ratios.liquidityRatio).toFixed(2);

    let scoreColor = 'var(--orange)';
    if (risk === 'low')  scoreColor = 'var(--green)';
    if (risk === 'high') scoreColor = 'var(--red)';

    let badgeText = '● Medio';
    if (risk === 'low')  badgeText = '● Bajo';
    if (risk === 'high') badgeText = '● Alto';

    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="checkbox" data-id="' + item._id + '" style="cursor:pointer"></td>' +
      '<td><span class="table-company">' + company + '</span></td>' +
      '<td style="color:var(--text2);font-size:12px;font-family:\'IBM Plex Mono\',monospace">' + date + '</td>' +
      '<td><span class="score-value" style="color:' + scoreColor + '">' + score + '</span></td>' +
      '<td><span class="risk-badge risk-' + risk + '">' + badgeText + '</span></td>' +
      '<td style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:var(--cyan)">' + liquidity + '</td>' +
      '<td><button class="btn-view" data-id="' + item._id + '">Ver →</button></td>';

    tbody.appendChild(tr);
  }

  const viewBtns = tbody.querySelectorAll('.btn-view');
  for (let i = 0; i < viewBtns.length; i++) {
    const btn = viewBtns[i];
    btn.addEventListener('click', function() { showDetail(btn.dataset.id); });
  }

  bindCheckboxes();
}

function applyFilter(filter) {
  currentFilter = filter;
  if (filter === 'all') {
    filteredItems = allItems.slice();
  } else {
    filteredItems = [];
    for (let i = 0; i < allItems.length; i++) {
      if (getRiskLevel(allItems[i]) === filter) filteredItems.push(allItems[i]);
    }
  }
  renderRows(filteredItems);
}

function showFilterModal() {
  let modal = document.getElementById('filterModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'filterModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;display:flex;align-items:center;justify-content:center';
    modal.innerHTML =
      '<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--r-lg);padding:28px;width:320px">' +
        '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:20px">Filtrar historial</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<button class="filter-opt" data-f="all"    style="padding:10px 14px;border-radius:var(--r);border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-size:13px;cursor:pointer;text-align:left">Todos los análisis</button>' +
          '<button class="filter-opt" data-f="low"    style="padding:10px 14px;border-radius:var(--r);border:1px solid var(--border2);background:var(--surface2);color:var(--green);font-size:13px;cursor:pointer;text-align:left">● Riesgo bajo (score ≥ 70)</button>' +
          '<button class="filter-opt" data-f="medium" style="padding:10px 14px;border-radius:var(--r);border:1px solid var(--border2);background:var(--surface2);color:var(--orange);font-size:13px;cursor:pointer;text-align:left">● Riesgo medio (score 40-69)</button>' +
          '<button class="filter-opt" data-f="high"   style="padding:10px 14px;border-radius:var(--r);border:1px solid var(--border2);background:var(--surface2);color:var(--red);font-size:13px;cursor:pointer;text-align:left">● Riesgo alto (score &lt; 40)</button>' +
        '</div>' +
        '<button id="closeFilterModal" style="margin-top:16px;width:100%;padding:10px;border-radius:var(--r);border:1px solid var(--border2);background:none;color:var(--text2);font-size:13px;cursor:pointer">Cerrar</button>' +
      '</div>';
    document.body.appendChild(modal);

    const opts = modal.querySelectorAll('.filter-opt');
    for (let i = 0; i < opts.length; i++) {
      opts[i].addEventListener('click', function() {
        applyFilter(this.dataset.f);
        document.body.removeChild(modal);
      });
    }

    document.getElementById('closeFilterModal').addEventListener('click', function() {
      document.body.removeChild(modal);
    });
  }
}

function showStatsModal() {
  if (allItems.length === 0) {
    alert('No hay análisis todavía.');
    return;
  }

  let bestScore  = null, bestName  = '—';
  let worstScore = null, worstName = '—';
  let totalScore = 0, highCount = 0, medCount = 0, lowCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item  = allItems[i];
    const score = item.ratios && item.ratios.riskScore != null ? item.ratios.riskScore : null;
    const risk  = getRiskLevel(item);

    if (risk === 'low')         lowCount++;
    else if (risk === 'medium') medCount++;
    else                        highCount++;

    if (score !== null) {
      totalScore += score;
      if (bestScore  === null || score > bestScore)  { bestScore  = score; bestName  = item.companyName || '—'; }
      if (worstScore === null || score < worstScore) { worstScore = score; worstName = item.companyName || '—'; }
    }
  }

  const avgScore = allItems.length > 0 ? (totalScore / allItems.length).toFixed(1) : '—';

  let modal = document.getElementById('statsModal');
  if (modal) document.body.removeChild(modal);

  modal = document.createElement('div');
  modal.id = 'statsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--r-lg);padding:28px;width:400px;max-width:90vw">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:20px">Estadísticas del historial</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:14px">' +
          '<div style="font-size:10px;color:var(--text3);font-family:\'IBM Plex Mono\',monospace;letter-spacing:.6px;margin-bottom:6px">TOTAL ANÁLISIS</div>' +
          '<div style="font-size:24px;font-weight:700;color:var(--text)">' + allItems.length + '</div>' +
        '</div>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:14px">' +
          '<div style="font-size:10px;color:var(--text3);font-family:\'IBM Plex Mono\',monospace;letter-spacing:.6px;margin-bottom:6px">SCORE MEDIO</div>' +
          '<div style="font-size:24px;font-weight:700;color:var(--accent)">' + avgScore + '</div>' +
        '</div>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:14px">' +
          '<div style="font-size:10px;color:var(--text3);font-family:\'IBM Plex Mono\',monospace;letter-spacing:.6px;margin-bottom:6px">MEJOR SCORE</div>' +
          '<div style="font-size:16px;font-weight:600;color:var(--green)">' + (bestScore !== null ? bestScore : '—') + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + bestName + '</div>' +
        '</div>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:14px">' +
          '<div style="font-size:10px;color:var(--text3);font-family:\'IBM Plex Mono\',monospace;letter-spacing:.6px;margin-bottom:6px">PEOR SCORE</div>' +
          '<div style="font-size:16px;font-weight:600;color:var(--red)">' + (worstScore !== null ? worstScore : '—') + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + worstName + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:20px">' +
        '<div style="flex:1;background:rgba(16,163,74,.08);border:1px solid rgba(16,163,74,.2);border-radius:var(--r);padding:10px;text-align:center">' +
          '<div style="font-size:18px;font-weight:700;color:var(--green)">' + lowCount + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">Riesgo bajo</div>' +
        '</div>' +
        '<div style="flex:1;background:rgba(217,119,6,.08);border:1px solid rgba(217,119,6,.2);border-radius:var(--r);padding:10px;text-align:center">' +
          '<div style="font-size:18px;font-weight:700;color:var(--orange)">' + medCount + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">Riesgo medio</div>' +
        '</div>' +
        '<div style="flex:1;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);border-radius:var(--r);padding:10px;text-align:center">' +
          '<div style="font-size:18px;font-weight:700;color:var(--red)">' + highCount + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">Riesgo alto</div>' +
        '</div>' +
      '</div>' +
      '<button id="closeStatsModal" style="width:100%;padding:10px;border-radius:var(--r);border:1px solid var(--border2);background:none;color:var(--text2);font-size:13px;cursor:pointer">Cerrar</button>' +
    '</div>';

  document.body.appendChild(modal);
  document.getElementById('closeStatsModal').addEventListener('click', function() {
    document.body.removeChild(modal);
  });
}

async function loadHistory() {
  const tbody = document.getElementById('historyBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:28px;font-size:13px">Cargando...</td></tr>';

  try {
    const res  = await fetch(API_BASE + '/analysis', { headers });
    const data = await res.json();

    if (!res.ok || data.ok === false)
      throw new Error(data.error || 'Error al cargar historial');

    allItems      = data.items || [];
    filteredItems = allItems.slice();

    const total = allItems.length;
    let low = 0, medium = 0, high = 0;
    for (let i = 0; i < allItems.length; i++) {
      const r = getRiskLevel(allItems[i]);
      if (r === 'low')         low++;
      else if (r === 'medium') medium++;
      else                     high++;
    }

    document.getElementById('kpiTotal').textContent  = total;
    document.getElementById('kpiLow').textContent    = low;
    document.getElementById('kpiMed').textContent    = medium;
    document.getElementById('kpiHigh').textContent   = high;
    document.getElementById('kpiLowPct').textContent = total > 0
      ? '↑ ' + Math.round((low / total) * 100) + '% del total'
      : '—';

    applyFilter(currentFilter);

    if (allItems.length > 0) showDetail(allItems[0]._id);

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:28px;font-size:13px">Error: ' + err.message + '</td></tr>';
  }
}

function showDetail(id) {
  let item = null;
  for (let i = 0; i < allItems.length; i++) {
    if (allItems[i]._id === id) { item = allItems[i]; break; }
  }
  if (!item) return;
  selectedId = id;

  document.getElementById('detailEmpty').style.display   = 'none';
  document.getElementById('detailContent').style.display = 'flex';

  const risk    = getRiskLevel(item);
  const scoreEl = document.getElementById('detailScore');

  document.getElementById('detailTitle').textContent    = '📄 ' + (item.companyName || '—');
  document.getElementById('detailSubtitle').textContent = 'Análisis completo · ' + new Date(item.createdAt).toLocaleDateString('es-ES');

  scoreEl.style.display = 'inline-block';
  scoreEl.textContent   = 'Score: ' + (item.ratios && item.ratios.riskScore != null ? item.ratios.riskScore : '—');
  scoreEl.className     = 'risk-badge risk-' + risk;

  const r  = item.ratios || {};
  const av = item.analisisAvanzado;

  if (av) {
    document.getElementById('ratioL').previousElementSibling.textContent = 'Volatilidad';
    document.getElementById('ratioE').previousElementSibling.textContent = 'Sharpe';
    document.getElementById('ratioR').previousElementSibling.textContent = 'Beta';
    document.getElementById('ratioM').previousElementSibling.textContent = 'Drawdown';
    document.getElementById('ratioL').textContent = av.volatilidadAnual != null ? av.volatilidadAnual + '%' : '—';
    document.getElementById('ratioE').textContent = av.sharpe           != null ? av.sharpe                : '—';
    document.getElementById('ratioR').textContent = av.beta             != null ? av.beta                  : '—';
    document.getElementById('ratioM').textContent = av.drawdown         != null ? av.drawdown + '%'        : '—';
  } else {
    document.getElementById('ratioL').previousElementSibling.textContent = 'Liquidez';
    document.getElementById('ratioE').previousElementSibling.textContent = 'Endeud.';
    document.getElementById('ratioR').previousElementSibling.textContent = 'ROE';
    document.getElementById('ratioM').previousElementSibling.textContent = 'Margen';
    document.getElementById('ratioL').textContent = r.liquidityRatio != null ? Number(r.liquidityRatio).toFixed(2)          : '—';
    document.getElementById('ratioE').textContent = r.debtToEquity   != null ? Number(r.debtToEquity).toFixed(2)            : '—';
    document.getElementById('ratioR').textContent = r.roe            != null ? (Number(r.roe) * 100).toFixed(1) + '%'       : '—';
    document.getElementById('ratioM').textContent = r.netMargin      != null ? (Number(r.netMargin) * 100).toFixed(1) + '%' : '—';
  }

  document.getElementById('aiReportBox').textContent    = item.aiReport || 'Sin informe disponible.';
  document.getElementById('btnExportPdf').disabled      = false;
  document.getElementById('btnExportPdf').style.display = 'block';
}

document.getElementById('btnExportAll').addEventListener('click', showStatsModal);

document.getElementById('btnReload').addEventListener('click', function() { loadHistory(); });

const allTopBtns = document.querySelectorAll('.panel-actions .topbar-btn');
for (let i = 0; i < allTopBtns.length; i++) {
  if (allTopBtns[i].textContent.trim() === 'Filtrar') {
    allTopBtns[i].addEventListener('click', showFilterModal);
    break;
  }
}

document.getElementById('btnAnalyze').addEventListener('click', async function() {
  const errorEl     = document.getElementById('analyzeError');
  const btn         = document.getElementById('btnAnalyze');
  const companyName = document.getElementById('companyInput').value.trim();

  errorEl.style.display = 'none';

  if (!companyName) {
    errorEl.textContent   = 'Introduce el nombre de la empresa.';
    errorEl.style.display = 'block';
    return;
  }

  const payload = {
    companyName,
    inputData: {
      currentAssets:      parseFloat(document.getElementById('currentAssets').value)      || 0,
      currentLiabilities: parseFloat(document.getElementById('currentLiabilities').value) || 0,
      totalDebt:          parseFloat(document.getElementById('totalDebt').value)           || 0,
      equity:             parseFloat(document.getElementById('equity').value)              || 0,
      netIncome:          parseFloat(document.getElementById('netIncome').value)           || 0,
      revenue:            parseFloat(document.getElementById('revenue').value)             || 0,
      totalAssets:        parseFloat(document.getElementById('totalAssets').value)         || 0
    }
  };

  btn.textContent = '⏳ Analizando...';
  btn.disabled    = true;

  try {
    const res  = await fetch(API_BASE + '/analysis', { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Error al crear análisis');
    await loadHistory();
    const fields = ['companyInput','currentAssets','currentLiabilities','totalDebt','equity','netIncome','revenue','totalAssets'];
    for (let i = 0; i < fields.length; i++) document.getElementById(fields[i]).value = '';
  } catch (err) {
    errorEl.textContent   = 'Error: ' + err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.textContent = '⚡ Analizar con IA';
    btn.disabled    = false;
  }
});

document.getElementById('btnExportPdf').addEventListener('click', async function() {
  if (!selectedId) return;
  try {
    const res  = await fetch(API_BASE + '/analysis/' + selectedId + '/pdf', { headers });
    if (!res.ok) throw new Error('No se pudo generar el PDF');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'analysis_' + selectedId + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error al exportar PDF: ' + err.message);
  }
});

const btnCartera = document.getElementById('btnAnalizarCartera');
if (btnCartera) {
  btnCartera.addEventListener('click', function() {
    if (selectedIds.size < 2) return;
    const idsArray = Array.from(selectedIds);
    let ids = '';
    for (let i = 0; i < idsArray.length; i++) {
      ids += (ids ? ',' : '') + idsArray[i];
    }
    window.location.href = 'portfolio.html?ids=' + ids;
  });
}

loadHistory();

function switchTab(tab) {
  const manual = document.getElementById('formManual');
  const auto   = document.getElementById('formAuto');
  const btnM   = document.getElementById('tabManual');
  const btnA   = document.getElementById('tabAuto');

  if (tab === 'manual') {
    manual.style.display = 'block';
    auto.style.display   = 'none';
    btnM.classList.add('active');
    btnA.classList.remove('active');
  } else {
    manual.style.display = 'none';
    auto.style.display   = 'block';
    btnM.classList.remove('active');
    btnA.classList.add('active');
  }
}

let tickerSeleccionado = null;

function resetSearch() {
  tickerSeleccionado = null;
  document.getElementById('searchInput').value             = '';
  document.getElementById('searchResults').style.display   = 'none';
  document.getElementById('tickerConfirmed').style.display = 'none';
  document.getElementById('tickerList').innerHTML          = '';
}

const btnSearch = document.getElementById('btnSearch');
if (btnSearch) {
  btnSearch.addEventListener('click', async function() {
    const query   = document.getElementById('searchInput').value.trim();
    const errorEl = document.getElementById('autoError');
    errorEl.style.display = 'none';

    if (!query || query.length < 2) {
      errorEl.textContent   = 'Introduce al menos 2 caracteres.';
      errorEl.style.display = 'block';
      return;
    }

    btnSearch.textContent = 'Buscando...';
    btnSearch.disabled    = true;

    try {
      const res  = await fetch(API_BASE + '/advanced/search?q=' + encodeURIComponent(query), { headers });
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al buscar');

      const list = document.getElementById('tickerList');
      list.innerHTML = '';

      for (let i = 0; i < data.resultados.length; i++) {
        const r   = data.resultados[i];
        const div = document.createElement('div');
        div.className = 'ticker-option';
        div.innerHTML =
          '<div>' +
            '<div class="t-name">' + r.nombre + '</div>' +
            '<div class="t-exchange">' + r.exchange + '</div>' +
          '</div>' +
          '<div class="t-symbol">' + r.ticker + '</div>';

        div.addEventListener('click', function() {
          tickerSeleccionado = r.ticker;
          document.getElementById('tickerNombre').textContent      = r.nombre;
          document.getElementById('tickerSymbol').textContent      = r.ticker + ' · ' + r.exchange;
          document.getElementById('searchResults').style.display   = 'none';
          document.getElementById('tickerConfirmed').style.display = 'block';
        });

        list.appendChild(div);
      }

      document.getElementById('searchResults').style.display = 'block';

    } catch (err) {
      document.getElementById('autoError').textContent   = 'Error: ' + err.message;
      document.getElementById('autoError').style.display = 'block';
    } finally {
      btnSearch.textContent = 'Buscar';
      btnSearch.disabled    = false;
    }
  });
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('btnSearch').click();
  });
}

const btnAutoAnalyze = document.getElementById('btnAutoAnalyze');
if (btnAutoAnalyze) {
  btnAutoAnalyze.addEventListener('click', async function() {
    const errorEl   = document.getElementById('autoError');
    const capitalEl = document.getElementById('autoCapital');
    const capital   = capitalEl ? parseFloat(capitalEl.value) || 10000 : 10000;

    errorEl.style.display = 'none';

    if (!tickerSeleccionado) {
      errorEl.textContent   = 'Busca y selecciona una empresa primero.';
      errorEl.style.display = 'block';
      return;
    }

    btnAutoAnalyze.textContent = 'Analizando...';
    btnAutoAnalyze.disabled    = true;

    try {
      const res  = await fetch(API_BASE + '/advanced/analyze', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ ticker: tickerSeleccionado, capital })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al analizar');

      await loadHistory();
      resetSearch();
      switchTab('manual');

      if (data.analysis) showDetail(data.analysis._id);

    } catch (err) {
      errorEl.textContent   = 'Error: ' + err.message;
      errorEl.style.display = 'block';
    } finally {
      btnAutoAnalyze.textContent = 'Análisis avanzado completo';
      btnAutoAnalyze.disabled    = false;
    }
  });
}