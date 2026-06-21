const GROQ_API_KEY = import.meta.env.VITE_GROQ_KEY || import.meta.env.VITE_GROQ_API_KEY;

export async function processAiAction(prompt, currentProducts, history = []) {
  if (!GROQ_API_KEY) {
    throw new Error("No se encontró la API KEY de Groq");
  }

  // --- 1. RAG DINÁMICO (CLIENT-SIDE) ---
  // Filtramos los productos más relevantes basados en el prompt para no saturar el contexto
  const keywords = prompt.toLowerCase().split(' ').filter(w => w.length > 2);
  let relevantProducts = currentProducts.filter(p =>
    keywords.some(k =>
      p.articulo?.toLowerCase().includes(k) ||
      p.categoria?.toLowerCase().includes(k) ||
      p.codigo?.toLowerCase().includes(k)
    )
  );

  // Si no hay coincidencias claras, enviamos una muestra general
  if (relevantProducts.length === 0) {
    relevantProducts = currentProducts.slice(0, 40);
  } else {
    relevantProducts = relevantProducts.slice(0, 40); // Limitamos a 40 para eficiencia
  }

  const productContext = relevantProducts.map(p => ({
    id: p.id,
    articulo: p.articulo,
    precio: p.precio,
    stock: p.stock,
    categoria: p.categoria
  }));

  const systemPrompt = `Eres el "Cerebro" de un sistema de gestión comercial.
Tu objetivo es ayudar al usuario a gestionar su inventario y ventas de forma ultra-eficiente.

REGLAS DE ORO:
1. MEMORIA: Revisa el historial de mensajes para entender referencias como "ese", "el anterior" o "subiles más".
2. MULTI-ACCIÓN: Puedes devolver una LISTA de acciones si el usuario pide varias cosas a la vez.
3. PRECISIÓN: Usa los datos del CONTEXTO DE PRODUCTOS para ser exacto.

ESTRUCTURA DE RESPUESTA (JSON):
{
  "razonamiento": "Tu análisis paso a paso interno",
  "intent": "objetivo_general",
  "mensaje": "Mensaje final amigable redactado para el usuario (obligatorio si el usuario hace preguntas de stock, valorización, reporte, o si quieres confirmarle lo que vas a hacer)",
  "actions": [
    { "action": "nombre_accion", "params": { ... } }
  ]
}

ACCIONES DISPONIBLES:
- update_price: { "filter": "texto", "percentage": 1.10 }
- set_price: { "filter": "texto", "price": 1500 }
- update_stock: { "filter": "texto", "value": 10, "type": "set" | "add" }
- create_product: { "data": { "articulo": "...", "codigo": "...", "precio": 0, "stock": 0, "categoria": "..." } }
- delete_product: { "filter": "texto" } // Eliminar productos que coincidan con el filtro
- add_to_cart: { "filter": "texto", "quantity": 1 }
- clear_cart: {}
- checkout: {}
- filter_view: { "filter": "texto" }
- print_labels: { "filter": "texto" }
- undo: {} // Deshacer la última acción de modificación (precio o stock). Úsalo cuando el usuario pida "deshacer", "volver atrás", "deshacer cambios", "cancelar último cambio", etc.

CONTEXTO DE PRODUCTOS RELEVANTES:
${JSON.stringify(productContext)}

EJEMPLO DE MULTI-ACCIÓN:
Usuario: "Aumentá 10% a Coca, filtrame las cervezas e imprimí etiquetas de Arcor"
Respuesta: {
  "razonamiento": "El usuario quiere tres cosas: cambio de precio, cambio de vista e impresión de etiquetas.",
  "mensaje": "Perfecto, he procedido a aumentar el 10% a los productos Coca-Cola, filtré la vista para mostrar cervezas y preparé la impresión de etiquetas para Arcor.",
  "actions": [
    { "action": "update_price", "params": { "filter": "Coca", "percentage": 1.10 } },
    { "action": "filter_view", "params": { "filter": "cervezas" } },
    { "action": "print_labels", "params": { "filter": "Arcor" } }
  ]
}`;

  // Preparamos los mensajes incluyendo el historial
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: prompt }
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Error en Groq");

    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Error en Advanced AI Agent:", error);
    throw error;
  }
}
