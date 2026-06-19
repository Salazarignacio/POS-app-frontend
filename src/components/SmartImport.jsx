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
  const [dbMatches, setDbMatches] = useState({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importPrompt, setImportPrompt] = useState("");
  const [provider, setProvider] = useState("groq"); // 'gemini' o 'groq'
  const [isDragging, setIsDragging] = useState(false);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = import.meta.env.VITE_API_URL;
  const genAI = new GoogleGenerativeAI(apiKey);

  const validateAndSetFile = (selectedFile) => {
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

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
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

      const sanitized = (Array.isArray(products) ? products : []).map((p) => ({
        ...p,
        _tempId: Math.random().toString(36).substring(7),
      }));
      setExtractedProducts(sanitized);
      toast.success(`Se detectaron ${sanitized.length || 0} productos`);
      checkProductMatches(sanitized);
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

    if (field === "codigo" || field === "articulo") {
      checkSingleMatch(updatedProducts[index]._tempId, updatedProducts[index].articulo, updatedProducts[index].codigo);
    }
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
          _tempId: Math.random().toString(36).substring(7),
          precio: parseFloat(p.precio) || 0,
          stock: parseInt(p.stock) || 0,
        }));
        setExtractedProducts(sanitizedProducts);
        toast.success("¡Lista actualizada correctamente!");
        setImportPrompt("");
        checkProductMatches(sanitizedProducts);
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

  const checkProductMatches = async (products) => {
    const matches = {};
    await Promise.all(
      products.map(async (p) => {
        try {
          let hasCode = p.codigo && p.codigo.trim() !== "" && p.codigo !== "null" && p.codigo.toLowerCase() !== "null";
          let query = hasCode ? p.codigo.toString().trim() : p.articulo?.trim();
          
          if (query) {
            const res = await fetch(`${apiUrl}/codigo/${encodeURIComponent(query)}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                let bestMatch = null;
                if (hasCode) {
                  bestMatch = data.find(dbP => dbP.codigo && dbP.codigo.toString().trim() === p.codigo.toString().trim());
                }
                if (!bestMatch) {
                  bestMatch = data.find(dbP => dbP.articulo && normalizeName(dbP.articulo) === normalizeName(p.articulo));
                }
                if (bestMatch) {
                  matches[p._tempId] = bestMatch;
                }
              }
            }
          }
        } catch (err) {
          console.error("Error matching product:", err);
        }
      })
    );
    setDbMatches(matches);
  };

  const checkSingleMatch = async (tempId, articulo, codigo) => {
    try {
      let hasCode = codigo && codigo.trim() !== "" && codigo !== "null" && codigo.toLowerCase() !== "null";
      let query = hasCode ? codigo.toString().trim() : articulo?.trim();
      if (!query) {
        setDbMatches(prev => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        return;
      }

      const res = await fetch(`${apiUrl}/codigo/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          let bestMatch = null;
          if (hasCode) {
            bestMatch = data.find(dbP => dbP.codigo && dbP.codigo.toString().trim() === codigo.toString().trim());
          }
          if (!bestMatch) {
            bestMatch = data.find(dbP => dbP.articulo && normalizeName(dbP.articulo) === normalizeName(articulo));
          }
          
          setDbMatches(prev => {
            const next = { ...prev };
            if (bestMatch) {
              next[tempId] = bestMatch;
            } else {
              delete next[tempId];
            }
            return next;
          });
          return;
        }
      }
      setDbMatches(prev => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
    } catch (err) {
      console.error("Error single matching:", err);
    }
  };

  const normalizeName = (str) => {
    if (!str) return "";
    return str
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) return;
    setLoading(true);

    // Filtrar solo los que tienen el nombre del artículo obligatoriamente
    const validProducts = extractedProducts.filter((p) => p.articulo?.trim());
    setImportProgress({ current: 0, total: validProducts.length });

    const saveProducts = async () => {
      let savedCount = 0;
      let errorCount = 0;
      const skippedBarcodeLess = [];

      if (validProducts.length === 0) {
        throw new Error(
          "No hay productos válidos para guardar (falta el nombre del Artículo)",
        );
      }

      let idx = 0;
      for (const product of validProducts) {
        try {
          const cleanProduct = {
            articulo: product.articulo.trim(),
            codigo: product.codigo ? product.codigo.toString().trim() : "",
            categoria: product.categoria?.trim() || "",
            precio: product.precio
              ? parseFloat(product.precio.toString().replace(/[^0-9.]/g, "")) || 0
              : 0,
            stock: product.stock
              ? parseInt(product.stock.toString().replace(/[^0-9]/g, ""), 10) || 0
              : 0,
          };

          let hasCode = cleanProduct.codigo && cleanProduct.codigo !== "null" && cleanProduct.codigo.toLowerCase() !== "null";
          let existingProduct = dbMatches[product._tempId] || null;

          // Búsqueda de coincidencia en BD de respaldo para evitar duplicados si no estaba en dbMatches
          if (!existingProduct) {
            let query = hasCode ? cleanProduct.codigo : cleanProduct.articulo;
            if (query) {
              try {
                const res = await fetch(`${apiUrl}/codigo/${encodeURIComponent(query)}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.length > 0) {
                    if (hasCode) {
                      existingProduct = data.find(dbP => dbP.codigo && dbP.codigo.toString().trim() === cleanProduct.codigo);
                    }
                    if (!existingProduct) {
                      existingProduct = data.find(dbP => dbP.articulo && normalizeName(dbP.articulo) === normalizeName(cleanProduct.articulo));
                    }
                  }
                }
              } catch (err) {
                console.error("Error doing fallback lookup:", err);
              }
            }
          }

          let response;
          if (existingProduct) {
            // Actualizar existente. Conservamos el código de barras existente si el nuevo viene vacío
            const mergedProduct = {
              ...cleanProduct,
              codigo: cleanProduct.codigo || existingProduct.codigo || ""
            };
            response = await fetch(`${apiUrl}/${existingProduct.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mergedProduct),
            });
          } else {
            // Si no existe en la BD y no tiene código de barras, va a revisión de pendientes
            if (!hasCode) {
              console.log(`Saltando producto nuevo sin código de barras para revisión: ${cleanProduct.articulo}`);
              skippedBarcodeLess.push(product);
              continue;
            }

            // Crear nuevo (tiene código de barras)
            response = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanProduct),
            });
          }

          if (response && response.ok) {
            savedCount++;
          } else if (response) {
            errorCount++;
          }
        } catch (error) {
          console.error("Error procesando producto:", error);
          errorCount++;
        } finally {
          idx++;
          setImportProgress({ current: idx, total: validProducts.length });
        }
      }

      if (skippedBarcodeLess.length > 0) {
        setPendingProducts((prev) => [...prev, ...skippedBarcodeLess]);
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
          return `¡Éxito! Se procesaron ${count} productos correctamente.`;
        },
        error: (err) => `Error: ${err.message}`,
      })
      .finally(() => {
        setLoading(false);
        setImportProgress({ current: 0, total: 0 });
      });
  };

  const [pendingProducts, setPendingProducts] = useState([]);

  const handlePendingEditChange = (index, field, value) => {
    const updatedProducts = [...pendingProducts];
    if (field === "codigo") {
      updatedProducts[index][field] = value.toString().replace(/\D/g, "");
    } else {
      updatedProducts[index][field] = value;
    }
    setPendingProducts(updatedProducts);
  };

  const handleRemovePendingProduct = (index) => {
    setPendingProducts(pendingProducts.filter((_, i) => i !== index));
  };

  const handleConfirmPending = async () => {
    if (pendingProducts.length === 0) return;
    setLoading(true);

    const savePending = async () => {
      let savedCount = 0;
      let errorCount = 0;
      let remainingPending = [];

      for (const product of pendingProducts) {
        try {
          const cleanProduct = {
            articulo: product.articulo.trim(),
            codigo: product.codigo ? product.codigo.toString().trim() : "",
            categoria: product.categoria?.trim() || "",
            precio: product.precio
              ? parseFloat(product.precio.toString().replace(/[^0-9.]/g, "")) || 0
              : 0,
            stock: product.stock
              ? parseInt(product.stock.toString().replace(/[^0-9]/g, ""), 10) || 0
              : 0,
          };

          let hasCode = cleanProduct.codigo && cleanProduct.codigo !== "null" && cleanProduct.codigo.toLowerCase() !== "null";
          let existingProduct = null;

          let query = hasCode ? cleanProduct.codigo : cleanProduct.articulo;
          if (query) {
            try {
              const res = await fetch(`${apiUrl}/codigo/${encodeURIComponent(query)}`);
              if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                  if (hasCode) {
                    existingProduct = data.find(dbP => dbP.codigo && dbP.codigo.toString().trim() === cleanProduct.codigo);
                  }
                  if (!existingProduct) {
                    existingProduct = data.find(dbP => dbP.articulo && normalizeName(dbP.articulo) === normalizeName(cleanProduct.articulo));
                  }
                }
              }
            } catch (err) {
              console.error("Error looking up pending product matching:", err);
            }
          }

          let response;
          if (existingProduct) {
            const mergedProduct = {
              ...cleanProduct,
              codigo: cleanProduct.codigo || existingProduct.codigo || ""
            };
            response = await fetch(`${apiUrl}/${existingProduct.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mergedProduct),
            });
          } else {
            if (!hasCode) {
              remainingPending.push(product);
              continue;
            }

            response = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanProduct),
            });
          }

          if (response && response.ok) {
            savedCount++;
          } else {
            errorCount++;
            remainingPending.push(product);
          }
        } catch (error) {
          console.error("Error procesando pendiente:", error);
          errorCount++;
          remainingPending.push(product);
        }
      }

      setPendingProducts(remainingPending);

      if (errorCount > 0) {
        throw new Error(`Se guardaron ${savedCount} productos. ${errorCount} fallaron.`);
      }
      return savedCount;
    };

    toast
      .promise(savePending(), {
        loading: "Guardando pendientes en la base de datos...",
        success: (count) => `¡Éxito! Se guardaron ${count} productos correctamente.`,
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
    <div className="ia-carga-container">
      {/* PANEL IZQUIERDO: CONFIGURACIÓN Y CARGA */}
      <div className="ia-carga-panel">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <h2 className="section-title mb-0">IA Multimodal</h2>
          </div>
        </div>

        <div
          className={`ia-carga-upload ${isDragging ? "is-dragging" : ""}`}
          onClick={() => document.getElementById("file-upload").click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
              {file ? file.name : "Click o Arrastrar Lista de Precios"}
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
      <div className="ia-carga-results">
        {loading ? (
          <div className="scanner-container h-100">
            <div className="laser-line"></div>
            <div className="laser-glow"></div>
            <div className="text-center animate__animated animate__fadeIn">
              <i className="fa-solid fa-microchip fa-4x mb-4 opacity-20"></i>
              <h4 className="scan-text">
                {importProgress.total > 0 
                  ? `Guardando Productos... (${importProgress.current} de ${importProgress.total})` 
                  : "Analizando Documento..."
                }
              </h4>
              
              {importProgress.total > 0 && (
                <div className="progress-container mx-auto mt-4 animate__animated animate__zoomIn" style={{ maxWidth: "300px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", height: "10px", overflow: "hidden" }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(importProgress.current / importProgress.total) * 100}%`, 
                      background: "var(--btn-ppal)", 
                      height: "100%", 
                      transition: "width 0.2s ease" 
                    }}
                  ></div>
                </div>
              )}
              
              <p className="small opacity-50 mt-2">
                {importProgress.total > 0
                  ? "Subiendo datos al inventario..."
                  : "Shenron está procesando tu deseo"
                }
              </p>
            </div>
          </div>
        ) : extractedProducts.length === 0 && pendingProducts.length === 0 ? (
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
            {extractedProducts.length > 0 && (
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
            )}

            <div className="scroll flex-grow-1 mb-4 pe-2">
              {extractedProducts.length > 0 && (
                <div className="d-flex flex-column gap-3">
                  {extractedProducts.map((p, idx) => {
                    const match = dbMatches[p._tempId];
                    const hasCode = p.codigo && p.codigo.trim() !== "" && p.codigo !== "null" && p.codigo.toLowerCase() !== "null";

                    let status = "nuevo";
                    if (match) {
                      status = "actualizacion";
                    } else if (!hasCode) {
                      status = "sin_codigo";
                    }

                    return (
                      <div
                        key={idx}
                        className="ia-result-card animate__animated animate__fadeInUp position-relative"
                        style={{
                          animationDelay: `${idx * 0.05}s`,
                          border: status === "sin_codigo" ? "1px dashed var(--bs-warning)" : "1px solid var(--hover-color)"
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

                        <div className="d-flex justify-content-between align-items-center mb-3">
                          {status === "actualizacion" && (
                            <span className="badge text-white px-2 py-1 rounded" style={{ fontSize: "0.7rem", fontWeight: "bold", background: "#0d6efd" }}>
                              <i className="fa-solid fa-arrows-rotate me-1"></i> Actualizar Existente
                            </span>
                          )}
                          {status === "nuevo" && (
                            <span className="badge text-white px-2 py-1 rounded" style={{ fontSize: "0.7rem", fontWeight: "bold", background: "#198754" }}>
                              <i className="fa-solid fa-plus me-1"></i> Crear Nuevo
                            </span>
                          )}
                          {status === "sin_codigo" && (
                            <span className="badge text-dark px-2 py-1 rounded" style={{ fontSize: "0.7rem", fontWeight: "bold", background: "#ffc107" }}>
                              <i className="fa-solid fa-triangle-exclamation me-1"></i> Sin Código
                            </span>
                          )}
                        </div>

                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
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
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
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
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
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
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                              Precio
                            </label>
                            <input
                              type="number"
                              className="search-input w-100"
                              value={p.precio || 0}
                              onChange={(e) =>
                                handleEditChange(idx, "precio", parseFloat(e.target.value))
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                              Stock
                            </label>
                            <input
                              type="number"
                              className="search-input w-100"
                              value={p.stock || 0}
                              onChange={(e) =>
                                handleEditChange(idx, "stock", parseInt(e.target.value))
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                        </div>

                        {/* Comparativa Visual de Cambios */}
                        {status === "actualizacion" && match && (
                          <div className="ia-card-diff mt-3 p-2 rounded-2 animate__animated animate__fadeIn" style={{ background: "rgba(13, 110, 253, 0.08)", border: "1px solid rgba(13, 110, 253, 0.15)", fontSize: "0.75rem" }}>
                            <div className="small text-muted d-flex flex-column gap-1">
                              {parseFloat(p.precio || 0) !== parseFloat(match.precio || 0) && (
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Precio:</span>
                                  <strong>
                                    ${match.precio.toLocaleString()} ➔ ${parseFloat(p.precio || 0).toLocaleString()}
                                    {match.precio > 0 && (
                                      <span className={`ms-1 ${parseFloat(p.precio || 0) > match.precio ? "text-success" : "text-danger"}`}>
                                        ({parseFloat(p.precio || 0) > match.precio ? "+" : ""}{(((parseFloat(p.precio || 0) - match.precio) / match.precio) * 100).toFixed(0)}%)
                                      </span>
                                    )}
                                  </strong>
                                </div>
                              )}
                              {parseInt(p.stock || 0) !== parseInt(match.stock || 0) && (
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>Stock:</span>
                                  <strong>
                                    {match.stock} ➔ {parseInt(p.stock || 0)}
                                    <span className={`ms-1 ${parseInt(p.stock || 0) > match.stock ? "text-success" : "text-danger"}`}>
                                      ({parseInt(p.stock || 0) > match.stock ? "+" : ""}{parseInt(p.stock || 0) - match.stock})
                                    </span>
                                  </strong>
                                </div>
                              )}
                              {parseFloat(p.precio || 0) === parseFloat(match.precio || 0) && parseInt(p.stock || 0) === parseInt(match.stock || 0) && (
                                <div className="text-center opacity-75 py-1">Sin cambios detectados</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECCIÓN 2: PRODUCTOS SIN CÓDIGO (PENDIENTES DE REVISIÓN) */}
              {pendingProducts.length > 0 && (
                <div className="mt-5 pt-4 border-top animate__animated animate__fadeIn">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="ticket-title text-warning mb-0" style={{ fontSize: "1.1rem" }}>
                      <i className="fa-solid fa-triangle-exclamation me-2"></i>
                      Revisión de Productos sin Código
                    </h4>
                    <span className="badge bg-warning text-dark rounded-pill px-3">
                      {pendingProducts.length} pendientes
                    </span>
                  </div>
                  <p className="small opacity-75 mb-4">
                    Estos productos no coinciden con ningún registro existente por nombre y no tienen código de barras. Asigna un código para guardarlos o descártalos.
                  </p>

                  <div className="d-flex flex-column gap-3 mb-4">
                    {pendingProducts.map((p, idx) => (
                      <div
                        key={idx}
                        className="ia-result-card border-warning position-relative"
                        style={{ border: "1px solid var(--bs-warning)" }}
                      >
                        <button
                          className="position-absolute top-0 end-0 m-2 btn-edit"
                          style={{
                            height: "30px",
                            width: "30px",
                            color: "#ef4444",
                            padding: 0,
                          }}
                          onClick={() => handleRemovePendingProduct(idx)}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>

                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                              Artículo
                            </label>
                            <input
                              type="text"
                              className="search-input w-100"
                              value={p.articulo || ""}
                              onChange={(e) =>
                                handlePendingEditChange(idx, "articulo", e.target.value)
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem", fontWeight: "bold", color: "var(--bs-warning)" }}>
                              Código (Requerido)
                            </label>
                            <input
                              type="text"
                              className="search-input w-100 border-warning"
                              placeholder="Escribe el código..."
                              value={p.codigo || ""}
                              onChange={(e) =>
                                handlePendingEditChange(idx, "codigo", e.target.value)
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                              Categoría
                            </label>
                            <input
                              type="text"
                              className="search-input w-100"
                              value={p.categoria || ""}
                              onChange={(e) =>
                                handlePendingEditChange(idx, "categoria", e.target.value)
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                              Precio
                            </label>
                            <input
                              type="number"
                              className="search-input w-100"
                              value={p.precio || 0}
                              onChange={(e) =>
                                handlePendingEditChange(idx, "precio", parseFloat(e.target.value))
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                              Stock
                            </label>
                            <input
                              type="number"
                              className="search-input w-100"
                              value={p.stock || 0}
                              onChange={(e) =>
                                handlePendingEditChange(idx, "stock", parseInt(e.target.value))
                              }
                              style={{ height: "35px" }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex gap-3 mb-4">
                    <button
                      className="btn-confirm-save py-3 flex-grow-1"
                      onClick={handleConfirmPending}
                      disabled={loading || pendingProducts.every(p => !p.codigo?.trim())}
                      style={{ gap: "10px", background: "var(--bs-warning)", color: "#000" }}
                    >
                      <i className="fa-solid fa-floppy-disk fa-xl"></i>
                      <span>Guardar Pendientes Resueltos</span>
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => setPendingProducts([])}
                      disabled={loading}
                      style={{ height: "54px" }}
                    >
                      Descartar Pendientes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {extractedProducts.length > 0 && (
              <div className="ia-action-bar">
                <button
                  className="btn-confirm-save py-3"
                  onClick={handleConfirmImport}
                  disabled={loading}
                  style={{ gap: "10px" }}
                >
                  <i className="fa-solid fa-cloud-arrow-up fa-xl"></i>
                  <span>Confirmar y Guardar Todo</span>
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setExtractedProducts([]);
                    setFile(null);
                  }}
                  disabled={loading}
                  style={{ height: "45px" }}
                >
                  Descartar resultados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
