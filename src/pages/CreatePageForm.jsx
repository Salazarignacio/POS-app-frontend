import { Form, Button, Modal } from "react-bootstrap";
import { useState, useEffect, useRef } from "react";
import { getByCode } from "../api/ProductoService";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "react-hot-toast";
import { playScanBeep } from "../reutilizable/sound";

export default function CreatePageForm({ onSave, initialData }) {
  const [formData, setFormData] = useState({
    articulo: initialData?.articulo || "",
    categoria: initialData?.categoria || "",
    precio: initialData?.precio || "",
    stock: initialData?.stock || "",
    codigo: initialData?.codigo || "",
  });
  const [touched, setTouched] = useState({
    codigo: false,
    articulo: false,
  });
  const [codigoExiste, setCodigoExiste] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
        const html5QrCode = new Html5Qrcode("create-camera-reader");
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
          async (decodedText) => {
            const cleanText = decodedText.replace(/-/g, "");
            playScanBeep();
            setFormData(prev => ({ ...prev, codigo: cleanText }));
            toast.success(`Código escaneado: ${cleanText}`);
            stopCameraScan();

            if (cleanText.trim()) {
              setIsValidating(true);
              try {
                const data = await getByCode(cleanText);
                if (data && (Array.isArray(data) ? data.length > 0 : true)) {
                  setCodigoExiste(true);
                } else {
                  setCodigoExiste(false);
                }
              } catch (error) {
                console.error("Error validando código:", error);
              } finally {
                setIsValidating(false);
                setTouched((prev) => ({ ...prev, codigo: true }));
              }
            }
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

  const isValid =
    formData.codigo.trim() !== "" && 
    formData.articulo.trim() !== "" && 
    !codigoExiste && 
    !isValidating;

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (name === "codigo") {
      setCodigoExiste(false);
      setTouched(prev => ({ ...prev, codigo: false }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleBlurCodigo = async () => {
    if (!formData.codigo.trim()) {
      setTouched((prev) => ({ ...prev, codigo: true }));
      return;
    }
    
    setIsValidating(true);
    try {
      const data = await getByCode(formData.codigo);
      if (data && (Array.isArray(data) ? data.length > 0 : true)) {
        setCodigoExiste(true);
      } else {
        setCodigoExiste(false);
      }
    } catch (error) {
      console.error("Error validando código:", error);
    } finally {
      setIsValidating(false);
      setTouched((prev) => ({ ...prev, codigo: true }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    
    // Si precio o stock están vacíos, les asignamos 0 por defecto
    const dataToSend = {
      ...formData,
      categoria: formData.categoria.trim() || "",
      precio: formData.precio === "" ? 0 : formData.precio,
      stock: formData.stock === "" ? 0 : formData.stock,
    };

    onSave(dataToSend);
  };

  return (
    <>
      <Form onSubmit={handleSubmit} className="update-form">
        <div className="form-card-group">
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Código</Form.Label>
            <div className="d-flex gap-2">
              <div className="position-relative flex-grow-1">
                <Form.Control
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  onBlur={handleBlurCodigo}
                  placeholder="Ej: PROD-001"
                  className={`input-soft w-100 ${
                    (touched.codigo && !formData.codigo.trim()) || codigoExiste ? "input-error" : ""
                  }`}
                />
                {isValidating && (
                  <div className="spinner-border spinner-border-sm text-primary position-absolute" 
                       style={{ right: '12px', top: '16px' }} role="status">
                    <span className="visually-hidden">Validando...</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={startCameraScan}
                className="btn-camera-scan-input"
                title="Escanear con cámara"
              >
                <i className="fa-solid fa-camera"></i>
              </button>
            </div>
            {touched.codigo && !formData.codigo.trim() && (
              <div className="error-text">El código es obligatorio</div>
            )}
            {codigoExiste && (
              <div className="error-text">Este código ya existe en la base de datos</div>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Nombre del artículo</Form.Label>
            <Form.Control
              type="text"
              name="articulo"
              value={formData.articulo}
              onChange={handleChange}
              onBlur={() => setTouched((prev) => ({ ...prev, articulo: true }))}
              placeholder="Nombre descriptivo"
              className={`input-soft ${
                touched.articulo && !formData.articulo.trim() ? "input-error" : ""
              }`}
            />
            {touched.articulo && !formData.articulo.trim() && (
              <div className="error-text">
                El nombre del artículo es obligatorio
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="fw-bold">Categoría</Form.Label>
            <Form.Control
              type="text"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              placeholder="Opcional"
              className="input-soft"
            />
          </Form.Group>
        </div>

        <div className="form-row-2">
          <Form.Group>
            <Form.Label className="fw-bold">Precio</Form.Label>
            <Form.Control
              type="number"
              name="precio"
              inputMode="decimal"
              value={formData.precio}
              onChange={handleChange}
              placeholder="0.00"
              className="input-pill"
            />
          </Form.Group>

          <Form.Group>
            <Form.Label className="fw-bold">Stock</Form.Label>
            <Form.Control
              type="number"
              name="stock"
              inputMode="numeric"
              value={formData.stock}
              onChange={handleChange}
              placeholder="0"
              className="input-pill"
            />
          </Form.Group>
        </div>

        <div className="d-flex justify-content-center">
          <Button
            type="submit"
            className={`mt-3 btn-form-submit ${isValid ? "btn-mas" : "btn-vacio"}`}
            style={{ minWidth: "220px" }}
            disabled={!isValid}
          >
            Crear producto <i className="fa-solid fa-circle-plus ms-2"></i>
          </Button>
        </div>
      </Form>

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
            id="create-camera-reader" 
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
    </>
  );
}
