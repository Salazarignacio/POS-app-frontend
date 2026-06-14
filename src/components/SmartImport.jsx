import React, { useState } from "react";
import { Spinner } from "react-bootstrap";
import { toast } from "react-hot-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import iaIcon from "../assets/ia.png";

export default function SmartImport() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [extractedProducts, setExtractedProducts] = useState([]);
  const [importPrompt, setImportPrompt] = useState("");
  const [provider, setProvider] = useState("groq"); // 'gemini' o 'groq'

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = import.meta.env.VITE_API_URL;
  const genAI = new GoogleGenerativeAI(apiKey);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (
      selectedFile &&
      (selectedFile.type.startsWith("image/") ||
        allowedTypes.includes(selectedFile.type))
    ) {
      setFile(selectedFile);
    } else {
      toast.error("Formato no soportado. Usa JPG, PNG, PDF, DOCX o XLSX.");
    }
  };

  async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  const processWithGroq = async (file, instruction, extractedText = null) => {
    let content = [];
    if (extractedText) {
      content = [
        {
          type: "text",
          text: `${instruction}\n\nTexto extraído:\n${extractedText}`,
        },
      ];
    } else if (file.type.startsWith("image/")) {
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });

      content = [
        { type: "text", text: instruction },
        {
          type: "image_url",
          image_url: { url: `data:${file.type};base64,${base64Data}` },
        },
      ];
    } else {
      let text = "";
      if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        text = value;
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const csvData = XLSX.utils.sheet_to_csv(
          workbook.Sheets[workbook.SheetNames[0]],
        );
        text = csvData;
      }
      content = [
        { type: "text", text: `${instruction}\n\nTexto extraído:\n${text}` },
      ];
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error?.message || `Error en Groq: ${response.status}`,
      );

    const resText = data.choices[0].message.content;
    const jsonMatch = resText.match(/\[.*\]/s) || resText.match(/\{.*\}/s);
    const cleanText = jsonMatch ? jsonMatch[0] : resText;

    const parsed = JSON.parse(cleanText);
    const rawResult = Array.isArray(parsed)
      ? parsed
      : parsed.productos || parsed.items || Object.values(parsed)[0];
    if (!Array.isArray(rawResult))
      throw new Error("La IA no devolvió un formato de lista válido.");

    // Normalizar llaves (minúsculas y sin acentos) para el backend
    return rawResult.map((item) => {
      const normalized = {};
      Object.keys(item).forEach((key) => {
        const cleanKey = key
          .toLowerCase()
          .replace(/[áàäâ]/g, "a")
          .replace(/[éèëê]/g, "e")
          .replace(/[íìïî]/g, "i")
          .replace(/[óòöô]/g, "o")
          .replace(/[úùüû]/g, "u");
        normalized[cleanKey] = item[key];
      });
      return normalized;
    });
  };

  const handleProcessFile = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero");
      return;
    }
    setLoading(true);
    setExtractedProducts([]);
    try {
      const instruction = `Analiza este documento o imagen de una lista de precios y extrae los productos.
Devuelve ÚNICAMENTE un JSON array con objetos que tengan exactamente estas propiedades: codigo, articulo, categoria, precio, stock.

REGLAS DE EXTRACCIÓN:
1. Si un dato no está, usa null o 0 para stock/precio.
2. Limpia los nombres de símbolos raros pero mantén la marca si existe.
3. No incluyas texto extra, solo el JSON.

EJEMPLO DE FORMATO ESPERADO:
Entrada: "Cod 101 - Coca Cola 1.5L - $1200.50 (Stock: 45)"
Salida: [{"codigo": "101", "articulo": "Coca Cola 1.5L", "categoria": "Bebidas", "precio": 1200.50, "stock": 45}]

Entrada: "Alfajor Havanna x12 unidades - Precio $5000"
Salida: [{"codigo": "null", "articulo": "Alfajor Havanna x12 unidades", "categoria": "Dulces", "precio": 5000, "stock": 0}]`;
      const transcriptionPrompt =
        "Transcribe el contenido completo de este documento a texto plano, sin resumir ni inferir nada.";

      let products = [];

      if (file.type.startsWith("image/")) {
        // Groq directo para imágenes
        products = await processWithGroq(file, instruction);
      } else {
        // Híbrido: Gemini (extracción) + Groq (procesamiento)
        const model = genAI.getGenerativeModel(
          { model: "gemini-flash-latest" },
          { apiVersion: "v1beta" },
        );
        let geminiInput = [];

        if (file.type === "application/pdf") {
          geminiInput = [transcriptionPrompt, await fileToGenerativePart(file)];
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const { value: text } = await mammoth.extractRawText({
            arrayBuffer: await file.arrayBuffer(),
          });
          geminiInput = [`${transcriptionPrompt}\n\nContenido DOCX:\n${text}`];
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          const workbook = XLSX.read(await file.arrayBuffer());
          const csv = XLSX.utils.sheet_to_csv(
            workbook.Sheets[workbook.SheetNames[0]],
          );
          geminiInput = [
            `${transcriptionPrompt}\n\nContenido XLSX (CSV):\n${csv}`,
          ];
        } else {
          throw new Error("Tipo de archivo no soportado.");
        }

        const result = await model.generateContent(geminiInput);
        const extractedText = (await result.response).text();

        // Paso B: Groq con el texto extraído
        products = await processWithGroq(file, instruction, extractedText);
      }

      setExtractedProducts(Array.isArray(products) ? products : []);
      toast.success(`Se detectaron ${products.length || 0} productos`);
    } catch (error) {
      console.error("Error al procesar:", error);
      toast.error(error.message || "Error al procesar.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (index, field, value) => {
    const updatedProducts = [...extractedProducts];

    // Si el campo es código, limpiamos cualquier cosa que no sea número
    if (field === "codigo") {
      updatedProducts[index][field] = value.toString().replace(/\D/g, "");
    } else {
      updatedProducts[index][field] = value;
    }

    setExtractedProducts(updatedProducts);
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = extractedProducts.filter((_, i) => i !== index);
    setExtractedProducts(updatedProducts);
  };

  const handleApplyAiToImport = async (e) => {
    e.preventDefault();
    if (!importPrompt.trim() || extractedProducts.length === 0) return;

    setLoading(true);
    try {
      const instruction = `ACTÚA COMO UN PROCESADOR DE DATOS JSON.
Tu tarea es modificar una lista de productos basada en una petición.
Petición: "${importPrompt}"

REGLAS CRÍTICAS:
1. Responde EXCLUSIVAMENTE con el array JSON modificado.
2. NO incluyas explicaciones ni texto fuera del JSON.
3. Mantén las propiedades: codigo, articulo, categoria, precio, stock.
4. Si la petición pide cambiar categoría, precio o stock de "todos", aplícalo a cada objeto del array.

LISTA A MODIFICAR:
${JSON.stringify(extractedProducts)}`;

      let products = [];
      if (provider === "gemini") {
        const model = genAI.getGenerativeModel({
          model: "gemini-flash-latest",
        });
        const result = await model.generateContent(instruction);
        const text = (await result.response).text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        products = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } else {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: instruction }],
              temperature: 0.1,
              response_format: { type: "json_object" },
            }),
          },
        );
        const data = await response.json();
        const resText = data.choices[0].message.content;

        // Manejo de respuesta Groq que puede venir envuelta en un objeto
        const parsed = JSON.parse(resText);
        if (Array.isArray(parsed)) {
          products = parsed;
        } else {
          // Si Groq devuelve { "productos": [...] } o similar
          products =
            parsed.productos ||
            parsed.items ||
            parsed.data ||
            Object.values(parsed).find((v) => Array.isArray(v)) ||
            [];
        }
      }

      if (Array.isArray(products) && products.length > 0) {
        // Aseguramos que los números sean números
        const sanitizedProducts = products.map((p) => ({
          ...p,
          precio: parseFloat(p.precio) || 0,
          stock: parseInt(p.stock) || 0,
        }));
        setExtractedProducts(sanitizedProducts);
        toast.success("¡Lista actualizada correctamente!");
        setImportPrompt("");
      } else {
        throw new Error("La IA no devolvió una lista válida");
      }
    } catch (error) {
      console.error("Error aplicando IA:", error);
      toast.error("Error al procesar la orden con IA");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) return;
    setLoading(true);

    const saveProducts = async () => {
      let savedCount = 0;
      let errorCount = 0;

      // Filtrar solo los que tienen los campos obligatorios (nombre y código)
      const validProducts = extractedProducts.filter(
        (p) => p.articulo?.trim() && p.codigo?.trim(),
      );

      if (validProducts.length === 0) {
        throw new Error(
          "No hay productos válidos para guardar (faltan Artículo o Código)",
        );
      }

      for (const product of validProducts) {
        try {
          // Limpiar y asegurar tipos de datos antes de enviar
          const cleanProduct = {
            articulo: product.articulo.trim(),
            codigo: product.codigo.trim(),
            categoria: product.categoria?.trim() || "",
            precio: product.precio
              ? parseFloat(product.precio.toString().replace(/[^0-9.]/g, "")) ||
                0
              : 0,
            stock: product.stock
              ? parseInt(product.stock.toString().replace(/[^0-9]/g, ""), 10) ||
                0
              : 0,
          };

          // 1. Verificar si el producto ya existe por su código
          const checkResponse = await fetch(
            `${apiUrl}/codigo/${cleanProduct.codigo}`,
          );
          const existingProducts = await checkResponse.json();

          let response;
          // 2. Si existe (la API devuelve una lista), buscamos el ID exacto y actualizamos
          if (checkResponse.ok && existingProducts.length > 0) {
            // Buscamos coincidencia exacta de código para estar seguros
            const existing = existingProducts.find(
              (p) => p.codigo === cleanProduct.codigo,
            );

            if (existing) {
              response = await fetch(`${apiUrl}/${existing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanProduct),
              });
            } else {
              // Caso borde: existe algo parecido pero no el código exacto
              response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanProduct),
              });
            }
          } else {
            // 3. Si no existe, creamos uno nuevo
            response = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanProduct),
            });
          }

          if (response.ok) {
            savedCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error("Error procesando producto:", error);
          errorCount++;
        }
      }

      if (errorCount > 0) {
        throw new Error(
          `Se guardaron ${savedCount} productos, pero ${errorCount} fallaron.`,
        );
      }
      return savedCount;
    };

    toast
      .promise(saveProducts(), {
        loading: "Guardando productos en la base de datos...",
        success: (count) => {
          setExtractedProducts([]);
          setFile(null);
          return `¡Éxito! Se guardaron ${count} productos correctamente.`;
        },
        error: (err) => `Error: ${err.message}`,
      })
      .finally(() => setLoading(false));
  };

  const handleTestAI = async () => {
    if (loading) return;
    if (!prompt.trim()) {
      toast.error("Escribe algo para probar");
      return;
    }
    setLoading(true);
    try {
      if (provider === "gemini") {
        const model = genAI.getGenerativeModel(
          { model: "gemini-flash-latest" },
          { apiVersion: "v1beta" },
        );
        const result = await model.generateContent(prompt);
        setAiResponse((await result.response).text());
      } else {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: prompt }],
            }),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message || "Error en Groq");
        setAiResponse(data.choices[0].message.content);
      }
      toast.success("¡Respuesta recibida!");
    } catch (error) {
      console.error("Error test:", error);
      toast.error(error.message || "Error en la conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ventas-container">
      {/* PANEL IZQUIERDO: CONFIGURACIÓN Y CARGA */}
      <div
        className="productos-ventas p-4 d-flex flex-column gap-4"
        style={{ flex: 1 }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div
              className="p-3 rounded-circle text-white shadow-sm"
              style={{
                width: "50px",
                height: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--btn-ppal)",
              }}
            >
              <i className="fa-solid fa-robot fa-lg"></i>
            </div>
            <h2 className="section-title mb-0">IA Multimodal</h2>
          </div>
        </div>

        <div
          className="ticket-info p-4 d-flex flex-column justify-content-center align-items-center text-center gap-3"
          style={{
            border: "2px dashed var(--btn-ppal)",
            background: "var(--hover-color)",
            cursor: "pointer",
            borderRadius: "15px",
            minHeight: "200px",
          }}
          onClick={() => document.getElementById("file-upload").click()}
        >
          <input
            id="file-upload"
            type="file"
            accept="image/*,.pdf,.docx,.xlsx"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <i
            className={`fa-solid ${file ? "fa-file-circle-check text-success" : "fa-cloud-arrow-up"} fa-3x opacity-50`}
          ></i>
          <div>
            <h5 className="mb-1" style={{ color: "var(--font-color)" }}>
              {file ? file.name : "Subir Lista de Precios"}
            </h5>
            <p className="small opacity-50 mb-0">JPG, PNG, PDF, DOCX o XLSX</p>
          </div>
          {file && (
            <button
              className="btn-cancel py-1 px-3 mt-2"
              style={{
                width: "auto",
                height: "auto",
                fontSize: "0.8rem",
                border: "1px solid #ef4444",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              Remover archivo
            </button>
          )}
        </div>

        <button
          className={loading || !file ? "btn-vacio py-3" : "btn-mas py-3"}
          onClick={handleProcessFile}
          disabled={loading || !file}
          style={{
            width: "100%",
            marginLeft: 0,
            height: "60px",
            fontSize: "1.1rem",
            borderRadius: "15px",
          }}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Escaneando documento...
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
              Escanear con Inteligencia Artificial
            </>
          )}
        </button>
      </div>

      {/* PANEL DERECHO: RESULTADOS */}
      <div
        className="ticket-ventas d-flex flex-column"
        style={{ flex: 1.5, marginLeft: "20px" }}
      >
        {extractedProducts.length === 0 ? (
          <div
            className="no-products d-flex flex-column align-items-center justify-content-center py-5 h-100 opacity-50"
            style={{ color: "var(--font-color)" }}
          >
            <i className="fa-solid fa-list-check fa-4x mb-4"></i>
            <h4 className="fw-bold">Sin resultados aún</h4>
            <p className="small">
              Los productos detectados aparecerán aquí para su revisión.
            </p>
          </div>
        ) : (
          <div
            className="d-flex flex-column h-100 animate__animated animate__fadeIn"
            style={{ color: "var(--font-color)" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
              <h4 className="ticket-title mb-0">Resultados de Extracción</h4>
              <span
                className="badge bg-primary rounded-pill px-3"
                style={{ background: "var(--btn-ppal)" }}
              >
                {extractedProducts.length} detectados
              </span>
            </div>

            {/* COMANDO DE IA PARA LA LISTA (NUEVO) */}
            <div
              className="mb-4 p-3 rounded-3"
              style={{
                background: "var(--hover-color)",
                border: "1px solid var(--btn-ppal)",
              }}
            >
              <label
                className="form-label d-block mb-2"
                style={{ fontSize: "0.8rem", fontWeight: 800 }}
              >
                <i className="fa-solid fa-wand-magic-sparkles me-1"></i>
                Modificar esta lista con IA
              </label>
              <form onSubmit={handleApplyAiToImport} className="d-flex gap-2">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ej: 'Sube un 15% a todos' o 'Pon stock 0'..."
                  value={importPrompt}
                  onChange={(e) => setImportPrompt(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn-mas"
                  disabled={loading || !importPrompt.trim()}
                  style={{ width: "auto", padding: "0 20px", height: "42px" }}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    "Aplicar"
                  )}
                </button>
              </form>
            </div>

            <div className="scroll flex-grow-1 mb-4 pe-2">
              <div className="d-flex flex-column gap-3">
                {extractedProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="ticket-info p-3 position-relative animate__animated animate__fadeInUp"
                    style={{
                      animationDelay: `${idx * 0.05}s`,
                      background: "var(--white-black)",
                      borderRadius: "12px",
                    }}
                  >
                    <button
                      className="position-absolute top-0 end-0 m-2 btn-edit"
                      style={{
                        height: "30px",
                        width: "30px",
                        color: "#ef4444",
                        padding: 0,
                      }}
                      onClick={() => handleRemoveProduct(idx)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>

                    <div className="row g-2">
                      <div className="col-12">
                        <label
                          className="form-label mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Artículo
                        </label>
                        <input
                          type="text"
                          className="search-input w-100"
                          value={p.articulo || ""}
                          onChange={(e) =>
                            handleEditChange(idx, "articulo", e.target.value)
                          }
                          style={{ height: "35px" }}
                        />
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Código
                        </label>
                        <input
                          type="text"
                          className="search-input w-100"
                          value={p.codigo || ""}
                          onChange={(e) =>
                            handleEditChange(idx, "codigo", e.target.value)
                          }
                          style={{ height: "35px" }}
                        />
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Categoría
                        </label>
                        <input
                          type="text"
                          className="search-input w-100"
                          value={p.categoria || ""}
                          onChange={(e) =>
                            handleEditChange(idx, "categoria", e.target.value)
                          }
                          style={{ height: "35px" }}
                        />
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Precio
                        </label>
                        <input
                          type="number"
                          className="search-input w-100"
                          value={p.precio || 0}
                          onChange={(e) =>
                            handleEditChange(
                              idx,
                              "precio",
                              parseFloat(e.target.value),
                            )
                          }
                          style={{ height: "35px" }}
                        />
                      </div>
                      <div className="col-6">
                        <label
                          className="form-label mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          Stock
                        </label>
                        <input
                          type="number"
                          className="search-input w-100"
                          value={p.stock || 0}
                          onChange={(e) =>
                            handleEditChange(
                              idx,
                              "stock",
                              parseInt(e.target.value),
                            )
                          }
                          style={{ height: "35px" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ticket-actions pt-3 border-top">
              <button
                className="btn-print py-3"
                onClick={handleConfirmImport}
                disabled={loading}
                style={{ height: "auto", gap: "10px" }}
              >
                <i className="fa-solid fa-cloud-arrow-up fa-2x"></i>
                <span style={{ fontSize: "1.1rem" }}>
                  Confirmar y Guardar Todo
                </span>
              </button>
              <button
                className="btn-cancel"
                onClick={() => setExtractedProducts([])}
                disabled={loading}
                style={{ height: "45px" }}
              >
                Descartar resultados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
