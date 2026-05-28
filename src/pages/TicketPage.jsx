import { Button } from "react-bootstrap";
import printlogo from "../assets/printlogo.png";
import { useState, useEffect } from "react";
import { update } from "../api/ProductoService";

export default function TicketPage({ total, items, prods, setProductos }) {
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
  }, []);

  const handleCancelarVenta = () => {
    const ok = window.confirm("¿Cancelar la venta actual?");
    if (!ok) return;

    setProductos([]);
    localStorage.removeItem("productos");
  };
  const handlePrint = async () => {
    const ok = window.confirm("Imprimir ticket?");
    if (!ok) return;
    prods.map((element) => {
      element.stock = element.stock - element.cantidad;
      return element;
    });
    prods.map(async (element) => {
      const actualizarStock = await update(element.id, element);
    });

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

          <div
            className={`ticket-row total ${animarTotal ? "total-animado" : ""}`}
          >
            <span>Total</span>
            <strong>${totalFormateado} </strong>
          </div>
        </div>
      </div>

      <div className="ticket-actions">
        <Button
          className="btn-primary-soft w-100 btn-print"
          onClick={handlePrint}
          title="Imprimir (F9 / Ctrl+P)"
        >
          <img src={printlogo} alt="Imprimir" />
        </Button>

        <Button 
          className="btn-cancel w-100" 
          onClick={handleCancelarVenta}
          title="Cancelar Venta (F10)"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
