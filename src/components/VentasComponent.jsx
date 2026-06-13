import SearchIndex from "../reutilizable/SearchIndex";
import { useState, useEffect } from "react";
import { getByCode, test } from "../api/ProductoService";
import VentasPage from "../pages/VentasPage";
import "../style/Style-ventas.css";
import TicketComponent from "./TicketComponent";
import { useRef } from "react";
import { toast } from "react-hot-toast";

export default function VentasComponent({}) {
  const [prodPosibles, setProdPosibles] = useState([]);
  const [productos, setProductos] = useState(() => {
    const guardados = localStorage.getItem("productos");
    return guardados ? JSON.parse(guardados) : [];
  });
  const firstInputRef = useRef(null);

  useEffect(() => {
    const handleAiCartUpdate = (e) => {
      const { filter, quantity } = e.detail;
      setProductos((prev) => {
        const item = prev.find(p => 
          (p.articulo && p.articulo.toLowerCase().includes(filter.toLowerCase())) ||
          (p.codigo && p.codigo.toLowerCase() === filter.toLowerCase())
        );

        if (item) {
          toast.success(`Cantidad de ${item.articulo} actualizada a ${quantity}`);
          return prev.map(p => p.codigo === item.codigo ? { ...p, cantidad: quantity } : p);
        } else {
          toast.error(`"${filter}" no está en el carrito`);
          return prev;
        }
      });
    };

    window.addEventListener('ai-update-cart', handleAiCartUpdate);
    
    const handleAiClearCart = () => {
      setProductos([]);
      toast.success("Carrito vaciado");
    };
    window.addEventListener('ai-clear-cart', handleAiClearCart);

    const handleAiAddToCart = async (e) => {
      const { filter, quantity } = e.detail;
      const data = await getByCode(filter);
      if (data && data.length > 0) {
        const prod = data[0];
        setProductos((prev) => {
          const existe = prev.find((p) => p.codigo === prod.codigo);
          if (existe) {
            return prev.map((p) =>
              p.codigo === prod.codigo ? { ...p, cantidad: p.cantidad + (quantity || 1) } : p
            );
          }
          return [{ ...prod, cantidad: quantity || 1, originalPrecio: prod.precio }, ...prev];
        });
        toast.success(`Agregado: ${prod.articulo}`);
      } else {
        toast.error(`No encontré el producto "${filter}" para agregar`);
      }
    };
    window.addEventListener('ai-add-to-cart', handleAiAddToCart);

    const handleAiRemoveFromCart = (e) => {
      const { filter } = e.detail;
      setProductos((prev) => {
        const item = prev.find(p => 
          (p.articulo && p.articulo.toLowerCase().includes(filter.toLowerCase())) ||
          (p.codigo && p.codigo.toLowerCase() === filter.toLowerCase())
        );
        if (item) {
          toast.success(`Eliminado: ${item.articulo}`);
          return prev.filter(p => p.codigo !== item.codigo);
        } else {
          toast.error(`"${filter}" no está en el carrito`);
          return prev;
        }
      });
    };
    window.addEventListener('ai-remove-from-cart', handleAiRemoveFromCart);

    const handleAiCheckout = () => {
      // Disparamos un evento para que TicketComponent lo capture si es necesario, 
      // o simplemente buscamos el botón de imprimir y le damos click si existe.
      const checkoutBtn = document.querySelector('.btn-print');
      if (checkoutBtn && !checkoutBtn.disabled) {
        checkoutBtn.click();
      } else {
        toast.error("No se puede finalizar la venta (carrito vacío o faltan datos)");
      }
    };
    window.addEventListener('ai-checkout', handleAiCheckout);

    return () => {
      window.removeEventListener('ai-update-cart', handleAiCartUpdate);
      window.removeEventListener('ai-clear-cart', handleAiClearCart);
      window.removeEventListener('ai-add-to-cart', handleAiAddToCart);
      window.removeEventListener('ai-remove-from-cart', handleAiRemoveFromCart);
      window.removeEventListener('ai-checkout', handleAiCheckout);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("productos", JSON.stringify(productos));
  }, [productos]);

  /* Focus */
  const focusFirstInput = () => {
    firstInputRef.current?.focus();
  };
  const searchPosible = async (code) => {
    if (!code) {
      setProdPosibles([]);
      return;
    }

    let data = await getByCode(code);
    if (data) {
      setProdPosibles(data);
    } else setProdPosibles([]);
  };

  const searchCode = async (code) => {
    if (!code) return false;

    let data = await getByCode(code);

    if (data && data.length > 0) {
      data = data[0];
      setProductos((prev) => {
        const existe = prev.find((p) => p.codigo == data.codigo);

        if (existe) {
          return prev.map((p) =>
            p.codigo === data.codigo ? { ...p, cantidad: p.cantidad + 1 } : p,
          );
        }

        return [{ ...data, cantidad: 1, originalPrecio: data.precio }, ...prev];
      });
      return true;
    }
    return false;
  };

  const eliminarProducto = (codigo) => {
    setProductos((prev) => prev.filter((p) => p.codigo !== codigo));
  };

  const actualizarCantidad = (codigo, nuevaCantidad) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.codigo === codigo ? { ...p, cantidad: nuevaCantidad } : p,
      ),
    );
  };

  const actualizarPrecio = (codigo, nuevoPrecio) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.codigo === codigo ? { ...p, precio: nuevoPrecio } : p,
      ),
    );
  };

  return (
    <>
      {/* <h2>Ventas</h2> */}
      <div className="ventas-container">
        <div className="productos-ventas">
          <SearchIndex
            searchCode={searchCode}
            searchPosible={searchPosible}
            posibles={prodPosibles}
            inputRef={firstInputRef}
          ></SearchIndex>
          {productos.length === 0 ? (
            <div className="no-products d-flex flex-column align-items-center justify-content-center py-5 h-100">
               <i className="fa-solid fa-cart-plus fa-3x mb-3 opacity-20"></i>
               <p className="fs-5 fw-bold opacity-50">Tu carrito está vacío</p>
               <p className="small opacity-40">Busca productos para comenzar la venta</p>
            </div>
          ) : (
            <>
              <div className="carrito-titulos">
                {/* <span>Codigo</span> */}
                <span>Nombre</span>
                <span>P. Unitario</span>
                <span>Cantidad</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              <div className="scroll">
                <VentasPage
                  props={productos}
                  eliminarProducto={eliminarProducto}
                  actualizarCantidad={actualizarCantidad}
                  actualizarPrecio={actualizarPrecio}
                  focusFirstInput={focusFirstInput}
                ></VentasPage>
              </div>
            </>
          )}
        </div>
        <div className="ticket-ventas">
          <TicketComponent prods={productos} setProductos={setProductos} />
        </div>
      </div>
    </>
  );
}
