import "../style/Style.css";
import ventasicon from "../assets/ventas.png";
import editicon from "../assets/edit.png";
import balanceicon from "../assets/balance.png";
import aiicon from "../assets/ia.png";
import { NavLink } from "react-router-dom";

export default function MainPage({ children }) {
  return (
    <div className="app-layout">
      {/* NAVEGACIÓN ESTILO FOLDER TABS */}
      <nav className="tabs-header">
        <NavLink
          to="/"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
           {/* <img src={ventasicon} alt="Ventas" className="tab-icon" />  */}
          <span className="tab-label">Ventas</span>
        </NavLink>

        <NavLink
          to="/edicion"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
           {/* <img src={editicon} alt="Edición" className="tab-icon" />  */}
          <span className="tab-label">Edición</span>
        </NavLink>

        <NavLink
          to="/balance"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
          {/* <img src={balanceicon} alt="Balance" className="tab-icon" /> */}
          <span className="tab-label">Balance</span>
        </NavLink>

        <NavLink
          to="/import"
          className={({ isActive }) => `tab-link ${isActive ? "tab-active" : ""}`}
        >
          {/* <img src={aiicon} alt="IA Carga" className="tab-icon" /> */}
          <span className="tab-label">IA Carga</span>
        </NavLink>
      </nav>

      {/* PANEL DE CONTENIDO (FUSIÓN CON SOLAPA ACTIVA) */}
      <main className="panel-content">
        {children}
      </main>
    </div>
  );
}

