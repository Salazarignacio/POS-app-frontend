import { Form, Button, Modal } from "react-bootstrap";
import { useState, useEffect, useRef } from "react";
import { getByCode } from "../api/ProductoService";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "react-hot-toast";

export default function UpdatePageForm({ updateFn, producto, isMultiple }) {
  const [modoPrecio, setModoPrecio] = useState("precio");
  const [formData, setFormData] = useState({
    articulo: "",
    categoria: "",
    precio: "",
    porcentaje: "",
    stock: "",
    codigo: "",
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
        const html5QrCode = new Html5Qrcode("update-camera-reader");
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 15, 
          qrbox: (width, height) => {
            return { width: Math.min(width * 0.85, 280), height: 120 };
          },
          aspectRatio: 1.0
        };

        html5QrCode.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            const cleanText = decodedText.replace(/-/g, "");
            setFormData(prev => ({ ...prev, codigo: cleanText }));
            toast.success(`Código escaneado: ${cleanText}`);
            stopCameraScan();

            if (producto && cleanText.trim() === producto.codigo) {
              setCodigoExiste(false);
              setTouched((prev) => ({ ...prev, codigo: true }));
              return;
            }

            if (!isMultiple && cleanText.trim()) {
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

  const isValid = isMultiple
    ? Object.entries(formData).some(
        ([key, value]) => key !== "codigo" && value !== "",
      )
    : formData.codigo.trim() !== "" && 
      formData.articulo.trim() !== "" && 
      !codigoExiste && 
      !isValidating;

  useEffect(() => {
    if (producto) {
      setFormData({
        articulo: producto.articulo || "",
        categoria: producto.categoria || "",
        precio: producto.precio || "",
        porcentaje: "",
        stock: producto.stock || "",
        codigo: producto.codigo || "",
      });
      setCodigoExiste(false);
      setTouched({ codigo: false, articulo: false });
    }
  }, [producto]);

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
    if (producto && formData.codigo.trim() === producto.codigo) {
      setCodigoExiste(false);
      setTouched((prev) => ({ ...prev, codigo: true }));
      return;
    }

    if (!isMultiple && formData.codigo.trim()) {
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
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    let dataToSend;
    
    if (isMultiple) {
      // Para actualización múltiple, solo enviamos lo que el usuario escribió
      dataToSend = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== "" && v !== null)
      );
    } else {
      // Para un solo producto, aseguramos que codigo y articulo estén, 
      // y aplicamos los defaults de 0 a los campos numéricos vacíos
      dataToSend = {
        ...formData,
        categoria: formData.categoria.trim() || "",
        precio: formData.precio === "" ? 0 : formData.precio,
        stock: formData.stock === "" ? 0 : formData.stock,
      };
      delete dataToSend.porcentaje;
    }

    if (modoPrecio === "precio") {
      delete dataToSend.porcentaje;
    } else if (modoPrecio === "porcentaje") {
      delete dataToSend.precio;
    }

    updateFn(dataToSend);
  };
  return (
    <div>
      {isMultiple && (
        <div className="alert-info-custom mb-4">
          <i className="fa-solid fa-circle-info"></i>
          <span>Los campos vacíos <strong>no se modificarán</strong> en los productos seleccionados.</span>
        </div>
      )}
      <Form onSubmit={handleSubmit} className="update-form">
        {!isMultiple && (
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
                  placeholder="Código único"
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
              <div className="error-text">Este código ya pertenece a otro producto</div>
            )}
          </Form.Group>
        )}

        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">
            {isMultiple ? "Nuevo nombre (opcional)" : "Nombre del artículo"}
          </Form.Label>
          <Form.Control
            type="text"
            name="articulo"
            value={formData.articulo}
            onChange={handleChange}
            onBlur={() => setTouched((prev) => ({ ...prev, articulo: true }))}
            placeholder={isMultiple ? "Dejar vacío para mantener original" : "Nombre descriptivo"}
            className={`input-soft ${
              !isMultiple && touched.articulo && !formData.articulo.trim() ? "input-error" : ""
            }`}
          />
          {!isMultiple && touched.articulo && !formData.articulo.trim() && (
            <div className="error-text">
              El nombre del artículo es obligatorio
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">
            {isMultiple ? "Nueva categoría (opcional)" : "Categoría"}
          </Form.Label>
          <Form.Control
            type="text"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            placeholder={isMultiple ? "Mantener original" : ""}
            className="input-soft"
          />
        </Form.Group>

        <div className="form-row-2">
          <Form.Group>
            <Form.Label className="fw-bold">Precio / Aumento</Form.Label>
            <div className="price-options mb-2">
              <Form.Check
                type="radio"
                label="Precio $"
                name="modoPrecio"
                id="radio-precio"
                checked={modoPrecio === "precio"}
                onChange={() => {
                  setModoPrecio("precio");
                  setFormData((prev) => ({ ...prev, porcentaje: "" }));
                }}
              />

              <Form.Check
                type="radio"
                label="Aumento %"
                name="modoPrecio"
                id="radio-porcentaje"
                checked={modoPrecio === "porcentaje"}
                onChange={() => {
                  setModoPrecio("porcentaje");
                  setFormData((prev) => ({ ...prev, precio: "" }));
                }}
              />
            </div>

            <Form.Control
              type="number"
              name={modoPrecio === "precio" ? "precio" : "porcentaje"}
              inputMode="decimal"
              placeholder={
                modoPrecio === "precio" ? "Valor fijo" : "% sobre actual"
              }
              value={
                modoPrecio === "precio" ? formData.precio : formData.porcentaje
              }
              onChange={handleChange}
              className="input-soft"
            />
            {isMultiple && modoPrecio === "porcentaje" && formData.porcentaje && (
              <div className="text-primary x-small mt-1" style={{ fontSize: '0.75rem' }}>
                <i className="fa-solid fa-wand-magic-sparkles me-1"></i>
                Se aplicará un {formData.porcentaje}% a cada producto.
              </div>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label className="fw-bold">
              {isMultiple ? "Nuevo Stock" : "Stock"}
            </Form.Label>
            <Form.Control
              type="number"
              name="stock"
              inputMode="numeric"
              value={formData.stock}
              onChange={handleChange}
              placeholder={isMultiple ? "Opcional" : "0"}
              className="input-soft"
            />
          </Form.Group>
        </div>

{/*         <Form.Group>
          <Form.Label>Proveedor / Marca</Form.Label>
          <Form.Control
            type="number"
            name="proveedor"
            value={formData.proveedor}
            onChange={handleChange}
            className="input-soft"
          />
        </Form.Group> */}

        <Button
          type="submit"
          className={`w-100 mt-3 btn-form-submit ${isValid ? "btn-mas" : "btn-vacio"}`}
          disabled={!isValid}
        >
          {isMultiple ? (
            <>
              Actualizar productos seleccionados <i className="fa-solid fa-floppy-disk ms-2"></i>
            </>
          ) : (
            <>
              Actualizar producto <i className="fa-solid fa-floppy-disk ms-2"></i>
            </>
          )}
        </Button>
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
            id="update-camera-reader" 
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
