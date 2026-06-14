const GROQ_API_KEY = import.meta.env.VITE_GROQ_KEY || import.meta.env.VITE_GROQ_API_KEY;

export async function processAiAction(prompt, currentProducts) {
  if (!GROQ_API_KEY) {
    throw new Error("No se encontró la API KEY de Groq");
  }

  // Preparamos un resumen de los productos para que la IA sepa qué hay
  // Enviamos solo info necesaria para no saturar tokens
  const productSummary = currentProducts.map(p => ({
    id: p.id,
    nombre: p.articulo,
    precio: p.precio,
    categoria: p.categoria,
    marca: p.articulo ? p.articulo.split(' ')[0] : 'N/A'
  })).slice(0, 50); // Limitamos a 50 para la prueba

  const systemPrompt = `Eres un asistente experto en gestión de inventario. 
Tu tarea es analizar la petición del usuario, razonar la mejor acción y responder ÚNICAMENTE con un objeto JSON válido.

ESTRUCTURA DE RESPUESTA:
{
  "razonamiento": "Breve explicación de por qué elegiste esta acción y cómo filtraste los productos",
  "action": "nombre_de_la_accion",
  "parámetros": ...
}

ACCIONES DISPONIBLES:
1. update_price: Cambia el precio usando un porcentaje. { "action": "update_price", "filter": "texto", "percentage": 1.10 }
2. set_price: Establece un precio FIJO. { "action": "set_price", "filter": "texto", "price": 1500 }
3. filter_view: Filtra lo que ve el usuario. { "action": "filter_view", "filter": "texto" }
4. create_product: Prepara nuevo producto. { "action": "create_product", "data": { ... } }
5. update_stock: Cambia stock. { "action": "update_stock", "filter": "texto", "value": 10, "type": "set" | "add" }
6. clear_cart: Vacía el carrito. { "action": "clear_cart" }
7. add_to_cart: Agrega al carrito. { "action": "add_to_cart", "filter": "texto", "quantity": 1 }
8. remove_from_cart: Quita del carrito. { "action": "remove_from_cart", "filter": "texto" }
9. apply_discount: Descuento total. { "action": "apply_discount", "value": 10, "type": "percentage" | "fixed" }
10. checkout: Finaliza venta. { "action": "checkout" }

EJEMPLOS DE RAZONAMIENTO (Few-Shot):
Usuario: "Aumentá 15% a las galletitas"
Respuesta: {
  "razonamiento": "El usuario quiere un aumento porcentual. Identifico el factor 1.15 y el filtro 'galletitas'.",
  "action": "update_price",
  "filter": "galletitas",
  "percentage": 1.15
}

Usuario: "Vendé 3 cocas"
Respuesta: {
  "razonamiento": "Interpretado como agregar al carrito. Filtro 'coca' y cantidad 3.",
  "action": "add_to_cart",
  "filter": "coca",
  "quantity": 3
}

PRODUCTOS ACTUALES (Contexto):
${JSON.stringify(productSummary)}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1 // Baja temperatura para respuestas consistentes
      })
    });

    const data = await response.json();
    
    // VALIDACIÓN DE RESPUESTA: Verificamos que la API haya devuelto datos válidos
    if (!response.ok || !data.choices || data.choices.length === 0) {
      const errorMsg = data.error?.message || "La IA no pudo procesar la solicitud (posible límite de cuota agotado).";
      throw new Error(errorMsg);
    }

    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Error en Groq AI Agent:", error.message);
    throw error;
  }
}
