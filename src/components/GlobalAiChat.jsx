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
    x: window.innerWidth - 85, 
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      // Obtenemos productos actuales para el contexto de la IA
      const productos = await getAll();
      const aiResponse = await processAiAction(prompt, productos);
      console.log("Global IA Intention:", aiResponse);

      if (aiResponse.action === 'update_price' || aiResponse.action === 'set_price' || aiResponse.action === 'update_stock') {
        const isAll = aiResponse.filter.toLowerCase() === 'todos';
        const filtered = isAll ? productos : productos.filter(p => 
          (p.articulo && p.articulo.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.categoria && p.categoria.toLowerCase().includes(aiResponse.filter.toLowerCase())) ||
          (p.codigo && p.codigo.toLowerCase() === aiResponse.filter.toLowerCase())
        );

        if (filtered.length === 0) {
          toast.error(`No encontré productos con "${aiResponse.filter}"`);
        } else {
          let message = "";
          const filterDisplay = isAll ? "TODOS los productos" : `${filtered.length} productos de "${aiResponse.filter}"`;
          
          if (aiResponse.action === 'update_price') {
            message = `¿Actualizar ${filterDisplay} con un factor de ${aiResponse.percentage}?`;
          } else if (aiResponse.action === 'set_price') {
            message = `¿Fijar el precio en $${aiResponse.price} para ${filterDisplay}?`;
          } else if (aiResponse.action === 'update_stock') {
            message = aiResponse.type === 'set' 
              ? `¿Poner stock en ${aiResponse.value} para ${filterDisplay}?`
              : `¿Sumar ${aiResponse.value} al stock de ${filterDisplay}?`;
          }

          if (window.confirm(message)) {
            const updatePromises = filtered.map(p => {
              let updatedProd = { ...p };
              if (aiResponse.action === 'update_price') {
                updatedProd.precio = p.precio * aiResponse.percentage;
              } else if (aiResponse.action === 'set_price') {
                updatedProd.precio = aiResponse.price;
              } else if (aiResponse.action === 'update_stock') {
                const newStock = aiResponse.type === 'set' ? aiResponse.value : (p.stock || 0) + aiResponse.value;
                updatedProd.stock = Math.max(0, newStock);
              }
              return update(p.id, updatedProd);
            });

            await Promise.all(updatePromises);
            toast.success("Operación realizada con éxito");
            setRenderProducts(prev => !prev);
          }
        }
      } else if (aiResponse.action === 'create_product') {
        setSmartCreateData(aiResponse.data);
        setShowSmartModal(true);
        setIsOpen(false); // Cerramos el chat para ver el modal
      } else if (aiResponse.action === 'update_cart_quantity') {
        // Despachamos evento personalizado para que VentasComponent lo escuche
        const event = new CustomEvent('ai-update-cart', { 
          detail: { filter: aiResponse.filter, quantity: aiResponse.quantity } 
        });
        window.dispatchEvent(event);
      } else if (aiResponse.action === 'add_to_cart') {
        const event = new CustomEvent('ai-add-to-cart', { 
          detail: { filter: aiResponse.filter, quantity: aiResponse.quantity } 
        });
        window.dispatchEvent(event);
      } else if (aiResponse.action === 'remove_from_cart') {
        const event = new CustomEvent('ai-remove-from-cart', { 
          detail: { filter: aiResponse.filter } 
        });
        window.dispatchEvent(event);
      } else if (aiResponse.action === 'apply_discount') {
        const event = new CustomEvent('ai-apply-discount', { 
          detail: { value: aiResponse.value, type: aiResponse.type } 
        });
        window.dispatchEvent(event);
      } else if (aiResponse.action === 'checkout') {
        const event = new CustomEvent('ai-checkout');
        window.dispatchEvent(event);
      } else if (aiResponse.action === 'clear_cart') {
        if (window.confirm("¿Seguro que querés vaciar el carrito de ventas?")) {
          const event = new CustomEvent('ai-clear-cart');
          window.dispatchEvent(event);
        }
      } else if (aiResponse.action === 'filter_view') {
        const event = new CustomEvent('ai-filter-view', { 
          detail: { action: 'filter_view', filter: aiResponse.filter } 
        });
        window.dispatchEvent(event);
        toast.success(`Filtrando por: ${aiResponse.filter}`);
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
    <>
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
        title="Asistente IA (Arrastrame)"
      >
        {isOpen ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-robot"></i>}
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
            Asistente Inteligente
          </div>
          <div className="ai-chat-body">
            <p className="small opacity-75 mb-3">
              Pedime cambios de precios, stock o creá productos.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="position-relative">
                <input
                  autoFocus
                  type="text"
                  className="search-input w-100"
                  placeholder="Ej: Sube 10% a Coca Cola..."
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
