import React, { useState, useContext, useRef, useEffect } from 'react';
import { processAiAction } from '../api/AiAgentService';
import { toast } from 'react-hot-toast';
import { Spinner, Modal } from 'react-bootstrap';
import { ProductContext } from '../context/ProductContext';
import { update, getAll } from '../api/ProductoService';
import ModalCreate from './ModalCreate';

export default function GlobalAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setRenderProducts } = useContext(ProductContext);

  // DRAG LOGIC
  const [position, setPosition] = useState({ 
    x: 20, 
    y: window.innerHeight - 85 
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartTime = useRef(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    dragStartTime.current = Date.now();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = Math.min(Math.max(10, e.clientX - dragOffset.current.x), window.innerWidth - 70);
      const newY = Math.min(Math.max(10, e.clientY - dragOffset.current.y), window.innerHeight - 70);
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleChat = (e) => {
    // Si el clic duró poco, lo tomamos como intención de abrir el chat, no de arrastrar
    const dragDuration = Date.now() - dragStartTime.current;
    if (dragDuration < 200) {
      setIsOpen(!isOpen);
    }
  };

  // Para el Smart Create desde la IA Global
  const [smartCreateData, setSmartCreateData] = useState(null);
  const [showSmartModal, setShowSmartModal] = useState(false);

  const [history, setHistory] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const productos = await getAll();
      // Pasamos el historial actual
      const aiResponse = await processAiAction(prompt, productos, history);
      console.log("Global AI Full Response:", aiResponse);

      // Si la IA devolvió acciones, las procesamos una por una
      if (aiResponse.actions && Array.isArray(aiResponse.actions)) {
        for (const actionObj of aiResponse.actions) {
          const { action, params } = actionObj;
          
          if (action === 'update_price' || action === 'set_price' || action === 'update_stock') {
            const isAll = params.filter?.toLowerCase() === 'todos';
            const filtered = isAll ? productos : productos.filter(p => 
              (p.articulo && p.articulo.toLowerCase().includes(params.filter.toLowerCase())) ||
              (p.categoria && p.categoria.toLowerCase().includes(params.filter.toLowerCase())) ||
              (p.codigo && p.codigo.toLowerCase() === params.filter.toLowerCase())
            );

            if (filtered.length === 0) {
              toast.error(`No encontré productos con "${params.filter}"`);
            } else {
              let message = "";
              if (action === 'update_price') message = `Â¿Actualizar ${filtered.length} productos con un factor de ${params.percentage}?`;
              else if (action === 'set_price') message = `Â¿Fijar el precio en $${params.price} para ${filtered.length} productos?`;
              else if (action === 'update_stock') message = params.type === 'set' ? `Â¿Poner stock en ${params.value}?` : `Â¿Sumar ${params.value} al stock?`;

              if (window.confirm(message)) {
                const updatePromises = filtered.map(p => {
                  let updatedProd = { ...p };
                  if (action === 'update_price') updatedProd.precio = p.precio * params.percentage;
                  else if (action === 'set_price') updatedProd.precio = params.price;
                  else if (action === 'update_stock') {
                    const newStock = params.type === 'set' ? params.value : (p.stock || 0) + params.value;
                    updatedProd.stock = Math.max(0, newStock);
                  }
                  return update(p.id, updatedProd);
                });
                await Promise.all(updatePromises);
                toast.success("Operación realizada con éxito");
                setRenderProducts(prev => !prev);
              }
            }
          } else if (action === 'create_product') {
            setSmartCreateData(params.data);
            setShowSmartModal(true);
            setIsOpen(false);
          } else if (action === 'filter_view') {
            const event = new CustomEvent('ai-filter-view', { detail: { action: 'filter_view', filter: params.filter } });
            window.dispatchEvent(event);
          } else if (action === 'add_to_cart') {
            const event = new CustomEvent('ai-add-to-cart', { detail: { filter: params.filter, quantity: params.quantity || 1 } });
            window.dispatchEvent(event);
          } else if (action === 'clear_cart') {
            window.dispatchEvent(new CustomEvent('ai-clear-cart'));
          } else if (action === 'checkout') {
            window.dispatchEvent(new CustomEvent('ai-checkout'));
          } else if (action === 'print_labels') {
            const filtered = productos.filter(p => 
              (p.articulo && p.articulo.toLowerCase().includes(params.filter.toLowerCase())) ||
              (p.categoria && p.categoria.toLowerCase().includes(params.filter.toLowerCase())) ||
              (p.codigo && p.codigo.toLowerCase() === params.filter.toLowerCase())
            );
            if (filtered.length === 0) {
              toast.error(`No encontré productos con "" para imprimir`);
            } else {
              if (window.confirm(`¿Deseas imprimir etiquetas para  productos?`)) {
                window.dispatchEvent(new CustomEvent('ai-print-tags', { detail: { products: filtered } }));
              }
            }
          }
        }
      }

      // Actualizamos el historial (limite de 6 mensajes para no saturar)
      const newHistory = [
        ...history,
        { role: "user", content: prompt },
        { role: "assistant", content: aiResponse.razonamiento || "AcciÃ³n ejecutada" }
      ].slice(-6);
      setHistory(newHistory);
      
      setPrompt('');
    } catch (error) {
      toast.error("Error al procesar con IA");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    // Mostrar saludo a los 2 segundos de cargar la app
    const timer = setTimeout(() => {
      setShowGreeting(true);
    }, 2000);

    // Ocultarlo automÃ¡ticamente a los 7 segundos
    const hideTimer = setTimeout(() => {
      setShowGreeting(false);
    }, 9000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {/* Saludo Inicial */}
      {showGreeting && !isOpen && (
        <div 
          className="ai-greeting-bubble"
          style={{ 
            left: `${position.x + 70}px`, 
            top: `${position.y}px`,
            position: 'fixed',
            zIndex: 999
          }}
        >
          Pide un deseo! Puedo gestionar tu inventario y hacer tus tareas ✨
          <button className="close-greeting" onClick={() => setShowGreeting(false)}>Ã—</button>
        </div>
      )}

      {/* Botón Flotante (Icono de IA) */}
      <button 
        className={`ai-floating-button ${isOpen ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
        onClick={toggleChat}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          position: 'fixed',
          cursor: isDragging ? 'grabbing' : 'grab',
          bottom: 'auto',
          right: 'auto',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        title="Pide un deseo (Arrastrame)"
      >
        {isOpen ? <i className="fa-solid fa-xmark"></i> : (
          <div className="dragon-ball-stars">
            <i className="fa-solid fa-star"></i>
            <i className="fa-solid fa-star"></i>
            <i className="fa-solid fa-star"></i>
            <i className="fa-solid fa-star"></i>
          </div>
        )}
      </button>

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div 
          className="ai-chat-popup"
          style={{
            left: position.x < (window.innerWidth / 2) ? `${position.x}px` : `${position.x - 290}px`,
            top: position.y < (window.innerHeight / 2) ? `${position.y + 70}px` : `${position.y - 320}px`,
            bottom: 'auto',
            right: 'auto'
          }}
        >
          <div className="ai-chat-header">
            <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
            Asistente de Deseos
          </div>
          <div className="ai-chat-body">
            <p className="small opacity-75 mb-3">
              Â¿Cuál es tu deseo para el inventario hoy?
            </p>
            <form onSubmit={handleSubmit}>
              <div className="position-relative">
                <input
                  autoFocus
                  type="text"
                  className="search-input w-100"
                  placeholder="Ej: Aumentá 10% a las galletitas..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                />
                {loading && (
                  <div className="position-absolute" style={{ right: '10px', top: '10px' }}>
                    <Spinner animation="border" size="sm" variant="warning" />
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className="btn-mas w-100 mt-2" 
                disabled={loading || !prompt.trim()}
                style={{ marginLeft: 0 }}
              >
                {loading ? 'Procesando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Smart Create desde la IA Global */}
      <ModalCreate 
        externalShow={showSmartModal} 
        externalOnHide={() => {
          setShowSmartModal(false);
          setSmartCreateData(null);
        }} 
        initialData={smartCreateData}
      />
    </>
  );
}

