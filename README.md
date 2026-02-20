# 🌾 LeGrange IoT 

**Sistema centralizado de monitoreo, control de inventarios y auditoría automatizada para la gestión inteligente de alimento en granjas de engorda LeGrange.**

---

## 📖 Acerca del Proyecto

En la ganadería de engorda, la precisión en la nutrición define la rentabilidad del negocio. **LeGrange** es una aplicación web basada en el Internet de las Cosas (IoT) diseñada para resolver la distribución exacta de proteína y carbohidratos, automatizando el proceso físico de pesado de alimento y dispensando gramajes exactos a botes de servicio mediante control remoto.

Más allá de ser un controlador de hardware, LeGrange actúa como un estricto **sistema de auditoría y control de inventarios**. A través de telemetría constante, la aplicación es capaz de interpretar el peso de los silos en tiempo real para detectar inteligentemente eventos físicos no registrados por el software, como rellenados de silo o sustracciones no autorizadas (posibles robos/mermas).

## ✨ Características Principales (Módulos)

El sistema se divide en tres apartados principales, accesibles desde una interfaz moderna e intuitiva:

* **🛠️ Administración:** Gestión de la infraestructura de dispensadores físicos. Permite registrar nuevos silos, configurar capacidades máximas (para el cálculo de porcentajes), editar descripciones y establecer metadatos como los horarios de alimentación esperados.
* **🎛️ Controloperativo:** Panel de mando a distancia. Muestra el estado en tiempo real (conectividad y nivel de inventario) mediante alertas visuales por colores (Óptimo, Precaución, Crítico). Permite al operador enviar la instrucción de dispensado con el peso exacto deseado, validando previamente que el silo cuente con el alimento suficiente.
* **📊 Monitoreo y analítica:** Motor de auditoría visual. Procesa la telemetría histórica mediante gráficas dinámicas (flujo de salidas y evolución del contenido) y una tabla de registros, actualizándose cada 2 segundos. 

## 🧠 Lógica de negocio y estados (API)

Para garantizar la integridad de los datos sin saturar el servidor, la arquitectura de base de datos (MockAPI) se divide en dos capas que interactúan bajo los siguientes códigos de estado:

**Tabla Maestra (`DISPENSADOR_IOT`) - *Tiempo Real***
Mantiene la "fotografía" actual del equipo para habilitar/bloquear el frontend.
* `0`: Apagado / Fuera de línea.
* `1`: En espera / Listo para operar.
* `2`: Ocupado / Dispensando alimento.
* `3`: Error (Ej. Hardware atascado o intento de dispensar más alimento del disponible).

**Tabla Histórica (`DISPENSED_IOT`) - *Auditoría de Eventos***
Registra las transacciones y eventos físicos detectados mediante la validación del peso para nutrir las gráficas.
* `Código 2`: Dispensado normal autorizado por la aplicación.
* `Código 4`: Evento de Rellenado (El sistema detecta un aumento de peso repentino).
* `Código 5`: Sustracción Manual / Merma (El sistema detecta una caída de peso sin orden de dispensado previa).

## 🚀 Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS modularizado).
* **Framework de diseño:** Bootstrap 5.3 & Bootstrap Icons.
* **Visualización de datos:** Chart.js (Gráficas renderizadas en Canvas).
* **Alertas y UI:** SweetAlert2.
* **Backend/API:** MockAPI (RESTful API para simulación de base de datos y telemetría).

## 💻 Instalación y uso

Dado que es una aplicación web basada en tecnologías Frontend con consumo de API REST externa, no requiere instalación de dependencias locales complejas.

1. Clonar el repositorio o descargar la carpeta del proyecto.
2. Abrir el archivo `index.html` directamente en cualquier navegador web moderno (Chrome, Edge, Firefox).
3. *(Opcional)* Para una mejor experiencia de desarrollo, se recomienda ejecutar a través de **Live Server** en Visual Studio Code.

---

**Autor:** 👩‍💻 **Aquetxali Barrera Sansabas** 🎓 Ing. Sistemas Computacionales - TecNM Pachuca  
📧 l22550039@pachuca.tecnm.mx

## Alcances y limitaciones

Este proyecto es una simulación académica. No se integra hardware real, sensores físicos ni protocolos IoT específicos como MQTT. Sin embargo, la arquitectura y la lógica implementadas permiten una futura escalabilidad hacia un entorno productivo.

---

## Licencia

Este proyecto se distribuye con fines educativos.