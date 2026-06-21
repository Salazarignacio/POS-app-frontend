import { useEffect, useContext } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { SelectedIds } from "../context/SelectedIds";
import { SmartImportContext } from "../context/SmartImportContext";
import "../style/Style.css";
import ventasicon from "../assets/ventas.png";
import editicon from "../assets/edit.png";
import balanceicon from "../assets/balance.png";
import aiicon from "../assets/ia.png";

export default function MainPage({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedProducts } = useContext(SelectedIds);
  const { loading: aiLoading } = useContext(SmartImportContext);

  // Limpiar selección al cambiar de sección
  useEffect(() => {
    setSelectedProducts([]);
  }, [location.pathname, setSelectedProducts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Mapeo de teclas F a rutas
      const routes = {
        F1: "/",
        F2: "/edicion",
        F3: "/balance",
        F4: "/import",
      };

      if (routes[e.key]) {
        e.preventDefault(); // Prevenir ayuda de Windows (F1), etc.
        navigate(routes[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="app-layout">
      {/* NAVEGACIÓN ESTILO FOLDER TABS */}
      <nav className="tabs-header">
        <NavLink
          to="/"
          title="Ventas (F1)"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
          <span className="tab-label">Ventas</span>
        </NavLink>

        <NavLink
          to="/edicion"
          title="Edición (F2)"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
          <span className="tab-label">Edición </span>
        </NavLink>

        <NavLink
          to="/balance"
          title="Balance (F3)"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
          <span className="tab-label">Balance</span>
        </NavLink>

        <NavLink
          to="/import"
          title="IA Carga (F4)"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
          <span className="tab-label d-flex align-items-center gap-2">
            IA Carga
            {aiLoading && (
              <span className="spinner-border spinner-border-sm custom-spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} role="status"></span>
            )}
          </span>
        </NavLink>
      </nav>

      {/* PANEL DE CONTENIDO (FUSIÓN CON SOLAPA ACTIVA) */}
      <main className="panel-content">
        {children}
      </main>
    </div>
  );
}

