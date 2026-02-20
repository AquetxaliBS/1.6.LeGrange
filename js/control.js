// js/control.js
const controlContent = document.getElementById('control-content');

// Cargar y renderizar las tarjetas de control
async function loadControlPanel() {
    const dispensadores = await getDispensadores();
    controlContent.innerHTML = ''; // Limpiar vista

    if (dispensadores.length === 0) {
        controlContent.innerHTML = '<div class="alert alert-info">No hay silos para controlar. Ve a Administración.</div>';
        return;
    }

    dispensadores.forEach(disp => {

        // Calcular porcentaje de llenado para la barra
        let porcentaje = (disp.weight / disp.maxWeight) * 100;
        porcentaje = Math.min(Math.max(porcentaje, 0), 100); // Mantener entre 0 y 100

        // Definir color de la barra (Verde > 50%, Amarillo > 20%, Rojo <= 20%)
        let barColor = 'bg-success';
        let alertMsg = '';
        if (porcentaje <= 50 && porcentaje > 20) barColor = 'bg-warning';
        if (porcentaje <= 20) {
            barColor = 'bg-danger';
            alertMsg = '<span class="text-danger fw-bold d-block mb-3">⚠️ Nivel crítico: Requiere rellenado</span>';
        }

        // Estado del interruptor y etiquetas
        const isOnline = disp.status === true || disp.status === 'true';
        const isChecked = isOnline ? 'checked' : '';
        const btnDisabled = (!isOnline || disp.statusCode !== 1) ? 'disabled' : ''; // Bloquear si está apagado o no está "Listo"

        // Definir variables dinámicas para el diseño del estado
        const colorBadge = isOnline ? 'bg-success' : 'bg-danger';
        const textoEstado = isOnline ? 'En línea' : 'Apagado';
        
        // Mensajes de estado operativo específicos (Ocultos por defecto si no es necesario)
        let operativoMsg = ''; 
        if (isOnline) {
            if (disp.statusCode === 2) {
                operativoMsg = '<div class="alert alert-primary text-center py-2 mb-3 fw-bold shadow-sm border border-primary">⏳ Dispensado en curso...</div>';
            } else if (disp.statusCode === 3) {
                operativoMsg = '<div class="alert alert-danger text-center py-2 mb-3 fw-bold shadow-sm border border-danger">❌ Error: Alimento insuficiente</div>';
            }
        }

        const cardHTML = `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card card-iot h-100 border-0 shadow-sm">
                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${disp.deviceName}</h5>
                        <div class="form-check form-switch mb-0">
                            <input class="form-check-input" type="checkbox" id="switch-${disp.id}" ${isChecked} onchange="toggleDevice('${disp.id}', this.checked)">
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <span class="text-muted fw-bold">Estado del equipo:</span>
                            <span class="badge ${colorBadge} px-3 py-2 fs-6">${textoEstado}</span>
                        </div>
                        
                        ${operativoMsg}
                        ${alertMsg}
                        
                        <div class="d-flex justify-content-between mb-1">
                            <span class="small fw-bold">Nivel de silo</span>
                            <span class="small fw-bold text-muted">${disp.weight.toFixed(2)} / ${disp.maxWeight} kg</span>
                        </div>
                        <div class="progress mb-4" style="height: 20px;">
                            <div class="progress-bar ${barColor} progress-bar-striped" role="progressbar" style="width: ${porcentaje}%">
                                ${Math.round(porcentaje)}%
                            </div>
                        </div>

                        <div class="input-group mb-2">
                            <input type="number" id="input-peso-${disp.id}" class="form-control" placeholder="Peso a dispensar" min="0.1" step="0.1" ${btnDisabled}>
                            <span class="input-group-text">kg</span>
                        </div>
                        <button class="btn btn-primary w-100" onclick="dispensarAlimento('${disp.id}', ${disp.weight})" ${btnDisabled}>
                            Dispensar a bote
                        </button>
                    </div>
                </div>
            </div>
        `;
        controlContent.innerHTML += cardHTML;
    });
}

// Función para apagar o encender el dispensador (Interruptor)
async function toggleDevice(id, isChecked) {
    // Actualizamos el status (boolean) y si se apaga, lo ponemos en código 0, si se enciende en 1.
    const newStatusCode = isChecked ? 1 : 0;
    await updateDispensador(id, { status: isChecked, statusCode: newStatusCode });
    loadControlPanel(); // Recargar UI
}

