import { Form, Button } from "react-bootstrap";
import { useState, useEffect } from "react";
import { getByCode } from "../api/ProductoService";

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

    let dataToSend = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== "" && v !== null)
    );

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
            <div className="position-relative">
              <Form.Control
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                onBlur={handleBlurCodigo}
                placeholder="Código único"
                className={`input-soft ${
                  (touched.codigo && !formData.codigo.trim()) || codigoExiste ? "input-error" : ""
                }`}
              />
              {isValidating && (
                <div className="spinner-border spinner-border-sm text-primary position-absolute" 
                     style={{ right: '10px', top: '12px' }} role="status">
                  <span className="visually-hidden">Validando...</span>
                </div>
              )}
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
          {isMultiple
            ? "Actualizar productos seleccionados"
            : "Actualizar producto"}
        </Button>
      </Form>
    </div>
  );
}
