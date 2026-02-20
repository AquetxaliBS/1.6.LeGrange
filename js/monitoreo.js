// js/monitoreo.js

const monitoreoContent = document.getElementById('monitoreo-content');

// Plantilla HTML (Le agregamos un ID a la etiqueta de Capacidad para cambiarla dinámicamente)
monitoreoContent.innerHTML = `
    <div class="row mb-4">
        <div class="col-md-6 offset-md-3">
            <label class="form-label fw-bold">Monitoreo de silos:</label>
            <select id="select-dispensador" class="form-select form-select-lg shadow-sm" onchange="iniciarMonitoreo()">
                <option value="">-- Vista global --</option>
            </select>
        </div>
    </div>

    <div id="dashboard-global">
        <div class="row mb-4 text-center">
            <div class="col-md-6 mb-3">
                <div class="card bg-dark text-white h-100 shadow-sm border-0">
                    <div class="card-body py-4">
                        <h5 class="text-uppercase text-white mb-2">Total de silos activos</h5>
                        <h1 id="global-silos-activos" class="display-4 fw-bold">0</h1>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card bg-primary text-white h-100 shadow-sm border-0">
                    <div class="card-body py-4">
                        <h5 class="text-uppercase text-white-50 mb-2">Alimento total disponible</h5>
                        <h1 class="display-4 fw-bold"><span id="global-alimento-total">0</span> <small class="fs-4">kg</small></h1>
                    </div>
                </div>
            </div>
        </div>
        <div class="card shadow-sm border-0">
            <div class="card-body">
                <h5 class="text-center fw-bold text-secondary mb-4">Vista global actual de contenido de silos </h5>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="chart-global"></canvas>
                </div>
            </div>
        </div>
    </div>

    <div id="dashboard-panel" class="d-none">
        <div class="row mb-4 text-center">
            <div class="col-md-4 mb-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body">
                        <h6 class="text-muted text-uppercase mb-2">Estado del equipo</h6>
                        <h3 id="kpi-estado" class="fw-bold text-secondary">--</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body">
                        <h6 class="text-muted text-uppercase mb-2">Nivel actual</h6>
                        <h3 id="kpi-nivel" class="fw-bold">0 kg</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body">
                        <h6 id="label-capacidad" class="text-muted text-uppercase mb-2">Capacidad</h6>
                        <h3 id="kpi-porcentaje" class="fw-bold">0%</h3>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-6 mb-3">
                <div class="card border-0 h-100 shadow-sm">
                    <div class="card-body">
                        <h6 class="text-center fw-bold text-secondary mb-3">Evolución del contenido del silo(kg)</h6>
                        <canvas id="chart-contenido"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card border-0 h-100 shadow-sm">
                    <div class="card-body d-flex flex-column align-items-center">
                        <h6 class="text-center fw-bold text-secondary mb-3 w-100">Distribución de flujo histórico eventos del silo</h6>
                        <div style="position: relative; height: 250px; width: 100%; display: flex; justify-content: center;">
                            <canvas id="chart-eventos"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <h6 class="fw-bold mb-3">Últimos registros de operación</h6>
                <div class="table-responsive">
                    <table class="table table-striped table-hover table-sm text-center align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>Fecha y hora</th>
                                <th>Evento</th>
                                <th>Nivel anterior</th>
                                <th>Cantidad</th>
                                <th>Nivel resultante</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-historial-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
`;

// Variables Globales
let chartContenido = null;
let chartEventos = null;
let chartGlobal = null;
let intervaloRefresco = null;

// Cargar opciones en el select
async function cargarCombobox() {
    const select = document.getElementById('select-dispensador');
    const dispensadores = await getDispensadores();
    
    select.innerHTML = '<option value="">-- Vista global --</option>';
    dispensadores.forEach(disp => {
        const option = document.createElement('option');
        option.value = disp.id;
        option.textContent = `${disp.deviceName}`;
        select.appendChild(option);
    });

    iniciarMonitoreo();
}

// Navegación
function iniciarMonitoreo() {
    const dispensadorId = document.getElementById('select-dispensador').value;
    const panelEspecifico = document.getElementById('dashboard-panel');
    const panelGlobal = document.getElementById('dashboard-global');

    if (intervaloRefresco) clearInterval(intervaloRefresco);

    if (!dispensadorId) {
        panelEspecifico.classList.add('d-none');
        panelGlobal.classList.remove('d-none');
        actualizarDashboardGlobal();
        intervaloRefresco = setInterval(() => {
            if (!document.getElementById('section-monitoreo').classList.contains('d-none')) {
                actualizarDashboardGlobal();
            }
        }, 2000);
    } else {
        panelGlobal.classList.add('d-none');
        panelEspecifico.classList.remove('d-none');
        actualizarDashboard(dispensadorId);
        intervaloRefresco = setInterval(() => {
            if (!document.getElementById('section-monitoreo').classList.contains('d-none')) {
                actualizarDashboard(dispensadorId);
            }
        }, 2000);
    }
}

