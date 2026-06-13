import { Button } from "react-bootstrap";
import printlogo from "../assets/printlogo.png";
import { useState, useEffect, useRef } from "react";
import { update } from "../api/ProductoService";

const TicketToPrint = ({ total, subtotal, discount, items, prods, fecha, hora }) => (
  <div className="printable-ticket">
    <div className="ticket-header">
      <h2>MI NEGOCIO</h2>
      <p>Ignacio</p>
      <p>{fecha} - {hora}</p>
    </div>
    
    <div className="ticket-divider">--------------------------------</div>
    
    <div className="ticket-items">
      {prods.map((p, i) => (
        <div key={i} className="ticket-item-row">
          <div className="item-main">
            <span>{p.cantidad}x {p.articulo}</span>
          </div>
          <div className="item-prices">
            <span>${p.precio.toLocaleString("es-AR")}</span>
            <span>${(p.precio * p.cantidad).toLocaleString("es-AR")}</span>
          </div>
        </div>
      ))}
    </div>
    
    <div className="ticket-divider">--------------------------------</div>
    
    <div className="ticket-footer">
      <div className="footer-row">
        <span>Artículos:</span>
        <span>{items}</span>
      </div>
      {discount > 0 && (
        <>
          <div className="footer-row">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString("es-AR")}</span>
          </div>
          <div className="footer-row">
            <span>Descuento:</span>
            <span>-${discount.toLocaleString("es-AR")}</span>
          </div>
        </>
      )}
      <div className="footer-row total">
        <span>TOTAL:</span>
        <span>${total.toLocaleString("es-AR")}</span>
      </div>
      <div className="thanks">
        <p>¡Gracias por su compra!</p>
      </div>
    </div>
  </div>
);

export default function TicketPage({ total, subtotal, discount, items, prods, setProductos }) {
  const [animarTotal, setAnimarTotal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key.toLowerCase() === "p") || e.key === "F9") {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === "F10") {
        e.preventDefault();
        handleCancelarVenta();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [prods]); // Added prods dependency for handlePrint closure

  const handleCancelarVenta = () => {
    const ok = window.confirm("¿Cancelar la venta actual?");
    if (!ok) return;

    setProductos([]);
    localStorage.removeItem("productos");
  };

  const handlePrint = async () => {
    if (prods.length === 0) return;
    
    const ok = window.confirm("¿Confirmar venta e imprimir ticket?");
    if (!ok) return;

    // Actualizar stock en el backend
    try {
      for (const element of prods) {
        const nuevoStock = element.stock - element.cantidad;
        
        // Creamos una copia limpia para el backend restaurando el precio original
        const productToUpdate = {
          id: element.id,
          codigo: element.codigo,
          articulo: element.articulo,
          categoria: element.categoria,
          stock: nuevoStock,
          precio: element.originalPrecio !== undefined ? element.originalPrecio : element.precio
        };

        await update(element.id, productToUpdate);
      }
    } catch (error) {
      console.error("Error al actualizar stock:", error);
      alert("Error al actualizar stock, pero se procederá con la impresión.");
    }

    window.print();
    setProductos([]);
    localStorage.removeItem("productos");
  };

  const now = new Date();
  const fechaFormateada = now.toLocaleDateString("es-AR");
  const hora = now.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const totalFormateado = total.toLocaleString("es-AR");

  useEffect(() => {
    setAnimarTotal(true);
    const timer = setTimeout(() => {
      setAnimarTotal(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [total]);

  return (
    <div className="t-page">
      <div className="ticket-content">
        <h3 className="ticket-title">Resumen de Venta</h3>

        <div className="ticket-info">
          <div className="ticket-row">
            <span>
              <i className="fa-regular fa-circle-user"></i>
            </span>
            <strong>Ignacio</strong>
          </div>
          <div className="ticket-row">
            <i className="fa-regular fa-calendar-days"></i>
            <strong>{fechaFormateada}</strong>
          </div>
          <div className="ticket-row">
            <span>
              <i className="fa-regular fa-clock"></i>
            </span>
            <strong>{hora}</strong>
          </div>
          <div className="ticket-row">
            <i className="fa-solid fa-cart-shopping"></i>
            <strong>{items} artículos</strong>
          </div>

          {discount > 0 && (
            <>
              <div className="ticket-row small opacity-75">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-AR")}</span>
              </div>
              <div className="ticket-row small text-danger">
                <span>Descuento</span>
                <span>-${discount.toLocaleString("es-AR")}</span>
              </div>
            </>
          )}

          <div
            className={`ticket-row total ${animarTotal ? "total-animado" : ""}`}
          >
            <span>Total</span>
            <strong>${totalFormateado} </strong>
          </div>
        </div>
      </div>

      {/* Ticket oculto diseñado solo para impresión */}
      <div className="print-only">
        <TicketToPrint 
          total={total} 
          subtotal={subtotal}
          discount={discount}
          items={items} 
          prods={prods} 
          fecha={fechaFormateada} 
          hora={hora} 
        />
      </div>

      <div className="ticket-actions">
        <Button
          className="btn-print w-100"
          onClick={handlePrint}
          title="Imprimir (F9 / Ctrl+P)"
          disabled={prods.length === 0}
        >
          <img src={printlogo} alt="Imprimir" />
        </Button>
        <Button 
          className="btn-cancel w-100" 
          onClick={handleCancelarVenta}
          title="Cancelar Venta (F10)"
          disabled={prods.length === 0}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