// Función Principal: Simular Dispensado
async function dispensarAlimento(id, currentWeight) {
    const inputElement = document.getElementById(`input-peso-${id}`);
    const pesoADispensar = parseFloat(inputElement.value);

    if (isNaN(pesoADispensar) || pesoADispensar <= 0) {
        alert('Por favor ingresa un peso válido mayor a 0.');
        return;
    }

    // 1. VERIFICAR ERRORES: ¿Hay suficiente alimento?
    if (pesoADispensar > currentWeight) {
        // Cambiar estado a Error (3)
        await updateDispensador(id, { statusCode: 3 });
        loadControlPanel();
        
        // Esperar 5 segundos mostrando el error, luego regresar a Listo (1)
        setTimeout(async () => {
            await updateDispensador(id, { statusCode: 1 });
            // Registrar el error en el historial
            await createHistorial(id, {
                currentWeight: currentWeight,
                weightEvent: pesoADispensar,
                StatusCode: 3, // Error
                dateTime: new Date().toISOString()
            });
            loadControlPanel();
        }, 5000);
        return;
    }

    // 2. DISPENSADO NORMAL: Cambiar estado a Dispensando (2)
    await updateDispensador(id, { statusCode: 2 });
    loadControlPanel();

    // 3. SIMULAR LOS 5 SEGUNDOS DE ESPERA
    setTimeout(async () => {
        const nuevoPeso = parseFloat((currentWeight - pesoADispensar).toFixed(2));
        
        // Actualizar el peso del silo y regresarlo a estado Listo (1)
        await updateDispensador(id, { 
            weight: nuevoPeso,
            statusCode: 1 
        });

        // Registrar el éxito en el historial (Para tus gráficas futuras)
        await createHistorial(id, {
            currentWeight: nuevoPeso, // El peso tras el evento
            weightEvent: pesoADispensar,
            StatusCode: 2, // Dispensado Exitoso
            dateTime: new Date().toISOString()
        });

        // Limpiar el input y recargar
        inputElement.value = '';
        loadControlPanel();
    }, 5000);
}

// Ejecutar al iniciar la vista
loadControlPanel();

// --- SIMULACIÓN DE CAMBIO ALEATORIO (Cada minuto) ---
// Representa lecturas drásticas del microcontrolador (Rellenados o Sustracciones)
setInterval(async () => {
    // Solo ejecutamos si la pestaña de control está visible para no saturar la API
    if (!document.getElementById('section-control').classList.contains('d-none')) {
        const dispensadores = await getDispensadores();
        
        for (const disp of dispensadores) {
            // Solo afectar si está encendido y listo (status en boolean o string por si acaso)
            const isOnline = disp.status === true || disp.status === 'true';
            if (isOnline && disp.statusCode === 1) {
                
                // 1. Generar un nuevo peso aleatorio entre 0 y el MÁXIMO del silo
                const nuevoPeso = parseFloat((Math.random() * disp.maxWeight).toFixed(2));
                
                // Si por alguna rareza el peso es exactamente igual, saltamos al siguiente
                if (nuevoPeso === disp.weight) continue;

                let statusCodeEvento = 0;
                let diferenciaPeso = 0;

                // 2. Evaluar si fue un aumento (rellenado) o una caída (sustracción)
                if (nuevoPeso > disp.weight) {
                    // El peso subió -> Evento de Rellenado de Silo (Código 4)
                    statusCodeEvento = 4;
                    diferenciaPeso = parseFloat((nuevoPeso - disp.weight).toFixed(2));
                } else {
                    // El peso bajó -> Evento de Sustracción/Consumo (Código 5)
                    statusCodeEvento = 5;
                    diferenciaPeso = parseFloat((disp.weight - nuevoPeso).toFixed(2));
                }

                // 3. Actualizar el peso actual en el dispensador
                await updateDispensador(disp.id, { weight: nuevoPeso });
                
                // 4. Registrar este salto drástico en el historial para las gráficas
                await createHistorial(disp.id, {
                    currentWeight: nuevoPeso,
                    weightEvent: diferenciaPeso,
                    StatusCode: statusCodeEvento, 
                    dateTime: new Date().toISOString()
                });
            }
        }
        loadControlPanel(); // Refrescar UI para ver el cambio de golpe
    }
}, 600000); // 600,000 milisegundos = 10 minutos