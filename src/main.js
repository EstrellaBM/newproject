import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";

/* =============================
    CONFIG
============================= */

const API_BASE = "https://desarrolloiot.onrender.com"; // Tu API
const ENDPOINTS = {
  status: `${API_BASE}/status`,
  turnOn: `${API_BASE}/turn-on`, // Corregido: removido "/status"
  turnOff: `${API_BASE}/turn-off`, // Corregido: removido "/status"
  registerDevice: `${API_BASE}/register-device`,
};

// Login simulado:
const TOKEN_KEY = "token_demo";
/* =============================

    AUTH HELPERS

============================= */

const isAuthenticated = () => Boolean(localStorage.getItem(TOKEN_KEY));

const login = () => localStorage.setItem(TOKEN_KEY, "FAKE_TOKEN");

const logout = () => {
  localStorage.removeItem(TOKEN_KEY);

  localStorage.removeItem("last_email"); // También eliminamos el email guardado
};

const getToken = () => localStorage.getItem(TOKEN_KEY);

/* =============================

    DOM REFS

============================= */

const loginView = document.querySelector("#loginView");

const dashboardView = document.querySelector("#dashboardView");

const lightView = document.querySelector("#lightView");

const loginForm = document.querySelector("#loginForm");

const emailInput = document.querySelector("#email");

const passInput = document.querySelector("#password");

const loginError = document.querySelector("#loginError");

const loginBtn = document.querySelector("#loginBtn");

const logoutBtn = document.querySelector("#logoutBtn");

const userEmailSpan = document.querySelector("#userEmail");

const links = Array.from(document.querySelectorAll("[data-view]"));

const lightBulb = document.querySelector("#lightBulb");

const lightText = document.querySelector("#lightStateText");

const lightError = document.querySelector("#lightError");

const lightStatusBadge = document.querySelector("#lightStatusBadge");

const btnOn = document.querySelector("#btnOn");

const btnOff = document.querySelector("#btnOff");

/* =============================

    UI STATE

============================= */

function showView(view) {
  // Oculta todas

  loginView.classList.add("d-none");

  dashboardView.classList.add("d-none");

  lightView.classList.add("d-none"); // Rutas protegidas

  if (!isAuthenticated() && (view === "dashboard" || view === "light")) {
    loginView.classList.remove("d-none");

    return;
  }

  if (view === "login") loginView.classList.remove("d-none");

  if (view === "dashboard") dashboardView.classList.remove("d-none");

  if (view === "light") {
    lightView.classList.remove("d-none"); // cada vez que entras al control, refresca estado

    getStatus();
  }
}

function updateNav() {
  if (isAuthenticated()) {
    userEmailSpan.textContent = localStorage.getItem("last_email") || "Usuario";

    userEmailSpan.classList.remove("d-none");

    loginBtn.classList.add("d-none");

    logoutBtn.classList.remove("d-none");
  } else {
    userEmailSpan.textContent = "";

    userEmailSpan.classList.add("d-none");

    loginBtn.classList.remove("d-none");

    logoutBtn.classList.add("d-none");
  }
}

/* =============================

    EVENTOS GENERALES

============================= */

links.forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();

    const view = a.getAttribute("data-view"); // activa visualmente el link

    links.forEach((l) => l.classList.remove("active"));

    a.classList.add("active");

    showView(view);
  });
});

loginBtn.addEventListener("click", () => showView("login"));

logoutBtn.addEventListener("click", () => {
  logout();

  updateNav(); // vuelve a login

  links.forEach((l) => l.classList.remove("active"));

  showView("login");
});

/* =============================

    LOGIN (PERSONALIZADO)

============================= */

// Nueva función para registrar el dispositivo con más datos

