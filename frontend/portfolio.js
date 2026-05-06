const API_BASE = "http://localhost:3001";

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
};

// Leer IDs de la URL
const params = new URLSearchParams(window.location.search);
const idsStr = params.get("ids") || "";
const ids = idsStr.split(",").filter(function (id) {
    return id.length > 0;
});

if (ids.length < 2) {
    document.getElementById("inputEmpresas").value =
        "Ninguna empresa seleccionada";
} else {
    document.getElementById("inputEmpresas").value =
        ids.length + " empresas seleccionadas";
}

// Cargar nombres de las empresas seleccionadas
async function cargarNombresEmpresas() {
    try {
        const res = await fetch(API_BASE + "/analysis", { headers });
        const data = await res.json();

        if (!data.ok) return;

        const nombres = [];
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
        for (let j = 0; j < ids.length; j++) {
            if (String(item._id) === String(ids[j])) {
                nombres.push(item.companyName);
        }  
    }
    }

    if (nombres.length > 0) {
        document.getElementById("inputEmpresas").value = nombres.join(", ");
    }
} catch (err) {
    console.warn("No se pudieron cargar los nombres:", err.message);
}
}

cargarNombresEmpresas();

// Ejecutar análisis
document
    .getElementById("btnOptimizar")
    .addEventListener("click", async function () {
        const errorEl = document.getElementById("portfolioError");
        const loading = document.getElementById("loadingState");
        const resultEl = document.getElementById("resultados");
        const btn = document.getElementById("btnOptimizar");
        const capital =
        parseFloat(document.getElementById("inputCapital").value) || 10000;

        errorEl.style.display = "none";
        resultEl.style.display = "none";
        loading.style.display = "block";
        btn.disabled = true;
        btn.textContent = "Analizando...";

    try {
        const res = await fetch(API_BASE + "/portfolio/optimize", {
            method: "POST",
            headers,
            body: JSON.stringify({ ids, capital }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok)
            throw new Error(data.error || "Error al optimizar cartera");

        renderResultados(data);
    } catch (err) {
        errorEl.textContent = "Error: " + err.message;
        errorEl.style.display = "block";
    } finally {
        loading.style.display = "none";
        btn.disabled = false;
        btn.textContent = "⚡ Ejecutar análisis estocástico";
    }
});

function renderResultados(data) {
    document.getElementById("resultados").style.display = "block";

    document.getElementById("resRetorno").textContent =
        data.retornoEsperadoAnual + "%";
    document.getElementById("resRiesgo").textContent = data.riesgoAnual + "%";
    document.getElementById("resSharpe").textContent = data.sharpe;
    document.getElementById("explicacionIA").textContent =
        data.explicacion || "—";

    const tbody = document.getElementById("tablaBody");
    tbody.innerHTML = "";

    for (let i = 0; i < data.activos.length; i++) {
        const a = data.activos[i];
        const risk =
        a.riskScore >= 70 ? "low" : a.riskScore >= 40 ? "medium" : "high";

    const tr = document.createElement("tr");
    tr.innerHTML =
        "<td><span class='table-company'>" +
        a.empresa +
        "</span></td>" +
        "<td style='font-family:\"IBM Plex Mono\",monospace;font-size:12px;color:var(--text3)'>" +
        a.ticker +
        "</td>" +
        "<td style='font-family:\"IBM Plex Mono\",monospace;font-weight:500;font-size:14px;color:var(--accent)'>" +
        a.peso +
        "%</td>" +
        "<td style='font-family:\"IBM Plex Mono\",monospace;font-size:13px'>" +
        a.capitalAsignado +
        "€</td>" +
        "<td style='font-family:\"IBM Plex Mono\",monospace;font-size:12px;color:var(--green)'>" +
        a.retornoEsperado +
        "%</td>" +
        "<td style='font-family:\"IBM Plex Mono\",monospace;font-size:12px;color:var(--orange)'>" +
        a.volatilidad +
        "%</td>" +
        "<td style='font-family:\"IBM Plex Mono\",monospace;font-size:12px'>" +
        a.beta +
        "</td>" +
        "<td><span class='risk-badge risk-" +
        risk +
        "'>" +
        a.riskScore +
        "</span></td>";

    tbody.appendChild(tr);
}

  // Gráfico de barras de pesos
    const grafico = document.getElementById("graficoPesos");
    grafico.innerHTML = "";

    for (let i = 0; i < data.activos.length; i++) {
        const a = data.activos[i];
        const fila = document.createElement("div");
        fila.style.cssText = "display:flex;align-items:center;gap:12px";

        const label = document.createElement("div");
        label.style.cssText =
            "width:140px;font-size:12px;color:var(--text2);font-family:'IBM Plex Mono',monospace;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        label.textContent = a.empresa;

        const barWrap = document.createElement("div");
        barWrap.style.cssText =
            "flex:1;background:var(--surface2);border-radius:3px;height:20px;position:relative";

        const bar = document.createElement("div");
        bar.style.cssText =
            "height:100%;width:" +
        a.peso +
            "%;background:var(--accent);border-radius:3px;transition:width .6s ease";

    const pct = document.createElement("div");
    pct.style.cssText =
        "position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--text2)";
    pct.textContent = a.peso + "%";

    barWrap.appendChild(bar);
    barWrap.appendChild(pct);
    fila.appendChild(label);
    fila.appendChild(barWrap);
    grafico.appendChild(fila);
}

window.scrollTo({ top: 400, behavior: "smooth" });
}
