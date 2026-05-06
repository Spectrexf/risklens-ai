const API_BASE = "http://localhost:3001";

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + token,
};

function loadUserData() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = user.name || "";
  const email = user.email || "";
  const initials = (name || email).substring(0, 2).toUpperCase() || "U";

  document.getElementById("profileAvatar").textContent = initials;
  document.getElementById("userAvatar").textContent = initials;
  document.getElementById("profileName").textContent =
    name || email || "Sin nombre";
  document.getElementById("profileEmail").textContent = email || "—";
  document.getElementById("userName").textContent = name || email || "Usuario";
  const planLabel = user.role === "admin" ? "Admin" : (user.plan || "Free");
  document.getElementById("userPlan").textContent = planLabel;
  document.getElementById("profilePlan").textContent = "Plan " + planLabel;
    "Plan " + (user.plan || "Free");

  const parts = name.split(" ");
  document.getElementById("inputName").value = parts[0] || "";
  const surnames = [];
  for (let i = 1; i < parts.length; i++) surnames.push(parts[i]);
  document.getElementById("inputSurname").value = surnames.join(" ") || "";
  document.getElementById("inputEmail").value = email;
}

loadUserData();

async function loadStats() {
  try {
    const res = await fetch(API_BASE + "/analysis", { headers });
    const data = await res.json();
    if (!data.ok) return;

    const items = data.items || [];
    document.getElementById("statAnalisis").textContent = items.length;

    const empresasUnicas = new Set();
    for (let i = 0; i < items.length; i++) {
      if (items[i].companyName)
        empresasUnicas.add(items[i].companyName.toLowerCase().trim());
    }
    document.getElementById("statPdfs").textContent = empresasUnicas.size;

    if (items.length > 0) {
      const first = new Date(items[items.length - 1].createdAt);
      const now = new Date();
      const meses = Math.max(
        1,
        Math.round((now - first) / (1000 * 60 * 60 * 24 * 30)),
      );
      document.getElementById("statMeses").textContent = meses;
    } else {
      document.getElementById("statMeses").textContent = "0";
    }
  } catch (err) {
    console.error("Error stats:", err.message);
  }
}

loadStats();

document.getElementById("btnSave").addEventListener("click", function () {
  const btn = document.getElementById("btnSave");
  const firstName = document.getElementById("inputName").value.trim();
  const lastName = document.getElementById("inputSurname").value.trim();
  const email = document.getElementById("inputEmail").value.trim();

  const nameParts = [];
  if (firstName) nameParts.push(firstName);
  if (lastName) nameParts.push(lastName);
  const name = nameParts.join(" ");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  user.name = name;
  user.email = email;
  localStorage.setItem("user", JSON.stringify(user));

  loadUserData();

  btn.textContent = "Guardado";
  btn.disabled = true;

  setTimeout(function () {
    btn.textContent = "Guardar cambios";
    btn.disabled = false;
  }, 2000);
});

document.getElementById("btnLogout").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});

document.getElementById("btnSugerencia").addEventListener("click", function () {
  document.getElementById("modalSug").style.display = "flex";
});

document
  .getElementById("btnCerrarModal")
  .addEventListener("click", function () {
    document.getElementById("modalSug").style.display = "none";
    document.getElementById("textoSug").value = "";
    document.getElementById("sugError").style.display = "none";
  });

document
  .getElementById("btnEnviarSug")
  .addEventListener("click", async function () {
    const texto = document.getElementById("textoSug").value.trim();
    const errorEl = document.getElementById("sugError");
    const btn = document.getElementById("btnEnviarSug");

    errorEl.style.display = "none";

    if (!texto || texto.length < 5) {
      errorEl.textContent = "La sugerencia es demasiado corta.";
      errorEl.style.display = "block";
      return;
    }

    btn.textContent = "Enviando...";
    btn.disabled = true;

    try {
      const res = await fetch(API_BASE + "/suggestions", {
        method: "POST",
        headers,
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error || "Error al enviar");

      document.getElementById("modalSug").style.display = "none";
      document.getElementById("textoSug").value = "";
      alert("Sugerencia enviada. ¡Gracias!");
    } catch (err) {
      errorEl.textContent = "Error: " + err.message;
      errorEl.style.display = "block";
    } finally {
      btn.textContent = "Enviar";
      btn.disabled = false;
    }
  });
