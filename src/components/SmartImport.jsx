import React, { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
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

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiUrl = import.meta.env.VITE_API_URL;
  const genAI = new GoogleGenerativeAI(apiKey);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const allowedTypes = [
      'image/jpeg', 'image/png', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (selectedFile && (selectedFile.type.startsWith('image/') || allowedTypes.includes(selectedFile.type))) {
      setFile(selectedFile);
    } else {
      toast.error("Formato no soportado. Usa JPG, PNG, PDF, DOCX o XLSX.");
    }
  };

  async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  const handleProcessFile = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero");
      return;
    }
    setLoading(true);
    setExtractedProducts([]);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }, { apiVersion: "v1beta" });
      let content = [];
      const instruction = "Analiza este documento/imagen de una lista de precios y extrae los productos. Devuelve ÚNICAMENTE un JSON array con objetos que tengan exactamente estas propiedades: codigo, articulo, categoria, precio, stock. Si un dato no está, usa null o 0 para stock. No incluyas texto extra, solo el JSON.";

      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const filePart = await fileToGenerativePart(file);
        content = [instruction, filePart];
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });
        content = [`${instruction}\n\nTexto extraído del documento:\n${text}`];
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvData = XLSX.utils.sheet_to_csv(firstSheet);
        content = [`${instruction}\n\nDatos de Excel en formato CSV:\n${csvData}`];
      }

      const result = await model.generateContent(content);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[.*\]/s);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;
      
      const products = JSON.parse(cleanJson);
      setExtractedProducts(products);
      toast.success(`Se detectaron ${products.length} productos correctamente`);
    } catch (error) {
      console.error("Error al procesar archivo:", error);
      toast.error("No se pudieron extraer los datos. Verifica el formato del archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (index, field, value) => {
    const updatedProducts = [...extractedProducts];
    updatedProducts[index][field] = value;
    setExtractedProducts(updatedProducts);
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = extractedProducts.filter((_, i) => i !== index);
    setExtractedProducts(updatedProducts);
  };

  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) return;
    setLoading(true);

    const saveProducts = async () => {
      let savedCount = 0;
      let errorCount = 0;

      for (const product of extractedProducts) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
          });

          if (response.ok) {
            savedCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error("Error guardando producto:", error);
          errorCount++;
        }
      }

      if (errorCount > 0) {
        throw new Error(`Se guardaron ${savedCount} productos, pero ${errorCount} fallaron.`);
      }
      return savedCount;
    };

    toast.promise(
      saveProducts(),
      {
        loading: 'Guardando productos en la base de datos...',
        success: (count) => {
          setExtractedProducts([]);
          setFile(null);
          return `¡Éxito! Se guardaron ${count} productos correctamente.`;
        },
        error: (err) => `Error: ${err.message}`,
      }
    ).finally(() => setLoading(false));
  };

  const handleTestAI = async () => {
    if (!apiKey) {
      toast.error("No se encontró la API Key en el archivo .env");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Escribe algo para probar la IA");
      return;
    }
    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }, { apiVersion: "v1beta" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiResponse(response.text());
      toast.success("¡IA respondiendo correctamente!");
    } catch (error) {
      console.error("Error con Gemini:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ventas-container">
      {/* PANEL IZQUIERDO: CONFIGURACIÓN Y CARGA */}
      <div className="productos-ventas p-4 d-flex flex-column gap-4" style={{ flex: 1 }}>
        <div className="d-flex align-items-center gap-3 mb-2">
          <div className="bg-primary p-3 rounded-circle text-white shadow-sm" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--btn-ppal)' }}>
            <i className="fa-solid fa-robot fa-lg"></i>
          </div>
          <h2 className="section-title mb-0">Carga Inteligente</h2>
        </div>

        {/* PASO 1: PROBAR CONEXIÓN */}
        <div className="ticket-info p-3" style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', background: 'var(--white-black)' }}>
          <label className="form-label d-block mb-2" style={{ fontSize: '0.75rem', opacity: 0.7 }}>Paso 1: Probar Conexión (Opcional)</label>
          <div className="d-flex gap-2">
            <input
              type="text"
              placeholder="Escribe algo para probar el chat"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="search-input"
              style={{ flex: 1, height: '42px' }}
            />
            <button 
              className={loading || !prompt.trim() ? "btn-vacio" : "btn-mas"}
              onClick={handleTestAI}
              disabled={loading || !prompt.trim()}
              style={{ padding: '0 15px', marginLeft: 0, height: '42px' }}
            >
              {loading ? <Spinner animation="border" size="sm" /> : <i className="fa-solid fa-paper-plane"></i>}
            </button>
          </div>
          {aiResponse && (
            <div className="mt-3 p-3 rounded-3 small animate__animated animate__fadeIn" style={{ background: 'var(--bg-contenedores)', borderLeft: '3px solid var(--btn-ppal)', color: 'var(--font-color)' }}>
              <strong>IA:</strong> {aiResponse}
            </div>
          )}
        </div>

        {/* PASO 2: SUBIR ARCHIVO */}
        <div className="ticket-info p-4 d-flex flex-column justify-content-center align-items-center text-center gap-3" 
             style={{ border: '2px dashed var(--btn-ppal)', background: 'var(--hover-color)', cursor: 'pointer', borderRadius: '15px', minHeight: '200px' }}
             onClick={() => document.getElementById('file-upload').click()}>
          <input 
            id="file-upload"
            type="file" 
            accept="image/*,.pdf,.docx,.xlsx"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <i className={`fa-solid ${file ? 'fa-file-circle-check text-success' : 'fa-cloud-arrow-up'} fa-3x opacity-50`}></i>
          <div>
            <h5 className="mb-1" style={{ color: 'var(--font-color)' }}>{file ? file.name : "Subir Lista de Precios"}</h5>
            <p className="small opacity-50 mb-0">JPG, PNG, PDF, DOCX o XLSX</p>
          </div>
          {file && (
            <button className="btn-cancel py-1 px-3 mt-2" style={{ width: 'auto', height: 'auto', fontSize: '0.8rem', border: '1px solid #ef4444' }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>
              Remover archivo
            </button>
          )}
        </div>

        <button 
          className={loading || !file ? "btn-vacio py-3" : "btn-mas py-3"}
          onClick={handleProcessFile}
          disabled={loading || !file}
          style={{ width: '100%', marginLeft: 0, height: '60px', fontSize: '1.1rem', borderRadius: '15px' }}
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
      <div className="ticket-ventas d-flex flex-column" style={{ flex: 1.5, marginLeft: '20px' }}>
        {extractedProducts.length === 0 ? (
          <div className="no-products d-flex flex-column align-items-center justify-content-center py-5 h-100 opacity-50" style={{ color: 'var(--font-color)' }}>
            <i className="fa-solid fa-list-check fa-4x mb-4"></i>
            <h4 className="fw-bold">Sin resultados aún</h4>
            <p className="small">Los productos detectados aparecerán aquí para su revisión.</p>
          </div>
        ) : (
          <div className="d-flex flex-column h-100 animate__animated animate__fadeIn" style={{ color: 'var(--font-color)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
              <h4 className="ticket-title mb-0">Resultados de Extracción</h4>
              <span className="badge bg-primary rounded-pill px-3" style={{ background: 'var(--btn-ppal)' }}>{extractedProducts.length} detectados</span>
            </div>

            <div className="scroll flex-grow-1 mb-4 pe-2">
              <div className="d-flex flex-column gap-3">
                {extractedProducts.map((p, idx) => (
                  <div key={idx} className="ticket-info p-3 position-relative animate__animated animate__fadeInUp" style={{ animationDelay: `${idx * 0.05}s`, background: 'var(--white-black)', borderRadius: '12px' }}>
                    <button 
                      className="position-absolute top-0 end-0 m-2 btn-edit" 
                      style={{ height: '30px', width: '30px', color: '#ef4444', padding: 0 }}
                      onClick={() => handleRemoveProduct(idx)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                    
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label mb-1" style={{ fontSize: '0.65rem' }}>Artículo</label>
                        <input 
                          type="text" 
                          className="search-input w-100" 
                          value={p.articulo || ''} 
                          onChange={(e) => handleEditChange(idx, 'articulo', e.target.value)}
                          style={{ height: '35px' }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label mb-1" style={{ fontSize: '0.65rem' }}>Código</label>
                        <input 
                          type="text" 
                          className="search-input w-100" 
                          value={p.codigo || ''} 
                          onChange={(e) => handleEditChange(idx, 'codigo', e.target.value)}
                          style={{ height: '35px' }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label mb-1" style={{ fontSize: '0.65rem' }}>Categoría</label>
                        <input 
                          type="text" 
                          className="search-input w-100" 
                          value={p.categoria || ''} 
                          onChange={(e) => handleEditChange(idx, 'categoria', e.target.value)}
                          style={{ height: '35px' }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label mb-1" style={{ fontSize: '0.65rem' }}>Precio</label>
                        <input 
                          type="number" 
                          className="search-input w-100" 
                          value={p.precio || 0} 
                          onChange={(e) => handleEditChange(idx, 'precio', parseFloat(e.target.value))}
                          style={{ height: '35px' }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label mb-1" style={{ fontSize: '0.65rem' }}>Stock</label>
                        <input 
                          type="number" 
                          className="search-input w-100" 
                          value={p.stock || 0} 
                          onChange={(e) => handleEditChange(idx, 'stock', parseInt(e.target.value))}
                          style={{ height: '35px' }}
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
                style={{ height: 'auto', gap: '10px' }}
              >
                <i className="fa-solid fa-cloud-arrow-up fa-2x"></i>
                <span style={{ fontSize: '1.1rem' }}>Confirmar y Guardar Todo</span>
              </button>
              <button 
                className="btn-cancel" 
                onClick={() => setExtractedProducts([])}
                disabled={loading}
                style={{ height: '45px' }}
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
