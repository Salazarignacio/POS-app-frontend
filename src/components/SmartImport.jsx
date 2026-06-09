import React, { useState } from 'react';
import { Button, Form, Card } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function SmartImport() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
      // Usamos el ID tecnico exacto que vimos en tu lista de diagnostico (indice 10)
      const model = genAI.getGenerativeModel(
        { model: "gemini-flash-latest" },
        { apiVersion: "v1beta" }
      );
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
    <div className="container mt-4">
      <h2 className="section-title mb-4">🤖 Carga Inteligente (Beta)</h2>
      
      <Card className="p-4 shadow-sm border-0 mb-4">
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Prueba de conexión (Fase 1)</Form.Label>
          <Form.Control 
            as="textarea" 
            rows={2}
            placeholder="Escribe algo para probar la IA (ej: Hola, ¿cómo estás?)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="input-soft mb-2"
          />
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleTestAI}
            disabled={loading}
          >
            {loading ? "Pensando..." : "Enviar a Gemini"}
          </Button>
        </Form.Group>

        {aiResponse && (
          <div className="mt-3 p-3 bg-light rounded shadow-sm border">
            <strong>Respuesta de la IA:</strong>
            <p className="mb-0 mt-2">{aiResponse}</p>
          </div>
        )}
      </Card>

      <Card className="p-4 shadow-sm border-0 opacity-50">
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Subir lista de precios (Próxima Fase)</Form.Label>
          <Form.Control 
            type="file" 
            disabled
            className="input-soft"
          />
        </Form.Group>
        <span>Esta sección se habilitará en la Fase 2 del proyecto.</span>
      </Card>
    </div>
  );
}

