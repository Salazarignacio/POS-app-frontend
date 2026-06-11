🧾 Product Management POS – Frontend

Aplicación frontend de gestión de productos y ventas, diseñada para funcionar como un punto de venta (POS) para pequeños comercios.

El sistema permite administrar productos y registrar ventas de forma rápida, intuitiva y optimizada para uso con teclado, priorizando la velocidad de operación en mostrador.

La aplicación consume una API REST externa desarrollada en Java.

🚀 Demo

*   **Deploy:** [Ver Aplicación](https://producto-front-lqpuye7af-salazarignacios-projects.vercel.app/)
*   **Backend:** [Repositorio Backend](https://github.com/Salazarignacio/producto-api)

⚙️ Tecnologías utilizadas

*   **React** (Vite)
*   **Google Gemini AI** & **Groq AI** (Multimodal Vision)
*   **Mammoth.js** (Procesamiento de Word)
*   **XLSX** (Procesamiento de Excel)
*   **React Bootstrap** & **Hot Toast**
*   **JavaScript** (Fetch API)

📦 Funcionalidades principales

### 🤖 Carga Inteligente con IA (Novedad)
El sistema integra Inteligencia Artificial avanzada para automatizar la carga de inventario a partir de documentos externos.
*   **Lectura Multiformato:** Procesa imágenes (JPG, PNG), documentos PDF, archivos de Word (.docx) y planillas de Excel (.xlsx).
*   **Extracción Automática:** La IA analiza el archivo, identifica productos, categorías, precios y stock, devolviendo una lista editable.
*   **Sincronización Inteligente (Upsert):** Al confirmar la carga, el sistema verifica automáticamente si el producto ya existe mediante su código:
    *   **Actualización:** Si el producto existe, actualiza su precio y stock.
    *   **Creación:** Si el producto es nuevo, lo registra en la base de datos.
*   **Doble Motor de IA:** Permite alternar entre **Google Gemini** y **Groq (Llama 3.2 Vision)** para garantizar disponibilidad y velocidad.

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

🌐 Configuración de entornos
La aplicación es altamente configurable mediante un archivo `.env`:
*   `VITE_API_URL`: Dirección de la API de productos.
*   `VITE_GEMINI_API_KEY`: Clave para el motor de IA de Google.
*   `VITE_GROQ_API_KEY`: Clave para el motor de IA de Groq.
*   `VITE_BALANCE_WEB_URL`: URL personalizada para la sección de Balance (opcional).

🛠 Estado del proyecto
🟢 **Versión funcional completa**
Implementa un ciclo de vida completo desde la carga masiva inteligente hasta la venta final, optimizando tiempos de gestión para el comerciante.
