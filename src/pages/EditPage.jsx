import Loading from "../reutilizable/Loading.jsx";
import EditProductoPage from "./EditProductoPage";
import ModalCreate from "../components/ModalCreate.jsx";
import "../style/Style.css";
import ModalUpdatePlural from "../components/ModalUpdatePlural.jsx"
import ModalPrintPlural from "../components/ModalPrintPlural.jsx"; 
import Skeleton from "../reutilizable/Skeleton.jsx";
import { useContext, useEffect, useRef, useState } from "react";
import { SelectedIds } from "../context/SelectedIds.jsx";
import { Html5Qrcode } from "html5-qrcode";
import { Modal } from "react-bootstrap";
import { toast } from "react-hot-toast";
import { playScanBeep } from "../reutilizable/sound";


export default function EditPage({
  productos,
  searchCode,
  loading,
  searchTerm,
  handleSelectAll,
  smartCreateData,
  showSmartModal,
  onCloseSmartModal,
  printSingle,
  printMultiple,
  clearSearch
}) {
  const { selectedProducts } = useContext(SelectedIds);
  const isAllSelected = productos.length > 0 && productos.every(p => selectedProducts.some(sel => sel.id == p.id));
  const searchInputRef = useRef(null);

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
        const html5QrCode = new Html5Qrcode("edit-camera-reader");
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 15, 
          qrbox: (width, height) => {
            return { width: Math.min(width * 0.85, 320), height: 160 };
          },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            const cleanText = decodedText.replace(/-/g, "");
            playScanBeep();
            searchCode({ target: { value: cleanText } });
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
    // Retrasar ligeramente para asegurar que la navegación de React Router haya finalizado el renderizado
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="edit-page">
      <div className="searchBar">
        <div className="position-relative flex-grow-1" style={{ minWidth: "200px" }}>
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={searchCode}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            className="search-input w-100"
            placeholder="Código producto"
            style={{ paddingRight: "45px" }}
          />
          <button
            type="button"
            onClick={startCameraScan}
            className="position-absolute camera-scan-btn"
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
        </div>

        <ModalCreate />
        <ModalCreate
          externalShow={showSmartModal}
          externalOnHide={onCloseSmartModal}
          initialData={smartCreateData}
        />
       <ModalUpdatePlural clearSearch={clearSearch}></ModalUpdatePlural>
       <ModalPrintPlural printMultiple={() => {
         printMultiple(selectedProducts);
       }}></ModalPrintPlural>
      </div>

      <div className="scroll ">
        <div className="productos-header">
          <span className="header-item">
            {searchTerm && productos.length > 0 && (
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            )}
          </span> {/* Placeholder para el checkbox */}
          <span className="header-item">Código</span>
          <span className="header-item">Nombre</span>
          <span className="header-item categoria">Categoría</span>
          <span className="header-item">Precio</span>
          <span className="header-item stock">Stock</span>
          <span className="header-item">Acciones</span>
        </div>
        {loading ? (
          <Skeleton count={8} />
        ) : productos.length < 1 ? (
          <div className="no-products">
            <div className="text-center py-5">
              <i className="fa-solid fa-magnifying-glass fa-3x mb-3 opacity-25"></i>
              <h3 className="fw-bold opacity-50">Producto no existente</h3>
              <p className="small opacity-40">Prueba con otro código o crea uno nuevo</p>
            </div>
          </div>
        ) : (
          productos.map((element, a) => {
            return (
              <div key={a} className="">
                <EditProductoPage 
                  props={element} 
                  onPrint={() => printSingle(element)}
                ></EditProductoPage>
              </div>
            );
          })
        )}
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
            id="edit-camera-reader" 
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