// ==========================================
// LÓGICA DEL DASHBOARD GLOBAL 
// ==========================================
async function actualizarDashboardGlobal() {
    // 1. Obtenemos TODOS los dispensadores registrados en la tabla maestra
    const dispensadores = await getDispensadores();
    
    let totalAlimento = 0;
    let silosActivos = 0;
    const nombresSilos = [];
    const nivelesSilos = [];
    const coloresSilos = [];

    for (let disp of dispensadores) {
        // ¿Está encendido el silo?
        const isRunning = disp.status === true || disp.status === 'true';
        if (isRunning) silosActivos++;
        
        // 2. CORRECCIÓN: Tomamos el peso y capacidad directamente del dispensador,
        // sin importar si tiene historial de operaciones o no.
        let nivel = parseFloat(disp.weight) || 0; 
        let capacidad = parseFloat(disp.maxWeight) || parseFloat(disp.capacity) || 1000;
        
        totalAlimento += nivel;
        nombresSilos.push(disp.deviceName || `Silo ${disp.id}`);
        nivelesSilos.push(nivel);

        // 3. Calculamos el porcentaje para definir el color de la gráfica
        let porcentaje = (nivel / capacidad) * 100;
        
        if (porcentaje < 20) coloresSilos.push('rgba(220, 53, 69, 0.8)');      // Rojo (Crítico)
        else if (porcentaje < 50) coloresSilos.push('rgba(255, 193, 7, 0.8)'); // Amarillo (Advertencia)
        else coloresSilos.push('rgba(25, 135, 84, 0.8)');                      // Verde (Óptimo)
    }

    // 4. Actualizamos las tarjetas numéricas de arriba
    document.getElementById('global-silos-activos').textContent = silosActivos;
    document.getElementById('global-alimento-total').textContent = totalAlimento.toFixed(2);

    // 5. Actualizamos o creamos la gráfica de barras global
    if (chartGlobal) {
        chartGlobal.data.labels = nombresSilos;
        chartGlobal.data.datasets[0].data = nivelesSilos;
        chartGlobal.data.datasets[0].backgroundColor = coloresSilos;
        chartGlobal.update('none');
    } else {
        const ctxGlobal = document.getElementById('chart-global').getContext('2d');
        chartGlobal = new Chart(ctxGlobal, {
            type: 'bar',
            data: {
                labels: nombresSilos,
                datasets: [{
                    label: 'Nivel Actual (kg)',
                    data: nivelesSilos,
                    backgroundColor: coloresSilos,
                    borderRadius: 5
                }]
            },
            options: {
                maintainAspectRatio: false,
                animation: false, // Desactivado para que el setInterval no parpadee
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// ==========================================
// LÓGICA DEL DASHBOARD ESPECÍFICO 
// ==========================================
async function actualizarDashboard(dispensadorId) {
    const dispensadores = await getDispensadores();
    
    // Comparar convirtiendo a texto para evitar fallos de ID numérico vs string
    const siloActual = dispensadores.find(d => d.id.toString() === dispensadorId.toString());
    
    // Verificar status del silo
    const kpiEstado = document.getElementById('kpi-estado');
    const isRunning = siloActual && (siloActual.status === true || siloActual.status === 'true');
    
    if (isRunning) {
        kpiEstado.innerHTML = '<span class="text-success">● EN LÍNEA</span>';
    } else {
        kpiEstado.innerHTML = '<span class="text-danger">● APAGADO</span>';
    }

    // Calcular capacidad dinámica
    let capacidadMaxima = 1000;
    if (siloActual) {
        capacidadMaxima = parseFloat(siloActual.capacity) || parseFloat(siloActual.capacidad) || parseFloat(siloActual.maxWeight) || 1000;
    }
    document.getElementById('label-capacidad').textContent = `Capacidad (${capacidadMaxima} kg)`;

    const historialCompleto = await getHistorial(dispensadorId);
    const ultimos10 = historialCompleto.slice(-10);

    // CORRECCIÓN: El peso actual se lee de la tabla maestra, no del historial
    let pesoActual = siloActual ? (parseFloat(siloActual.weight) || 0) : 0;
    let porcentaje = (pesoActual / capacidadMaxima) * 100;

    document.getElementById('kpi-nivel').textContent = `${pesoActual} kg`;
    document.getElementById('kpi-porcentaje').textContent = `${porcentaje.toFixed(1)}%`;

    let colorLinea = '#198754';
    let bgLinea = 'rgba(25, 135, 84, 0.2)';
    let colorTexto = 'text-success';

    if (porcentaje < 20) {
        colorLinea = '#dc3545';
        bgLinea = 'rgba(220, 53, 69, 0.2)';
        colorTexto = 'text-danger';
    } else if (porcentaje < 50) {
        colorLinea = '#ffc107';
        bgLinea = 'rgba(255, 193, 7, 0.2)';
        colorTexto = 'text-warning';
    }

    document.getElementById('kpi-nivel').className = `fw-bold ${colorTexto}`;
    document.getElementById('kpi-porcentaje').className = `fw-bold ${colorTexto}`;

    const etiquetas = []; 
    const datosContenido = []; 
    let totalDisp = 0, totalRell = 0, totalSust = 0;

    historialCompleto.forEach(registro => {
        let cantidad = parseFloat(registro.weightEvent) || parseFloat(registro.dispensedWeight) || parseFloat(registro.addWeight) || 0;
        if (registro.StatusCode === 2) totalDisp += cantidad;
        else if (registro.StatusCode === 4) totalRell += cantidad;
        else if (registro.StatusCode === 5) totalSust += cantidad;
    });

    ultimos10.forEach(registro => {
        const f = new Date(registro.dateTime);
        etiquetas.push(f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        datosContenido.push(registro.currentWeight);
    });

    const tbody = document.getElementById('tabla-historial-body');
    tbody.innerHTML = ''; 
    if (ultimos10.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin registros</td></tr>';
    } else {
        [...ultimos10].reverse().forEach(reg => {
            const f = new Date(reg.dateTime);
            let c = parseFloat(reg.weightEvent) || parseFloat(reg.dispensedWeight) || parseFloat(reg.addWeight) || 0;
            let pa = parseFloat(reg.currentWeight) || 0;
            let ev = 'Desconocido', bdg = 'bg-secondary';
            if (reg.StatusCode === 2) { ev = 'Dispensado'; bdg = 'bg-primary'; }
            else if (reg.StatusCode === 3) { ev = 'Error'; bdg = 'bg-danger'; }
            else if (reg.StatusCode === 4) { ev = 'Rellenado'; bdg = 'bg-success'; }
            else if (reg.StatusCode === 5) { ev = 'Sustracción manual'; bdg = 'bg-warning text-dark'; }

            let pAnt = (reg.StatusCode === 2 || reg.StatusCode === 5) ? pa + c : (reg.StatusCode === 4 ? pa - c : pa);
            
            tbody.innerHTML += `
                <tr>
                    <td>${f.toLocaleDateString()} <br> <small class="text-muted">${f.toLocaleTimeString()}</small></td>
                    <td><span class="badge ${bdg}">${ev}</span></td>
                    <td class="text-muted">${pAnt.toFixed(2)} kg</td>
                    <td class="fw-bold">${c.toFixed(2)} kg</td>
                    <td class="fw-bold text-dark">${pa.toFixed(2)} kg</td>
                </tr>
            `;
        });
    }

    dibujarGraficasEspecificas(etiquetas, datosContenido, [totalDisp, totalSust, totalRell], colorLinea, bgLinea);
}

function dibujarGraficasEspecificas(etiquetas, datosContenido, datosDona, colorLinea, bgLinea) {
    if (chartContenido) {
        chartContenido.data.labels = etiquetas;
        chartContenido.data.datasets[0].data = datosContenido;
        chartContenido.data.datasets[0].borderColor = colorLinea; 
        chartContenido.data.datasets[0].backgroundColor = bgLinea;
        chartContenido.update('none'); 
        
        chartEventos.data.datasets[0].data = datosDona;
        chartEventos.update('none');
        return;
    }

    const ctxContenido = document.getElementById('chart-contenido').getContext('2d');
    chartContenido = new Chart(ctxContenido, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Nivel (kg)',
                data: datosContenido,
                borderColor: colorLinea,
                backgroundColor: bgLinea,
                borderWidth: 2, fill: true, tension: 0.3
            }]
        },
        options: { animation: false } 
    });

    const ctxEventos = document.getElementById('chart-eventos').getContext('2d');
    chartEventos = new Chart(ctxEventos, {
        type: 'doughnut',
        data: {
            labels: ['Dispensado', 'Sustracción manual', 'Rellenado'],
            datasets: [{
                data: datosDona,
                backgroundColor: ['rgba(13, 110, 253, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(25, 135, 84, 0.8)'],
                borderWidth: 1
            }]
        },
        options: { maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'right' } } }
    });
}