// Bootstrap desde npm (sin CDN)
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";

/* =============================
    CONFIG
============================= */
const API_BASE = "https://desarrolloiot.onrender.com";
const ENDPOINTS = {
  register: `${API_BASE}/register-device`,
  login: `${API_BASE}/login-device`,
  status: `${API_BASE}/device-status`,
  on: `${API_BASE}/turn-on-device`,
  off: `${API_BASE}/turn-off-device`,
  logs: `${API_BASE}/device-logs`,
};
const TOKEN_KEY = "device_token";

/* =============================
    AUTH HELPERS
============================= */
const isAuthenticated = () => Boolean(localStorage.getItem(TOKEN_KEY));
const login = (token, deviceName, enrollId) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("device_name", deviceName);
  localStorage.setItem("enroll_id", enrollId);
};
const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("device_name");
  localStorage.removeItem("enroll_id");
};
const getToken = () => localStorage.getItem(TOKEN_KEY);

/* =============================
    DOM REFS
============================= */
const views = {
  welcome: document.getElementById("welcomeView"),
  register: document.getElementById("registerView"),
  login: document.getElementById("loginView"),
  control: document.getElementById("controlView"),
};

const registerForm = document.getElementById("registerForm");
const deviceNameInput = document.getElementById("deviceName");
const enrollIdInput = document.getElementById("enrollId");
const registerMessage = document.getElementById("registerMessage");
const registerBtn = document.getElementById("registerBtn");

const loginForm = document.getElementById("loginForm");
const loginEnrollIdInput = document.getElementById("loginEnrollId");
const loginMessage = document.getElementById("loginMessage");

const logoutBtn = document.getElementById("logoutBtn");
const navLinks = Array.from(document.querySelectorAll("nav a"));

const deviceNameDisplay = document.getElementById("deviceNameDisplay");
const enrollIdDisplay = document.getElementById("enrollIdDisplay");
const lastValueDisplay = document.getElementById("lastValueDisplay");
const statusDisplay = document.getElementById("statusDisplay");
const turnOnBtn = document.getElementById("turnOnBtn");
const turnOffBtn = document.getElementById("turnOffBtn");
const refreshBtn = document.getElementById("refreshBtn");
const logsTableBody = document.querySelector("#logsTable tbody");

/* =============================
    UI STATE & NAVIGATION
============================= */
function showView(viewName) {
  Object.values(views).forEach((view) => {
    view.style.display = "none";
  });
  views[viewName].style.display = "flex";
  updateNav(viewName);
}

function updateNav(currentView) {
  if (isAuthenticated()) {
    logoutBtn.style.display = "inline-block";
  } else {
    logoutBtn.style.display = "none";
  }
  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("data-view") === currentView) {
      link.classList.add("active");
    }
  });
}

function updateControlPanel() {
  deviceNameDisplay.textContent = localStorage.getItem("device_name");
  enrollIdDisplay.textContent = localStorage.getItem("enroll_id");
}

/* =============================
    EVENT LISTENERS
============================= */
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const view = link.getAttribute("data-view");

    if (isAuthenticated()) {
      if (view === "logout") {
        handleLogout();
      } else {
        // Si el usuario está autenticado, no lo dejes ir a login/register,
        // pero si lo dejes ir a "Home" que ahora es el dashboard.
        if (view === "welcome" || view === "register" || view === "login") {
          showView("control");
        } else {
          showView(view);
        }
      }
    } else {
      // Si no está autenticado, lo dejas ir a cualquier vista
      showView(view);
    }
  });
});

logoutBtn.addEventListener("click", () => {
  handleLogout();
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const deviceName = deviceNameInput.value.trim();
  const enrollId = enrollIdInput.value.trim();

  registerMessage.textContent = "";
  registerMessage.style.color = "red";
  registerBtn.disabled = true;

  try {
    const res = await fetch(ENDPOINTS.register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName, enrollId }),
    });

    const data = await res.json();

    if (res.ok) {
      registerMessage.textContent =
        data.message || "Dispositivo registrado exitosamente.";
      registerMessage.style.color = "lightgreen";
      registerForm.reset();
    } else {
      registerMessage.textContent =
        data.message || "Error al registrar el dispositivo. Intenta de nuevo.";
    }
  } catch (err) {
    console.error("Error en la solicitud de registro:", err);
    registerMessage.textContent =
      "Error de red: No se pudo conectar al servidor. Asegúrate de que está en línea.";
  } finally {
    registerBtn.disabled = false;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const enrollId = loginEnrollIdInput.value.trim();
  loginMessage.textContent = "";

  try {
    const res = await fetch(ENDPOINTS.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollId }),
    });
    const data = await res.json();
    if (res.ok) {
      login(data.token, data.deviceName, data.enrollId);
      showView("control");
      updateControlPanel();
      getDeviceStatus();
      getDeviceLogs();
    } else {
      loginMessage.textContent = data.message || "Enroll ID no encontrado.";
      loginMessage.style.color = "red";
    }
  } catch (err) {
    loginMessage.textContent = "Error en la conexión. Intente de nuevo.";
    loginMessage.style.color = "red";
  }
});

turnOnBtn.addEventListener("click", () => controlDevice("on"));
turnOffBtn.addEventListener("click", () => controlDevice("off"));
refreshBtn.addEventListener("click", () => getDeviceStatus());

/* =============================
    API CALLS & LOGIC
============================= */
async function getDeviceStatus() {
  if (!isAuthenticated()) return;
  try {
    const res = await fetch(ENDPOINTS.status, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) {
      statusDisplay.textContent = data.status;
      lastValueDisplay.textContent = data.lastValue;
    } else {
      console.error(data.message);
    }
  } catch (err) {
    console.error("Failed to fetch device status:", err);
  }
}

async function getDeviceLogs() {
  if (!isAuthenticated()) return;
  try {
    const res = await fetch(ENDPOINTS.logs, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) {
      logsTableBody.innerHTML = "";
      data.forEach((log) => {
        const row = `<tr><td>${log.action}</td><td>${new Date(
          log.timestamp
        ).toLocaleString()}</td></tr>`;
        logsTableBody.innerHTML += row;
      });
    }
  } catch (err) {
    console.error("Failed to fetch device logs:", err);
  }
}

async function controlDevice(action) {
  if (!isAuthenticated()) return;
  const url = action === "on" ? ENDPOINTS.on : ENDPOINTS.off;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ deviceId: localStorage.getItem("enroll_id") }),
    });
    const data = await res.json();
    if (res.ok) {
      getDeviceStatus();
      getDeviceLogs();
    } else {
      console.error(data.message);
    }
  } catch (err) {
    console.error(`Failed to ${action} device:`, err);
  }
}

function handleLogout() {
  logout();
  showView("welcome");
}

// Initial state
showView("welcome");
