import ModalCreate from "../components/ModalCreate";
import { useState, useEffect } from "react";
import { useRef } from "react";

export default function SearchIndex({ searchPosible, searchCode, posibles, inputRef }) {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [placeholder, setPlaceholder] = useState("Ingrese el código del producto ");
  const itemsRef = useRef([]);
  const containerRef = useRef(null);
  

  useEffect(() => {
    inputRef.current?.focus();
    setSelectedIndex(-1);
  }, [posibles]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔎 BUSQUEDA FINAL (cuando se presiona ENTER o se selecciona)
  const handleSearch = async (value) => {
    if (!value.trim()) return;

    setOpen(false);
    setCode("");
    const found = await searchCode(value); // agrega producto real

    if (!found) {
      setPlaceholder("⚠️ Producto no encontrado");
      setTimeout(() => {
        setPlaceholder("Ingrese el código del producto ");
      }, 2000);
    }
  };

  // ⌨️ ENTER del lector o teclado
  const handleKeyDown = async (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      setSelectedIndex((prev) => (prev < posibles.length - 1 ? prev + 1 : 0));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : posibles.length - 1));
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (open && selectedIndex >= 0) {
        handleSelect(posibles[selectedIndex]);
      } else {
        handleSearch(code);
      }
    }

    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ✍️ solo guardar texto (NO buscar acá)
  const handleChange = (value) => {
    setCode(value);

    if (!value.trim()) {
      setOpen(false);
    }
  };

  // 🧠 DEBOUNCE PRO (dropdown humano)
  useEffect(() => {
    if (!code.trim()) {
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      await searchPosible(code); // busca en BD remoto
      
      // Solo abrir si todavía hay texto en el input
      if (code.trim()) {
        setOpen(true);
      }
    }, 300); // tiempo clave (250-350 ideal)

    return () => clearTimeout(timer);
  }, [code]);

  // 🖱️ click en dropdown
  const handleSelect = (producto) => {
    handleSearch(producto.codigo);
  };

  useEffect(() => {
    if (selectedIndex >= 0) {
      itemsRef.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  return (
    <div className="searcher-container" ref={containerRef}>
      <div className="container-one">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
        />
        {open && posibles.length > 0 && (
          <div className="buscador">
            {posibles.map((a, i) => (
              <div
                key={i}
                ref={(el) => (itemsRef.current[i] = el)}
                className={`buscador-item ${
                  i === selectedIndex ? "active" : ""
                }`}
                onClick={() => handleSelect(a)}
              >
                <div className="d-flex justify-content-between">
                  <span>{a.articulo}</span>
                  <small className="opacity-50">#{a.codigo}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <ModalCreate />
      </div>
    </div>
  );
}
