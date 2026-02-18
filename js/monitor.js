// js/monitor.js (reemplaza completamente tu archivo monitor.js)
let weightChart = null;
let statusChart = null;
let refreshIntervalId = null;

/** Utils */
function fmtStatus(code) {
  if (code === 1 || code === "1") return "Apagado";
  if (code === 2 || code === "2") return "Dispensando";
  if (code === 3 || code === "3") return "Error";
  return "Desconocido";
}
function safeParseDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt) ? null : dt;
}
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Obtiene todos los eventos desde la API.
 *  Usa API_URL si está definido en api.js, si no usa la constante interna.
 */
async function fetchAllEvents() {
  const endpoint = (typeof API_URL !== "undefined") ? API_URL : "https://699520f4b081bc23e9c212ce.mockapi.io/api/v1/ganado_IoT";
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error("monitor.fetchAllEvents ->", err);
    return [];
  }
}

/** Llena el select con nombres distintos */
async function populateDeviceSelect() {
  const select = document.getElementById("monitorDeviceSelect");
  if (!select) return;
  const events = await fetchAllEvents();
  const names = new Set();

  for (const ev of events) {
    if (ev.deviceName) names.add(ev.deviceName);
  }

  if (names.size === 0) {
    // Fallback a los nombres que tienes en UI (modifícalos si tus dispositivos usan otro nombre)
    ["Dispensador1", "Dispensador2", "Dispensador3"].forEach(n => names.add(n));
  }

  // Construye opciones y conserva selección si ya había
  const prev = select.value;
  select.innerHTML = Array.from(names).map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
  if (prev && Array.from(names).includes(prev)) select.value = prev;

  // Evento
  select.onchange = () => updateMonitorNow();
}

/** Inicializa o reutiliza los charts */
function ensureCharts() {
  const weightCtx = document.getElementById("weightChart").getContext("2d");
  const statusCtx = document.getElementById("statusChart").getContext("2d");

  if (!weightChart) {
    weightChart = new Chart(weightCtx, {
      type: "line",
      data: { datasets: [{ label: "Peso (gr)", data: [], fill: false, tension: 0.2, pointRadius: 3 }] },
      options: {
        responsive: true,
        scales: {
          x: {
            type: "time",
            time: { unit: "minute", tooltipFormat: "PPpp" },
            title: { display: false }
          },
          y: { beginAtZero: true, suggestedMax: 40000 }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  if (!statusChart) {
    statusChart = new Chart(statusCtx, {
      type: "line",
      data: { datasets: [{ label: "Estatus", data: [], stepped: true, pointRadius: 3 }] },
      options: {
        responsive: true,
        scales: {
          x: { type: "time", time: { unit: "minute", tooltipFormat: "PPpp" } },
          y: {
            min: 0.5,
            max: 3.5,
            ticks: {
              stepSize: 1,
              callback: function(val) {
                if (val === 1) return "Apagado";
                if (val === 2) return "Dispensando";
                if (val === 3) return "Error";
                return val;
              }
            }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

/** Actualiza gráficas y tabla para el dispensador seleccionado */
async function updateMonitorNow() {
  const select = document.getElementById("monitorDeviceSelect");
  const lastUpdateSpan = document.getElementById("monitorLastUpdate");
  if (!select) return;
  const chosenName = select.value;

  const all = await fetchAllEvents(); // array
  // Filtra por deviceName (asegura string)
  const filtered = all.filter(ev => String(ev.deviceName) === String(chosenName));

  // Mapea y ordena por fecha asc
  const parsed = filtered.map(ev => ({
    raw: ev,
    date: safeParseDate(ev.dateTime) || new Date(0),
    statusCode: Number(ev.statusCode) || 0,
    weight: (ev.weight === undefined || ev.weight === null) ? null : Number(ev.weight),
    dispenseWeight: (ev.dispenseWeight === undefined || ev.dispenseWeight === null) ? null : Number(ev.dispenseWeight)
  })).sort((a,b) => a.date - b.date);

  // Preparar datos para charts (últimos 50)
  const lastN = parsed.slice(-50);
  const labels = lastN.map(p => p.date);
  const weightData = lastN.map(p => p.weight);
  const statusData = lastN.map(p => p.statusCode);

  ensureCharts();

  // actualizar weightChart
  weightChart.data.labels = labels;
  weightChart.data.datasets[0].data = labels.map((dt,i) => ({ x: dt, y: weightData[i] ?? null }));
  weightChart.update();

  // actualizar statusChart
  statusChart.data.labels = labels;
  statusChart.data.datasets[0].data = labels.map((dt,i) => ({ x: dt, y: statusData[i] ?? null }));
  statusChart.update();

  // tabla: últimos 10 (desc)
  const tableBody = document.getElementById("monitorTableBody");
  tableBody.innerHTML = "";
  const last10desc = parsed.slice(-10).reverse();
  if (last10desc.length === 0) {
    // si no hay registros, muestra una fila útil
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "text-center text-muted";
    td.textContent = "No hay registros para este dispensador aún.";
    tr.appendChild(td);
    tableBody.appendChild(tr);
  } else {
    last10desc.forEach(p => {
      const ev = p.raw;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(ev.id ?? "")}</td>
        <td>${escapeHtml(ev.deviceName ?? "")}</td>
        <td>${escapeHtml(ev.description ?? "")}</td>
        <td>${escapeHtml(fmtStatus(ev.statusCode))}</td>
        <td>${escapeHtml(ev.weight ?? "-")}</td>
        <td>${escapeHtml(ev.dispenseWeight ?? "-")}</td>
        <td>${escapeHtml((safeParseDate(ev.dateTime) || new Date()).toLocaleString())}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  if (lastUpdateSpan) lastUpdateSpan.textContent = new Date().toLocaleTimeString();
}

/** Arranca el monitor (populate select y setInterval) */
async function startMonitor() {
  await populateDeviceSelect();
  ensureCharts();
  await updateMonitorNow();

  if (refreshIntervalId) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(updateMonitorNow, 2000);
}

/* Autoarranque cuando DOM listo y existe la pestaña */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("monitorTab")) {
    startMonitor().catch(err => console.error("startMonitor error:", err));
  }
});
