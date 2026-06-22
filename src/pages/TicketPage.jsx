import { Button } from "react-bootstrap";
import printlogo from "../assets/printlogo.png";
import { useState, useEffect } from "react";
import { update } from "../api/ProductoService";

const TicketToPrint = ({ total, subtotal, discount, items, prods, fecha, hora }) => {
  // Generar un ID de transacción aleatorio estable para esta impresión
  const txId = fecha.replace(/\//g, "") + hora.replace(/:/g, "") + Math.floor(100 + Math.random() * 900);

  return (
    <div className="printable-ticket">
      <div className="ticket-header">
        <h1 className="ticket-brand">MI NEGOCIO</h1>
        <p className="ticket-subtitle">COMPROBANTE DE COMPRA</p>
        <div className="ticket-store-info">
          <p>Responsable: Ignacio</p>
          <p>Dirección: Av. Principal 1234</p>
          <p>Tel: +54 11 9876-5432</p>
        </div>
        <div className="ticket-meta-info">
          <div><span>FECHA:</span> <span>{fecha}</span></div>
          <div><span>HORA:</span> <span>{hora}</span></div>
          <div><span>TRANS:</span> <span>#{txId}</span></div>
        </div>
      </div>

      <div className="ticket-divider-dashed"></div>

      {/* Encabezados de tabla */}
      <div className="ticket-table-header">
        <span>CANT / DETALLE</span>
        <span>SUBTOTAL</span>
      </div>

      <div className="ticket-divider-dashed"></div>

      <div className="ticket-items">
        {prods.map((p, i) => (
          <div key={i} className="ticket-item-row">
            <div className="item-row-top">
              <span className="item-name">{p.articulo.toUpperCase()}</span>
            </div>
            <div className="item-row-bottom">
              <span className="item-qty-price">{p.cantidad} x ${p.precio.toLocaleString("es-AR")}</span>
              <span className="item-subtotal">${(p.precio * p.cantidad).toLocaleString("es-AR")}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ticket-divider-dashed"></div>

      <div className="ticket-footer">
        <div className="footer-row">
          <span>CANT. ARTICULOS:</span>
          <span>{items}</span>
        </div>
        {discount > 0 && (
          <>
            <div className="footer-row">
              <span>SUBTOTAL:</span>
              <span>${subtotal.toLocaleString("es-AR")}</span>
            </div>
            <div className="footer-row discount-row">
              <span>DESCUENTO APLICADO:</span>
              <span>-${discount.toLocaleString("es-AR")}</span>
            </div>
          </>
        )}
        
        <div className="footer-row-total">
          <span>TOTAL COMPRA:</span>
          <span>${total.toLocaleString("es-AR")}</span>
        </div>
        
        <div className="ticket-divider-dashed"></div>
        
        <div className="thanks-section">
          <p className="thanks-title">¡GRACIAS POR SU COMPRA!</p>
          <p className="thanks-subtitle">Conserve este ticket</p>
        </div>
        
        {/* Código de barras simulado para el ticket */}
        <div className="ticket-barcode-wrapper">
          <svg className="ticket-barcode" viewBox="0 0 100 20">
            <rect x="0" y="0" width="3" height="20" fill="black" />
            <rect x="5" y="0" width="1" height="20" fill="black" />
            <rect x="8" y="0" width="2" height="20" fill="black" />
            <rect x="12" y="0" width="4" height="20" fill="black" />
            <rect x="18" y="0" width="1" height="20" fill="black" />
            <rect x="21" y="0" width="3" height="20" fill="black" />
            <rect x="26" y="0" width="1" height="20" fill="black" />
            <rect x="29" y="0" width="2" height="20" fill="black" />
            <rect x="33" y="0" width="4" height="20" fill="black" />
            <rect x="39" y="0" width="1" height="20" fill="black" />
            <rect x="42" y="0" width="3" height="20" fill="black" />
            <rect x="47" y="0" width="2" height="20" fill="black" />
            <rect x="51" y="0" width="1" height="20" fill="black" />
            <rect x="54" y="0" width="4" height="20" fill="black" />
            <rect x="60" y="0" width="2" height="20" fill="black" />
            <rect x="64" y="0" width="1" height="20" fill="black" />
            <rect x="67" y="0" width="3" height="20" fill="black" />
            <rect x="72" y="0" width="2" height="20" fill="black" />
            <rect x="76" y="0" width="1" height="20" fill="black" />
            <rect x="79" y="0" width="4" height="20" fill="black" />
            <rect x="85" y="0" width="2" height="20" fill="black" />
            <rect x="89" y="0" width="1" height="20" fill="black" />
            <rect x="92" y="0" width="3" height="20" fill="black" />
            <rect x="97" y="0" width="3" height="20" fill="black" />
          </svg>
          <span className="ticket-transaction-id">TX-{txId}</span>
        </div>
      </div>
    </div>
  );
};

export default function TicketPage({ total, subtotal, discount, items, prods, setProductos }) {
  const [animarTotal, setAnimarTotal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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

    setIsPrinting(true);

    // Actualizar stock en el backend
    try {
      for (const element of prods) {
        const nuevoStock = element.stock - element.cantidad;

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
    }

    // Esperamos a que termine la animación antes de abrir el cuadro de diálogo de impresión
    setTimeout(() => {
      window.print();
      setProductos([]);
      localStorage.removeItem("productos");
      setIsPrinting(false);
    }, 1000);
  };

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
  }, [prods, handlePrint, handleCancelarVenta]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="ticket-row ticket-row-meta">
            <span>
              <i className="fa-regular fa-circle-user"></i>
            </span>
            <strong>Ignacio</strong>
          </div>
          <div className="ticket-row ticket-row-meta">
            <i className="fa-regular fa-calendar-days"></i>
            <strong>{fechaFormateada}</strong>
          </div>
          <div className="ticket-row ticket-row-meta">
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
          className={`btn-print w-100 ${isPrinting ? "animating-print" : ""}`}
          onClick={handlePrint}
          title="Imprimir (F9 / Ctrl+P)"
          disabled={prods.length === 0 || isPrinting}
        >
          <img src={printlogo} alt="Imprimir" />
        </Button>
        <Button
          className="btn-cancel w-100"
          onClick={handleCancelarVenta}
          title="Cancelar Venta (F10)"
          disabled={prods.length === 0 || isPrinting}
        >
          Cancelar <span className="btn-text-extra">Compra</span> <i className="fa-solid fa-arrow-rotate-left"></i>
        </Button>
      </div>
    </div>
  );
}
