// js/control.js
// Simulación local de 3 dispensadores. No se leen desde la API para mostrar estado.
// Al presionar "Activar" se POSTEA un registro a MockAPI con los datos del intento.

const DISPENSERS = [
  { id: "1", deviceName: "Dispensador 1", description: "Zacate", statusCode: 1, weight: randWeight(), dispenseWeight: 0, dateTime: null },
  { id: "2", deviceName: "Dispensador 2", description: "Alfalfa", statusCode: 1, weight: randWeight(), dispenseWeight: 0, dateTime: null },
  { id: "3", deviceName: "Dispensador 3", description: "Grano", statusCode: 1, weight: randWeight(), dispenseWeight: 0, dateTime: null }
];

// helpers
function randWeight() {
  // 0 .. 40000 inclusive
  return Math.floor(Math.random() * 40001);
}
function newRandomDifferent(prev) {
  let tries = 0;
  let v = prev;
  while (v === prev && tries < 10) {
    v = randWeight();
    tries++;
  }
  return v;
}

function statusText(code) {
  if (code === 1) return "Apagado";
  if (code === 2) return "Dispensando";
  if (code === 3) return "Error";
  return "Desconocido";
}

function statusClass(code) {
  if (code === 1) return "status-off";
  if (code === 2) return "status-on";
  if (code === 3) return "status-err";
  return "status-off";
}

function levelLabel(weight) {
  if (weight >= 40000) return "Lleno";
  if (weight >= 20000) return "Medio";
  if (weight < 5000) return "Vacío";
  return "Bajo";
}

function formatGrams(n) {
  return `${n} gr`;
}

/** Renderiza las tarjetas en la pestaña Control usando el array DISPENSERS */
function renderControl() {
  const container = document.getElementById("controlDevices");
  container.innerHTML = "";

  DISPENSERS.forEach(d => {
    const col = document.createElement("div");
    col.className = "col-md-4 mb-3";

    // card
    const card = document.createElement("div");
    card.className = "card card-device h-100";

    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    // title + description
    const title = document.createElement("h5");
    title.textContent = d.deviceName;
    body.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "small-note mb-2";
    desc.textContent = d.description;
    body.appendChild(desc);

    // status badge
    const statusWrap = document.createElement("div");
    statusWrap.className = "mb-2 d-flex align-items-center gap-2";

    const badge = document.createElement("span");
    badge.className = `status-badge ${statusClass(d.statusCode)}`;
    badge.id = `status-badge-${d.id}`;
    badge.textContent = statusText(d.statusCode);
    statusWrap.appendChild(badge);

    const levelSpan = document.createElement("small");
    levelSpan.className = "ms-auto small-note";
    levelSpan.id = `level-text-${d.id}`;
    levelSpan.textContent = `${levelLabel(d.weight)} • ${formatGrams(d.weight)}`;
    statusWrap.appendChild(levelSpan);

    body.appendChild(statusWrap);

    // progress bar visual simple
    const progressWrap = document.createElement("div");
    progressWrap.className = "progress-level mb-3";
    progressWrap.innerHTML = `<div class="bar bg-success" id="level-bar-${d.id}" style="width:${Math.min((d.weight/40000)*100,100)}%"></div>`;
    body.appendChild(progressWrap);

    // input dispense weight
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.placeholder = "Peso a dispensar (gr)";
    input.className = "form-control mb-2";
    input.id = `input-dispense-${d.id}`;
    body.appendChild(input);

    // button
    const btn = document.createElement("button");
    btn.className = "btn btn-primary mt-auto";
    btn.id = `btn-activate-${d.id}`;
    btn.textContent = "Activar";
    btn.onclick = () => onActivateClicked(d.id);
    body.appendChild(btn);

    // note area for error messages
    const note = document.createElement("div");
    note.className = "mt-2 small-note text-danger";
    note.id = `note-${d.id}`;
    body.appendChild(note);

    card.appendChild(body);
    col.appendChild(card);
    container.appendChild(col);
  });
}

function getLocalDateTime() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}


/** Handler cuando el usuario presiona Activar en una tarjeta */
async function onActivateClicked(id) {
  const dispenser = DISPENSERS.find(x => x.id === id);
  if (!dispenser) return;

  const input = document.getElementById(`input-dispense-${id}`);
  const btn = document.getElementById(`btn-activate-${id}`);
  const note = document.getElementById(`note-${id}`);
  note.textContent = "";

  let toDispense = parseInt(input.value, 10);
  if (!Number.isFinite(toDispense) || toDispense <= 0) {
    note.textContent = "Introduce una cantidad válida (> 0)";
    return;
  }

  // Simulated current weight (local)
  const currentWeight = dispenser.weight;

  // Disable button while processing
  btn.disabled = true;

  // If not enough weight -> set error status for 4s and POST error
  if (currentWeight < toDispense) {
    // set status error
    dispenser.statusCode = 3; // error
    updateCardUI(dispenser);

    // prepare payload
    const payload = {
      deviceName: dispenser.deviceName,
      description: dispenser.description,
      statusCode: 3,
      weight: currentWeight,
      dispenseWeight: toDispense,
      dateTime: getLocalDateTime()
    };

    try {
      await postEvent(payload);
    } catch (err) {
      // muestra mensaje no intrusivo
      note.textContent = "Error al registrar en API: " + (err.message || err);
    }

    // Mantener error 4 segundos
    setTimeout(() => {
      // después de 4s generar un nuevo número aleatorio distinto
      dispenser.weight = newRandomDifferent(currentWeight);
      dispenser.statusCode = 1; // apagado
      updateCardUI(dispenser);
      btn.disabled = false;
      input.value = "";
    }, 4000);

    return;
  }

  // Caso OK: suficiente peso -> simulamos dispensado (status = 2) por 4s
  dispenser.statusCode = 2; // dispensando
  updateCardUI(dispenser);

  // Build payload BEFORE changing the simulated weight (registro del evento con el valor actual)
  const payloadOk = {
    deviceName: dispenser.deviceName,
    description: dispenser.description,
    statusCode: 2,
    weight: currentWeight,
    dispenseWeight: toDispense,
    dateTime: getLocalDateTime()
  };

  try {
    await postEvent(payloadOk);
  } catch (err) {
    note.textContent = "Error al registrar en API: " + (err.message || err);
  }

  // Mantener "Dispensando" 4 segundos
  setTimeout(() => {
    // Después de dispensar: generamos un nuevo número aleatorio distinto como solicitaste
    dispenser.weight = newRandomDifferent(currentWeight);
    dispenser.statusCode = 1; // vuelve a apagado
    updateCardUI(dispenser);
    btn.disabled = false;
    input.value = "";
  }, 4000);
}

/** Actualiza elementos UI en la tarjeta del dispenser pasado */
function updateCardUI(dispenser) {
  const badge = document.getElementById(`status-badge-${dispenser.id}`);
  const levelText = document.getElementById(`level-text-${dispenser.id}`);
  const levelBar = document.getElementById(`level-bar-${dispenser.id}`);

  if (badge) {
    badge.className = `status-badge ${statusClass(dispenser.statusCode)}`;
    badge.textContent = statusText(dispenser.statusCode);
  }
  if (levelText) {
    levelText.textContent = `${levelLabel(dispenser.weight)} • ${formatGrams(dispenser.weight)}`;
  }
  if (levelBar) {
    const pct = Math.min((dispenser.weight/40000)*100,100);
    levelBar.style.width = pct + "%";
  }
}

/* Exported for index.html to call on load */
window.renderControl = renderControl;
