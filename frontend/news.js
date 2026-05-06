const API_BASE = "http://localhost:3001";

// ── AUTH GUARD ───────────────────────────────────────────────
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// User info sidebar
const user = JSON.parse(localStorage.getItem("user") || "{}");
if (user.name || user.email) {
    document.getElementById("userAvatar").textContent = (user.name || user.email)
        .substring(0, 2)
        .toUpperCase();
    document.getElementById("userName").textContent = user.name || user.email;
}

// ── HELPERS ───────────────────────────────────────────────────
// Tu backend devuelve: item.impact = 'high' | 'medium' | 'low'
const impactColors = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const impactLabels = {
    high: "▲ Impacto alto",
    medium: "◆ Impacto medio",
    low: "▼ Impacto bajo",
};
const impactClasses = {
    high: "impact-high",
    medium: "impact-medium",
    low: "impact-low",
};

// Intentar inferir categoría del título si el backend no la devuelve
function inferTag(item) {
    if (item.tag || item.category) return item.tag || item.category;
    const t = (item.title || "").toLowerCase();

    if (
        t.indexOf("eur") !== -1 ||
        t.indexOf("usd") !== -1 ||
        t.indexOf("forex") !== -1 ||
        t.indexOf("divisa") !== -1
    )
        return "Forex";
    if (
        t.indexOf("bitcoin") !== -1 ||
        t.indexOf("crypto") !== -1 ||
        t.indexOf("btc") !== -1
    )
    return "Cripto";
if (
    t.indexOf("petróleo") !== -1 ||
    t.indexOf("oro") !== -1 ||
    t.indexOf("brent") !== -1
)
    return "Materias primas";
    if (
        t.indexOf("bono") !== -1 ||
        t.indexOf("tipo") !== -1 ||
        t.indexOf("bce") !== -1 ||
        t.indexOf("fed") !== -1
)
    return "Macro";

    return "Mercados";
}

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Hace menos de 1h";
    if (h < 24) return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)}d`;
}

// ── STATE ─────────────────────────────────────────────────────
let allNews = [];
let currentFilter = "all";

// ── RENDER ────────────────────────────────────────────────────
function renderNews(filter = "all") {
    const grid = document.getElementById("newsGrid");

    let data = [];
    if (filter === "all") {
    data = allNews;
} else {
    for (let i = 0; i < allNews.length; i++) {
        if (inferTag(allNews[i]) === filter) {
            data.push(allNews[i]);
        }
    }
}

    grid.innerHTML = "";

    if (data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Sin noticias</div><div class="empty-desc">No hay noticias para este filtro</div></div>`;
    return;
}

    for (let i = 0; i < data.length; i++) {
        const n = data[i];
        const impact = (n.impact || "low").toLowerCase();
        const tag = inferTag(n);
        const date = timeAgo(n.pubDate || n.date || n.createdAt);
        const color = impactColors[impact] || impactColors.low;
        const label = impactLabels[impact] || impactLabels.low;
        const cls = impactClasses[impact] || impactClasses.low;

        const card = document.createElement("div");
        card.className = "news-card fade-up";
        card.style.animationDelay = i * 0.05 + "s";
        card.style.setProperty("--impact-color", color);

    card.innerHTML = `
        <div class="news-card-left">
        <div class="news-source">
            ${n.source || "NOTICIAS"}
            <span class="tag">${tag}</span>
        </div>
        <div class="news-headline">${n.title || "—"}</div>
        <div class="news-desc">${n.description || n.summary || ""}</div>
        <div class="news-meta">
            ${date ? `<span>🕐 ${date}</span><span>•</span>` : ""}
            ${n.link ? `<a href="${n.link}" target="_blank" style="color:var(--accent2);text-decoration:none">Leer completo →</a>` : "<span>Leer completo →</span>"}
        </div>
        </div>
        <div>
            <div class="impact-badge ${cls}">${label}</div>
        </div>
    `;
    grid.appendChild(card);
}
}

// ── LOAD FROM BACKEND ─────────────────────────────────────────
// Tu backend: GET /news → { items: [{title, link, description, impact, pubDate, source}] }
async function loadNews() {
    const grid = document.getElementById("newsGrid");
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:pulse 1.5s infinite">📡</div><div class="empty-title">Cargando noticias...</div></div>`;

    try {
        const res = await fetch(`${API_BASE}/news`, {
            headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error al cargar noticias");

    allNews = data.items || data || [];
    renderNews(currentFilter);
} catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar</div><div class="empty-desc">${err.message}</div></div>`;
    }
}

// ── FILTER CHIPS ─────────────────────────────────────────────
document.getElementById("newsFilters").addEventListener("click", function (e) {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    const filterChips = document.querySelectorAll(".filter-chip");
    for (let i = 0; i < filterChips.length; i++) {
    filterChips[i].classList.remove("active");
}
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    renderNews(currentFilter);
});

// ── INIT ─────────────────────────────────────────────────────
loadNews();