async function registerDevice(email, password, lightStatus) {
  try {
    const res = await fetch(ENDPOINTS.registerDevice, {
      method: "POST",

      headers: authHeaders(),

      body: JSON.stringify({
        // Se asume que tu backend espera "device_name", "enroll_id" y "status"

        device_name: email,

        enroll_id: password,

        status: lightStatus,
      }),
    });

    if (!res.ok) {
      throw new Error("No se pudo registrar el dispositivo en el backend");
    }

    const data = await res.json();

    console.log("Dispositivo registrado con éxito:", data);
  } catch (err) {
    console.error("Error al registrar dispositivo:", err); // Podrías mostrar un mensaje de error al usuario si lo deseas
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("d-none");

  const email = emailInput.value.trim();
  const pass = passInput.value;

  if (email && pass) {
    login(); // Simula el login
    localStorage.setItem("last_email", email);
    updateNav();

    // 1. Obtener el estado actual del foco desde la API
    let currentLightStatus = "off"; // Valor predeterminado
    try {
      const statusRes = await fetch(ENDPOINTS.status);
      const statusData = await statusRes.json();
      // ¡Aquí está el cambio! Solo toma el valor booleano
      const isOn = statusData.status.isOn;
      // Y lo convierte a un string "on" o "off"
      currentLightStatus = isOn ? "on" : "off";
    } catch (err) {
      console.error(
        "No se pudo obtener el estado del foco para registrarlo:",
        err
      );
    }

    // 2. Llama a la nueva función para registrar el dispositivo con el email, contraseña y el string "on"/"off"
    await registerDevice(email, pass, currentLightStatus);

    // Navega al dashboard
    links.forEach((l) => l.classList.remove("active"));
    document.querySelector('[data-view="dashboard"]').classList.add("active");
    showView("dashboard");
  } else {
    loginError.textContent = "Por favor, ingresa un email y una contraseña.";
    loginError.classList.remove("d-none");
  }
});

/* =============================

    CONTROL FOCO (API)

============================= */

function renderLight(state) {
  const isOn = state === "on" || state === true;

  if (isOn) {
    lightBulb.classList.add("bulb-on");

    lightBulb.classList.remove("bulb-off");

    lightText.textContent = "Encendido";

    lightStatusBadge.className = "badge text-bg-success";

    lightStatusBadge.textContent = "Encendido";
  } else {
    lightBulb.classList.add("bulb-off");

    lightBulb.classList.remove("bulb-on");

    lightText.textContent = "Apagado";

    lightStatusBadge.className = "badge text-bg-secondary";

    lightStatusBadge.textContent = "Apagado";
  }
}

async function getStatus() {
  try {
    lightError.classList.add("d-none");

    const res = await fetch(ENDPOINTS.status, {
      headers: authHeaders(),
    }); // Suponiendo { status: "on" } / { status: "off" }

    const data = await res.json();

    renderLight(data.status);
  } catch (err) {
    console.error("Error al obtener estado:", err);

    lightError.textContent = "No se pudo obtener el estado del foco";

    lightError.classList.remove("d-none");
  }
}

async function turnOn() {
  try {
    lightError.classList.add("d-none");

    await fetch(ENDPOINTS.turnOn, {
      method: "POST",

      headers: authHeaders(),
    });

    renderLight("on");
  } catch (err) {
    console.error("Error al encender:", err);

    lightError.textContent = "No se pudo encender el foco";

    lightError.classList.remove("d-none");
  }
}

async function turnOff() {
  try {
    lightError.classList.add("d-none");

    await fetch(ENDPOINTS.turnOff, {
      method: "POST",

      headers: authHeaders(),
    });

    renderLight("off");
  } catch (err) {
    console.error("Error al apagar:", err);

    lightError.textContent = "No se pudo apagar el foco";

    lightError.classList.remove("d-none");
  }
}

// Si tu backend pide Authorization, la enviamos.

// En este demo, solo se agrega si hay token.

function authHeaders() {
  const headers = { "Content-Type": "application/json" };

  const token = getToken();

  if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

btnOn.addEventListener("click", turnOn);

btnOff.addEventListener("click", turnOff);

/* =============================

    INICIALIZACIÓN

============================= */

updateNav();

// al cargar, muestra login o dashboard según token

showView(isAuthenticated() ? "dashboard" : "login");
