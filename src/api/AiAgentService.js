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
Analiza la petición del usuario y determina qué acción realizar sobre los productos.
Debes responder ÚNICAMENTE con un objeto JSON válido.

ACCIONES DISPONIBLES:
1. update_price: Cambia el precio de productos filtrados usando un porcentaje.
   - Parámetros: { action: "update_price", filter: "texto_filtro", percentage: 1.10 }
2. set_price: Establece un precio FIJO y exacto para productos filtrados.
   - Parámetros: { action: "set_price", filter: "texto_filtro_o_codigo", price: 1500 }
3. filter_view: Filtra los productos que ve el usuario.
   - Parámetros: { action: "filter_view", filter: "texto_filtro" }
3. create_product: Prepara la creación de un nuevo producto.
   - Parámetros: { action: "create_product", data: { articulo: "nombre", codigo: "cod", precio: 100, stock: 10, categoria: "cat" } }
4. update_stock: Cambia el stock físico en la base de datos de productos filtrados.
   - Parámetros: { action: "update_stock", filter: "texto_filtro", value: 10, type: "set" | "add" }
5. update_cart_quantity: Cambia la cantidad de un producto que YA ESTÁ en el carrito de ventas actual.
   - Parámetros: { action: "update_cart_quantity", filter: "nombre_o_codigo", quantity: 5 }
6. clear_cart: Vacía completamente el carrito de ventas actual.
   - Parámetros: { action: "clear_cart" }
7. add_to_cart: Agrega un producto nuevo al carrito de ventas.
   - Parámetros: { action: "add_to_cart", filter: "nombre_o_codigo", quantity: 1 }
8. remove_from_cart: Elimina un producto específico del carrito de ventas.
   - Parámetros: { action: "remove_from_cart", filter: "nombre_o_codigo" }
9. apply_discount: Aplica un descuento al total de la venta (porcentaje o monto fijo).
   - Parámetros: { action: "apply_discount", value: 10, type: "percentage" | "fixed" }
10. checkout: Finaliza la venta, dispara la impresión o el cobro.
    - Parámetros: { action: "checkout" }

NOTAS SOBRE FILTROS:
- Si el usuario dice "todos", usa "todos" en el campo filter.
- Si el usuario dice "ninguno", "vaciar" o "limpiar" referido al carrito, usa la acción clear_cart.

PRODUCTOS ACTUALES (Muestra):
${JSON.stringify(productSummary)}

EJEMPLO DE RESPUESTA:
{ "action": "update_stock", "filter": "Invierno", "value": 0, "type": "set" }`;

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
