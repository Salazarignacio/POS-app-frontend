import ModalCreate from "../components/ModalCreate";
import { useState, useEffect } from "react";
import { useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Modal } from "react-bootstrap";
import { toast } from "react-hot-toast";
import { playScanBeep } from "./sound";

export default function SearchIndex({ searchPosible, searchCode, posibles, inputRef }) {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [placeholder, setPlaceholder] = useState("Ingrese el código del producto ");
  const itemsRef = useRef([]);
  const containerRef = useRef(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  const startCameraScan = () => {
    setIsScanning(true);
  };

  const stopCameraScan = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    html5QrCodeRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => {
    if (isScanning) {
      setTimeout(() => {
        const html5QrCode = new Html5Qrcode("camera-reader");
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 15, 
          qrbox: (width, height) => {
            return { width: Math.min(width * 0.85, 320), height: 160 };
          },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        html5QrCode.start(
          { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          config,
          (decodedText) => {
            const cleanText = decodedText.replace(/-/g, "");
            playScanBeep();
            handleSearch(cleanText);
            toast.success(`Código escaneado: ${cleanText}`);
            stopCameraScan();
          },
          (errorMessage) => {
            // Silently ignore scan frame errors
          }
        ).catch((err) => {
          console.error("Error starting camera reader:", err);
          toast.error("No se pudo iniciar la cámara.");
          setIsScanning(false);
        });
      }, 500);
    } else {
      stopCameraScan();
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error(err));
      }
    };
  }, [isScanning]);

  useEffect(() => {
    if (!isScanning) {
      inputRef.current?.focus();
    }
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
      <div className="container-one position-relative">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
          style={{ paddingRight: "45px" }}
        />
        <button
          type="button"
          onClick={startCameraScan}
          className="position-absolute"
          style={{
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "var(--btn-ppal)",
            cursor: "pointer",
            fontSize: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            zIndex: 5
          }}
          title="Escanear con cámara"
        >
          <i className="fa-solid fa-camera"></i>
        </button>
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

      <div className="create-product-btn-wrapper">
        <ModalCreate />
      </div>

      {/* MODAL DE ESCANEO POR CÁMARA */}
      <Modal show={isScanning} onHide={stopCameraScan} centered size="md">
        <Modal.Header closeButton style={{ background: "var(--bg-contenedores)", color: "var(--font-color)", borderBottom: "1px solid var(--hover-color)" }}>
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-camera" style={{ color: "var(--btn-ppal)" }}></i>
            <span>Escaneo de Código de Barras</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "var(--bg-contenedores)", color: "var(--font-color)", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p className="small text-center opacity-75 mb-3">
            Apunta la cámara trasera de tu dispositivo hacia el código de barras.
          </p>
          <div 
            id="camera-reader" 
            style={{ 
              width: "100%", 
              maxWidth: "380px", 
              borderRadius: "12px", 
              overflow: "hidden",
              border: "2px solid var(--btn-ppal)" 
            }}
          ></div>
        </Modal.Body>
        <Modal.Footer style={{ background: "var(--bg-contenedores)", borderTop: "1px solid var(--hover-color)" }}>
          <button className="btn-cancel" onClick={stopCameraScan} style={{ height: "40px", width: "120px" }}>
            Cancelar
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
