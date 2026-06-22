import React, { createContext, useState } from "react";
import { toast } from "react-hot-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export const SmartImportContext = createContext();

export function SmartImportProvider({ children }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [extractedProducts, setExtractedProducts] = useState([]);
  const [dbMatches, setDbMatches] = useState({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importPrompt, setImportPrompt] = useState("");
  const [provider, setProvider] = useState("groq");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingProducts, setPendingProducts] = useState([]);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const apiUrl = import.meta.env.VITE_API_URL;
  const genAI = new GoogleGenerativeAI(apiKey);

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

  async function fileToGenerativePart(selectedFile) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(selectedFile);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: selectedFile.type },
    };
  }

  const processWithGroq = async (selectedFile, instruction, extractedText = null) => {
    let content = [];
    if (extractedText) {
      content = [
        {
          type: "text",
          text: `${instruction}\n\nTexto extraído:\n${extractedText}`,
        },
      ];
    } else if (selectedFile.type.startsWith("image/")) {
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(selectedFile);
      });

      content = [
        { type: "text", text: instruction },
        {
          type: "image_url",
          image_url: { url: `data:${selectedFile.type};base64,${base64Data}` },
        },
      ];
    } else {
      let text = "";
      if (
        selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        text = value;
      } else if (
        selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const data = await selectedFile.arrayBuffer();
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

  const checkProductMatches = async (products) => {
    const matches = {};
    let updatedSome = false;
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
                  if (!hasCode && bestMatch.codigo) {
                    p.codigo = bestMatch.codigo;
                    updatedSome = true;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Error matching product:", err);
        }
      })
    );
    setDbMatches((prev) => ({ ...prev, ...matches }));
    if (updatedSome) {
      setExtractedProducts([...products]);
    }
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
          if (bestMatch && !hasCode && bestMatch.codigo) {
            setExtractedProducts(prevProducts =>
              prevProducts.map(p =>
                p._tempId === tempId ? { ...p, codigo: bestMatch.codigo } : p
              )
            );
          }
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
4. El "codigo" debe ser puramente numérico; nunca incluyas guiones ("-"), espacios u otros caracteres especiales en él.

EJEMPLO DE FORMATO ESPERADO:
Entrada: "Cod 101 - Coca Cola 1.5L - $1200.50 (Stock: 45)"
Salida: [{"codigo": "101", "articulo": "Coca Cola 1.5L", "categoria": "Bebidas", "precio": 1200.50, "stock": 45}]

Entrada: "Alfajor Havanna x12 unidades - Precio $5000"
Salida: [{"codigo": "null", "articulo": "Alfajor Havanna x12 unidades", "categoria": "Dulces", "precio": 5000, "stock": 0}]`;
      const transcriptionPrompt =
        "Transcribe el contenido completo de este documento a texto plano, sin resumir ni inferir nada.";

      let products = [];

      if (file.type.startsWith("image/")) {
        products = await processWithGroq(file, instruction);
      } else {
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

        products = await processWithGroq(file, instruction, extractedText);
      }

      const sanitized = (Array.isArray(products) ? products : []).map((p) => ({
        ...p,
        codigo: p.codigo ? p.codigo.toString().replace(/-/g, "").trim() : "",
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

  const handleApplyAiToImport = async () => {
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
5. El "codigo" debe ser puramente numérico; nunca incluyas guiones ("-"), espacios u otros caracteres especiales en él.

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

        const parsed = JSON.parse(resText);
        if (Array.isArray(parsed)) {
          products = parsed;
        } else {
          products =
            parsed.productos ||
            parsed.items ||
            parsed.data ||
            Object.values(parsed).find((v) => Array.isArray(v)) ||
            [];
        }
      }

      if (Array.isArray(products) && products.length > 0) {
        const sanitizedProducts = products.map((p) => ({
          ...p,
          codigo: p.codigo ? p.codigo.toString().replace(/-/g, "").trim() : "",
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

  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) return;
    setLoading(true);

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
            codigo: product.codigo ? product.codigo.toString().replace(/-/g, "").trim() : "",
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
              console.log(`Saltando producto nuevo sin código de barras para revisión: ${cleanProduct.articulo}`);
              skippedBarcodeLess.push(product);
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
            codigo: product.codigo ? product.codigo.toString().replace(/-/g, "").trim() : "",
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

  const handleTestAI = async (testPrompt, setAiResponseCallback) => {
    if (loading) return;
    if (!testPrompt.trim()) {
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
        const result = await model.generateContent(testPrompt);
        setAiResponseCallback((await result.response).text());
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
              messages: [{ role: "user", content: testPrompt }],
            }),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message || "Error en Groq");
        setAiResponseCallback(data.choices[0].message.content);
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
    <SmartImportContext.Provider
      value={{
        file,
        setFile,
        prompt,
        setPrompt,
        loading,
        setLoading,
        aiResponse,
        setAiResponse,
        extractedProducts,
        setExtractedProducts,
        dbMatches,
        setDbMatches,
        importProgress,
        setImportProgress,
        importPrompt,
        setImportPrompt,
        provider,
        setProvider,
        isDragging,
        setIsDragging,
        pendingProducts,
        setPendingProducts,
        validateAndSetFile,
        handleProcessFile,
        handleApplyAiToImport,
        handleConfirmImport,
        handleConfirmPending,
        handleTestAI,
        checkSingleMatch,
        normalizeName,
      }}
    >
      {children}
    </SmartImportContext.Provider>
  );
}
