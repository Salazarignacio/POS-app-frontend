import React, { useState } from 'react';
import { processAiAction } from '../api/AiAgentService';
import { toast } from 'react-hot-toast';
import { Spinner } from 'react-bootstrap';

export default function AiChatAgent({ productos, onActionExecuted }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const aiResponse = await processAiAction(prompt, productos);
      console.log("IA Intention:", aiResponse);

      if (aiResponse.action === 'update_price') {
        const filtered = productos.filter(p => 
          (p.articulo && p.articulo.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.categoria && p.categoria.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.codigo && p.codigo.toLowerCase() === aiResponse.filter.toLowerCase())
        );

        if (filtered.length === 0) {
          toast.error(`No encontré productos con "${aiResponse.filter}"`);
        } else {
          const confirmUpdate = window.confirm(
            `Groq quiere actualizar ${filtered.length} productos de "${aiResponse.filter}" con un factor de ${aiResponse.percentage}. ¿Proceder?`
          );

          if (confirmUpdate) {
            onActionExecuted(aiResponse, filtered);
            toast.success(`Actualizando ${filtered.length} productos...`);
          }
        }
      } else if (aiResponse.action === 'set_price') {
        const filtered = productos.filter(p => 
          (p.articulo && p.articulo.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.categoria && p.categoria.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.codigo && p.codigo.toLowerCase() === aiResponse.filter.toLowerCase())
        );

        if (filtered.length === 0) {
          toast.error(`No encontré productos para fijar precio con "${aiResponse.filter}"`);
        } else {
          const confirmUpdate = window.confirm(
            `¿Fijar el precio en $${aiResponse.price} para ${filtered.length} productos de "${aiResponse.filter}"?`
          );

          if (confirmUpdate) {
            onActionExecuted(aiResponse, filtered);
            toast.success(`Fijando precio a $${aiResponse.price}...`);
          }
        }
      } else if (aiResponse.action === 'filter_view') {
        onActionExecuted(aiResponse);
      } else if (aiResponse.action === 'create_product') {
        onActionExecuted(aiResponse);
      } else if (aiResponse.action === 'update_stock') {
        const filtered = productos.filter(p => 
          (p.articulo && p.articulo.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.categoria && p.categoria.toLowerCase().includes(aiResponse.filter.toLowerCase()))
        );

        if (filtered.length === 0) {
          toast.error(`No encontré productos con "${aiResponse.filter}"`);
        } else {
          const message = aiResponse.type === 'set' 
            ? `¿Poner stock en ${aiResponse.value} para ${filtered.length} productos de "${aiResponse.filter}"?`
            : `¿Sumar ${aiResponse.value} al stock de ${filtered.length} productos de "${aiResponse.filter}"?`;

          const confirmUpdate = window.confirm(message);

          if (confirmUpdate) {
            onActionExecuted(aiResponse, filtered);
            toast.success(`Actualizando stock de ${filtered.length} productos...`);
          }
        }
      }
      
      setPrompt('');
    } catch (error) {
      toast.error("Error al procesar con IA");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat-container mb-4 w-100">
      <form onSubmit={handleSubmit} className="d-flex gap-2">
        <div className="position-relative flex-grow-1">
          <input
            type="text"
            className="search-input w-100 pr-5"
            placeholder="Comandá la app con IA (ej: 'Sube 10% a Coca Cola')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          {loading && (
            <div className="position-absolute" style={{ right: '15px', top: '50%', transform: 'translateY(-50%)' }}>
              <Spinner animation="border" size="sm" variant="warning" />
            </div>
          )}
        </div>
        <button 
          type="submit" 
          className="btn-mas" 
          disabled={loading || !prompt.trim()}
          style={{ height: '42px' }}
        >
          {loading ? 'Procesando...' : 'Preguntar'}
        </button>
      </form>
    </div>
  );
}
