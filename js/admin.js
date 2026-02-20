// js/admin.js

// 1. Referencia al contenedor principal de la vista de administración
const adminContent = document.getElementById('admin-content');

// 2. Plantilla HTML: Formulario (Izquierda) y Tabla de registros (Derecha)
const adminHTML = `
    <div class="row">
        <div class="col-md-4">
            <div class="card card-iot mb-4 border-success">
                <div class="card-header bg-success text-white">
                    <h5 class="card-title mb-0" id="form-title">Agregar nuevo silo</h5>
                </div>
                <div class="card-body">
                    <form id="dispensador-form">
                        <input type="hidden" id="disp_id">
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold">Nombre del Silo / Zona</label>
                            <input type="text" class="form-control" id="disp_name" placeholder="Ej. Silo engorda 1" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Descripción / Horarios</label>
                            <input type="text" class="form-control" id="disp_desc" placeholder="Ej. Mezcla proteína - 08:00 y 16:00" required>
                        </div>
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label class="form-label fw-bold">Capacidad máx (kg)</label>
                                <input type="number" class="form-control" id="disp_max" min="1" required>
                            </div>
                            <div class="col-6 mb-3">
                                <label class="form-label fw-bold">Peso inicial (kg)</label>
                                <input type="number" class="form-control" id="disp_current" min="0" required>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-success w-100 fw-bold">Guardar silo</button>
                        <button type="button" class="btn btn-outline-secondary w-100 mt-2 d-none" id="btn-cancelar" onclick="resetForm()">Cancelar Edición</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <div class="card card-iot border-0 shadow-sm">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle text-center">
                            <thead class="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Capacidad</th>
                                    <th>Peso actual</th>
                                    <th>Estado físico</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="admin-table-body">
                                <tr><td colspan="6" class="py-4">Cargando silos... <div class="spinner-border spinner-border-sm text-primary ms-2" role="status"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// 3. Inicializar la vista inyectando el HTML
adminContent.innerHTML = adminHTML;

// 4. Lógica de renderizado y CRUD

// Cargar y mostrar los datos en la tabla
async function loadTable() {
    const tbody = document.getElementById('admin-table-body');
    const dispensadores = await getDispensadores(); // Viene de api.js

    tbody.innerHTML = ''; // Limpiar tabla

    if (dispensadores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">No hay silos registrados. Agrega uno.</td></tr>';
        return;
    }

    dispensadores.forEach(disp => {
        // Determinamos el badge de estado
        const isOnline = disp.status === true || disp.status === 'true';
        let statusBadge = isOnline 
            ? '<span class="badge bg-success px-3 py-2">Encendido</span>' 
            : '<span class="badge bg-danger px-3 py-2">Apagado</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge bg-secondary">#${disp.id}</span></td>
            <td class="fw-bold">${disp.deviceName}</td>
            <td>${disp.maxWeight} kg</td>
            <td class="fw-bold text-primary">${disp.weight} kg</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editBtn('${disp.id}')" title="Editar">
                    <i class="bi bi-pencil-fill"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteBtn('${disp.id}')" title="Eliminar">
                    <i class="bi bi-trash-fill"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Guardar o Actualizar un Dispensador
document.getElementById('dispensador-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar que la página se recargue

    // Recopilar datos del formulario
    const id = document.getElementById('disp_id').value;
    const maxWeight = parseFloat(document.getElementById('disp_max').value);
    const weight = parseFloat(document.getElementById('disp_current').value);

    // Pequeña validación de lógica antes de enviar
    if (weight > maxWeight) {
        Swal.fire({
            title: 'Error de capacidad',
            text: 'El peso inicial no puede ser mayor que la capacidad máxima del silo.',
            icon: 'warning',
            confirmButtonColor: '#ffc107'
        });
        return;
    }

    const data = {
        deviceName: document.getElementById('disp_name').value,
        description: document.getElementById('disp_desc').value,
        maxWeight: maxWeight,
        weight: weight,
        status: true, 
        statusCode: 1 
    };

    try {
        if (id) {
            // Editando
            await updateDispensador(id, data);
            Swal.fire({
                title: '¡Actualizado!',
                text: 'El silo se actualizó correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Creando
            await createDispensador(data);
            Swal.fire({
                title: '¡Silo Registrado!',
                text: 'El nuevo silo ha sido agregado a la granja.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        }

        resetForm();
        loadTable(); 
    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al conectar con el servidor', 'error');
    }
});

// Botón Editar: Cargar datos en el formulario
async function editBtn(id) {
    const dispensadores = await getDispensadores();
    const disp = dispensadores.find(d => d.id == id);

    if(disp) {
        document.getElementById('disp_id').value = disp.id;
        document.getElementById('disp_name').value = disp.deviceName;
        document.getElementById('disp_desc').value = disp.description;
        document.getElementById('disp_max').value = disp.maxWeight;
        document.getElementById('disp_current').value = disp.weight;

        document.getElementById('form-title').innerText = `Editando Silo #${disp.id}`;
        document.getElementById('btn-cancelar').classList.remove('d-none');
        
        // Hacer scroll automático hacia arriba para que el usuario vea el formulario
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Botón Borrar: Eliminar registro
async function deleteBtn(id) {
    Swal.fire({
        title: '¿Estás seguro?',
        html: `Estás a punto de eliminar el <b>Silo #${id}</b>.<br>Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545', // Rojo peligro
        cancelButtonColor: '#6c757d',  // Gris secundario
        confirmButtonText: '<i class="bi bi-trash"></i> Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteDispensador(id);
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El silo ha sido borrado de la base de datos.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                loadTable();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar el silo.', 'error');
            }
        }
    });
}

// Limpiar formulario y resetear estado
function resetForm() {
    document.getElementById('dispensador-form').reset();
    document.getElementById('disp_id').value = '';
    document.getElementById('form-title').innerText = 'Agregar nuevo silo';
    document.getElementById('btn-cancelar').classList.add('d-none');
}

// Ejecutar la carga de la tabla al iniciar
loadTable();