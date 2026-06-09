import { useState } from "react";

import "../style/Style.css";
import ventasicon from "../assets/ventas.png";
import editicon from "../assets/edit.png";
import balanceicon from "../assets/balance.png";
import { NavLink } from "react-router-dom";

export default function MainPage({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="general">
      {/* FLECHA SIEMPRE VISIBLE */}
      <div
        className={`toggle-btn ${open ? "open" : "closed"}`}
        onClick={() => setOpen(!open)}
      >
        {open ? <i className="fa-solid fa-x"></i> : <i className="fa-solid fa-right-long"></i>}
      </div>

      {/* ASIDE */}
      <div className={`aside ${open ? "open" : "closed"}`}>
        <div className="botones">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <img src={ventasicon} />
            <span className="nav-label">Ventas</span>
          </NavLink>
          <NavLink
            to="/edicion"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <img src={editicon} />
            <span className="nav-label">Edición</span>
          </NavLink>
          <NavLink
            to="/balance"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <img src={balanceicon} />
            <span className="nav-label">Balance</span>
          </NavLink>
          <NavLink
            to="/import"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <i className="fa-solid fa-robot" style={{fontSize: '24px', color: 'white', marginRight: '15px'}}></i>
            <span className="nav-label">IA Carga</span>
          </NavLink>
        </div>
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
