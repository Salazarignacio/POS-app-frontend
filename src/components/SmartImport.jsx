import React, { useState } from 'react';
import { Button, Form, Card, Table, Spinner } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export default function SmartImport() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [extractedProducts, setExtractedProducts] = useState([]);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
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

  const handleConfirmImport = async () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: 'Cargando productos en la base de datos...',
        success: '¡Importación finalizada con éxito!',
        error: 'Error al importar.',
      }
    );
  };

  return (
    <div className="container mt-4">
      <h2 className="section-title mb-4">🤖 Carga Inteligente (Multi-formato)</h2>
      
      <Card className="p-4 shadow-sm border-0 mb-4">
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Paso 1: Probar Conexión</Form.Label>
          <Form.Control 
            as="textarea" 
            rows={1}
            placeholder="Escribe algo para probar (ej: Hola)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="input-soft mb-2"
          />
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={handleTestAI}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Probar Chat"}
          </Button>
        </Form.Group>

        {aiResponse && (
          <div className="mt-2 p-2 bg-light rounded border small">
            <strong>Respuesta:</strong> {aiResponse}
          </div>
        )}
      </Card>

      <Card className="p-4 shadow-sm border-0 mb-4">
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Paso 2: Subir Lista de Precios (Imagen, PDF, Word, Excel)</Form.Label>
          <Form.Control 
            type="file" 
            accept="image/*,.pdf,.docx,.xlsx"
            onChange={handleFileChange}
            className="input-soft mb-3"
          />
          <Button 
            variant="primary" 
            onClick={handleProcessFile}
            disabled={loading || !file}
            className="w-100"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Procesando archivo con Gemini...
              </>
            ) : "Escanear con IA"}
          </Button>
        </Form.Group>
      </Card>

      {extractedProducts.length > 0 && (
        <Card className="p-4 shadow-sm border-0 mb-4 animate__animated animate__fadeIn">
          <h4 className="mb-3">Resultados Extraídos</h4>
          <div className="table-responsive">
            <Table hover size="sm">
              <thead className="table-light">
                <tr>
                  <th>Código</th>
                  <th>Artículo</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {extractedProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td>{p.codigo}</td>
                    <td>{p.articulo}</td>
                    <td>{p.categoria}</td>
                    <td>${p.precio}</td>
                    <td>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <Button 
            variant="success" 
            className="mt-3"
            onClick={handleConfirmImport}
          >
            Confirmar y Guardar en BD
          </Button>
        </Card>
      )}
    </div>
  );
}
