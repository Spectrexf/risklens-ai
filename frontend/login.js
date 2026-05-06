const API_BASE = "http://localhost:3001";

// Si ya hay token válido, saltar al dashboard
if (localStorage.getItem("token")) {
    window.location.href = "index.html";
}

const btnLogin = document.getElementById("btnLogin");
const emailInput = document.getElementById("emailInput");
const passInput = document.getElementById("passwordInput");
const errorEl = document.getElementById("loginError");

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
}
function hideError() {
    errorEl.style.display = "none";
}

btnLogin.addEventListener("click", async function () {
    hideError();

    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
        showError("Introduce tu email y contraseña.");
        return;
    }

    btnLogin.textContent = "Iniciando sesión...";
    btnLogin.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

    if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "index.html";
    } else {
        showError(data.error || data.message || "Credenciales incorrectas.");
    }
    } catch (err) {
        showError("No se puede conectar con el servidor. ¿Está activo?");
    } finally {
        btnLogin.textContent = "Iniciar sesión →";
        btnLogin.disabled = false;
    }
});

passInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") btnLogin.click();
});
emailInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") passInput.focus();
});
