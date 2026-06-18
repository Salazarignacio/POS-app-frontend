# 🛒 Product Management POS – Frontend

Aplicación frontend de gestión de productos y ventas, diseñada para funcionar como un punto de venta (POS) para pequeños comercios.

El sistema permite administrar productos y registrar ventas de forma rápida, intuitiva y optimizada para uso con teclado, priorizando la velocidad de operación en mostrador.

La aplicación consume una API REST externa desarrollada en Java.

🚀 Demo

*   **Deploy:** [Ver Aplicación](https://producto-front-lqpuye7af-salazarignacios-projects.vercel.app/)
*   **Backend:** [Repositorio Backend](https://github.com/Salazarignacio/producto-api)

⚙️ Tecnologías utilizadas

*   **React** (Vite)
*   **Google Gemini AI** & **Groq AI** (Llama 3.3 & Vision)
*   **Mammoth.js** (Procesamiento de Word)
*   **XLSX** (Procesamiento de Excel)
*   **React Bootstrap** & **Hot Toast**
*   **JavaScript** (Fetch API)

📦 Funcionalidades principales

### 🧠 Agente de IA "Cerebro" (Novedad)
El sistema incluye un Agente de IA agéntico (Llama 3.3 vía Groq) capaz de ejecutar acciones complejas mediante lenguaje natural.
*   **Control por Chat:** Modifica precios, aumenta stocks, filtra vistas o gestiona el carrito de ventas simplemente escribiendo comandos como *"Aumentá 10% a las cervezas"* o *"Limpiá el carrito"*.
*   **Multi-acción:** Capacidad de procesar múltiples órdenes en un solo prompt.
*   **Context Aware:** El agente conoce el inventario actual para realizar búsquedas y actualizaciones precisas.

### 🖨️ Sistema de Impresión de Precios (Novedad)
Funcionalidad diseñada para agilizar el etiquetado de góndolas en comercios físicos.
*   **Etiquetas Térmicas:** Impresión optimizada para impresoras térmicas de etiquetas o tickets.
*   **Diseño de Alto Impacto:** El nombre del artículo se imprime en tamaño estándar y el precio en tamaño extra grande (42px) para máxima visibilidad.
*   **Impresión Múltiple:** Permite seleccionar varios productos y generar una tira continua de etiquetas de precios lista para cortar y pegar.

### 🤖 Carga Inteligente con IA
El sistema integra Inteligencia Artificial avanzada para automatizar la carga de inventario a partir de documentos externos.
*   **Lectura Multiformato:** Procesa imágenes (JPG, PNG), documentos PDF, archivos de Word (.docx) y planillas de Excel (.xlsx).
*   **Extracción Automática:** La IA analiza el archivo, identifica productos, categorías, precios y stock, devolviendo una lista editable.
*   **Sincronización Inteligente (Upsert):** Al confirmar la carga, el sistema verifica automáticamente si el producto ya existe mediante su código.

### Gestión de productos
*   Listado completo con renderizado inmediato.
*   Creación, edición individual y **edición múltiple dinámica**.
*   Eliminación de productos con confirmación.
*   Limpieza automática de códigos (alfanuméricos únicamente) para evitar errores de duplicidad.

### Ventas (POS)
*   Sistema optimizado para entorno de mostrador.
*   Modificación de precio y cantidad en tiempo real durante la venta.
*   Impresión directa de tickets con diseño profesional.

🔎 Búsqueda inteligente de productos
Selector con búsqueda reactiva por nombre, código de barras o categoría con actualización dinámica.

⌨️ Optimización para uso con teclado
Diseño enfocado en la operación sin mouse:
*   Foco automático en campos clave.
*   Navegación completa mediante TAB y flechas del teclado.
*   Atajos para confirmación rápida de acciones.

🎨 Experiencia de usuario
*   **Modo Oscuro / Claro** integrado.
*   Interfaz basada en contenedores modernos y animaciones sutiles.
*   Feedback visual inmediato mediante notificaciones (Toasts).
