import React, { useState, useContext, useRef, useEffect } from 'react';
import { processAiAction } from '../api/AiAgentService';
import { toast } from 'react-hot-toast';
import { Spinner, Modal } from 'react-bootstrap';
import { ProductContext } from '../context/ProductContext';
import { update, getAll, create, destroy } from '../api/ProductoService';
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

  const [smartCreateData, setSmartCreateData] = useState(null);
  const [showSmartModal, setShowSmartModal] = useState(false);

  const [history, setHistory] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setPrompt(speechToText);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const renderMessageContent = (content) => {
    if (!content) return null;

    // Detectar si hay una tabla markdown
    const lines = content.split('\n');
    const tableLines = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    
    if (tableLines.length >= 3) {
      const headerRow = tableLines[0].split('|').map(c => c.trim()).filter(Boolean);
      const dataRows = tableLines.slice(2).map(row => 
        row.split('|').map(c => c.trim()).filter(c => c !== undefined)
      ).filter(row => row.length > 0);

      const cleanRows = dataRows.map(row => row.slice(0, headerRow.length));

      return (
        <div className="table-responsive my-2">
          <table className="table table-sm table-bordered m-0" style={{ fontSize: '0.78rem', color: 'inherit', borderColor: 'rgba(255,255,255,0.15)' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                {headerRow.map((col, idx) => (
                  <th key={idx} style={{ padding: '4px 8px', fontWeight: 'bold' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cleanRows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} style={{ padding: '4px 8px' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Procesar texto normal, listas y negritas
    return lines.map((line, idx) => {
      let cleanLine = line.trim();
      if (cleanLine.startsWith('|') && cleanLine.endsWith('|')) return null;

      const isBullet = cleanLine.startsWith('- ') || cleanLine.startsWith('* ');
      if (isBullet) {
        cleanLine = cleanLine.substring(2);
      }

      const parts = cleanLine.split(/\*\*([^*]+)\*\*/g);
      const formattedLine = parts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return <strong key={partIdx}>{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} style={{ marginLeft: '12px', marginBottom: '4px', listStyleType: 'disc' }}>
            {formattedLine}
          </li>
        );
      }

      return (
        <p key={idx} style={{ margin: '0 0 4px 0', minHeight: '1em' }}>
          {formattedLine}
        </p>
      );
    });
  };

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
                // Guardar snapshot de los productos modificados antes de la actualización
                const snapshot = filtered.map(p => ({
                  id: p.id,
                  precio: p.precio,
                  stock: p.stock
                }));
                setUndoStack(prev => [...prev, snapshot]);

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
            if (params.data && params.data.articulo && params.data.codigo) {
              if (window.confirm(`¿Deseas crear el producto "${params.data.articulo}" con código "${params.data.codigo}" y precio $${params.data.precio || 0}?`)) {
                try {
                  const createdProd = await create(params.data);
                  // Guardar snapshot con bandera isCreated
                  setUndoStack(prev => [...prev, [{ id: createdProd.id, isCreated: true }]]);
                  toast.success(`Producto "${params.data.articulo}" creado con éxito`);
                  setRenderProducts(prev => !prev);
                } catch (err) {
                  toast.error(err.message || "Error al crear el producto");
                }
              }
            } else {
              setSmartCreateData(params.data);
              setShowSmartModal(true);
              setIsOpen(false);
            }
          } else if (action === 'delete_product') {
            const filtered = productos.filter(p => 
              (p.articulo && p.articulo.toLowerCase().includes(params.filter.toLowerCase())) ||
              (p.categoria && p.categoria.toLowerCase().includes(params.filter.toLowerCase())) ||
              (p.codigo && p.codigo.toLowerCase() === params.filter.toLowerCase())
            );
            if (filtered.length === 0) {
              toast.error(`No encontré productos con "${params.filter}" para eliminar`);
            } else {
              if (window.confirm(`¿Deseas eliminar permanentemente ${filtered.length} productos que coinciden con "${params.filter}"?`)) {
                const snapshot = filtered.map(p => ({
                  id: p.id,
                  articulo: p.articulo,
                  codigo: p.codigo,
                  precio: p.precio,
                  stock: p.stock,
                  categoria: p.categoria,
                  isDeleted: true
                }));
                setUndoStack(prev => [...prev, snapshot]);

                const deletePromises = filtered.map(p => destroy(p.id));
                await Promise.all(deletePromises);
                toast.success("Productos eliminados con éxito");
                setRenderProducts(prev => !prev);
              }
            }
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
          } else if (action === 'undo') {
            if (undoStack.length === 0) {
              toast.error("No hay cambios recientes para deshacer");
            } else {
              const lastSnapshot = undoStack[undoStack.length - 1];
              const updatePromises = lastSnapshot.map(async (snapshotItem) => {
                if (snapshotItem.isDeleted) {
                  const { isDeleted, ...productData } = snapshotItem;
                  return create(productData);
                } else if (snapshotItem.isCreated) {
                  return destroy(snapshotItem.id);
                } else {
                  const currentProd = productos.find(p => p.id === snapshotItem.id);
                  if (currentProd) {
                    const restoredProd = {
                      ...currentProd,
                      precio: snapshotItem.precio,
                      stock: snapshotItem.stock
                    };
                    return update(snapshotItem.id, restoredProd);
                  }
                }
              });
              await Promise.all(updatePromises);
              setUndoStack(prev => prev.slice(0, -1));
              toast.success("Últimos cambios deshechos con éxito");
              setRenderProducts(prev => !prev);
            }
          }
        }
      }

      // Actualizamos el historial (limite de 10 mensajes)
      const assistantMessage = aiResponse.mensaje || aiResponse.razonamiento || "Acción ejecutada";
      const newHistory = [
        ...history,
        { role: "user", content: prompt },
        { role: "assistant", content: assistantMessage }
      ].slice(-10);
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

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <style>{`
        @keyframes pulse-mic {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.18); opacity: 1; color: #ef4444; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .btn-mic.listening {
          animation: pulse-mic 1s infinite ease-in-out !important;
        }
      `}</style>
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
          <div className="ai-chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
              Asistente de Deseos
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '1.2rem', 
                cursor: 'pointer',
                opacity: 0.8,
                transition: 'opacity 0.2s',
                padding: '0 5px'
              }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.8}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="ai-chat-body" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
            <div className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
              {history.length === 0 ? (
                <p className="small opacity-75 text-center my-auto">
                  ¿Cuál es tu deseo para el inventario hoy?
                </p>
              ) : (
                history.map((msg, index) => (
                  <div key={index} style={{ 
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.role === 'user' ? '#f59e0b' : 'var(--white-black)',
                    color: msg.role === 'user' ? 'white' : 'var(--font-color)',
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                    maxWidth: '85%',
                    fontSize: '0.85rem',
                    wordBreak: 'break-word',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    {renderMessageContent(msg.content)}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} style={{ marginTop: 'auto' }}>
              <div className="position-relative">
                <input
                  autoFocus
                  type="text"
                  className="search-input w-100"
                  placeholder="Ej: Aumentá 10% a las galletitas..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  style={{ paddingRight: '40px' }}
                />
                {loading ? (
                  <div className="position-absolute" style={{ right: '10px', top: '10px' }}>
                    <Spinner animation="border" size="sm" variant="warning" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startListening}
                    className={`position-absolute btn-mic ${isListening ? 'listening' : ''}`}
                    style={{ 
                      right: '10px', 
                      top: '8px', 
                      background: 'none', 
                      border: 'none', 
                      color: isListening ? '#ef4444' : 'var(--font-color)', 
                      opacity: isListening ? 1 : 0.6,
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '2px',
                    }}
                    title="Hablar por voz"
                  >
                    <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'}`}></i>
                  </button>
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

