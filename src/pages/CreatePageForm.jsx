import { Form, Button } from "react-bootstrap";
import { useState } from "react";
import { getByCode } from "../api/ProductoService";

export default function CreatePageForm({ onSave }) {
  const [formData, setFormData] = useState({
    articulo: "",
    categoria: "",
    precio: "",
    stock: "",
    codigo: "",
  });
  const [touched, setTouched] = useState({
    codigo: false,
    articulo: false,
  });
  const [codigoExiste, setCodigoExiste] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
      precio: formData.precio === "" ? 0 : formData.precio,
      stock: formData.stock === "" ? 0 : formData.stock,
    };

    // Filtramos solo la categoría si está vacía, para que sea realmente opcional
    if (dataToSend.categoria === "") {
      delete dataToSend.categoria;
    }

    onSave(dataToSend);
  };

  return (
    <>
      <Form onSubmit={handleSubmit} className="update-form">
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Código</Form.Label>
          <div className="position-relative">
            <Form.Control
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              onBlur={handleBlurCodigo}
              placeholder="Ej: PROD-001"
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

        <Form.Group className="mb-3">
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
              className="input-soft"
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
              className="input-soft"
            />
          </Form.Group>
        </div>

        <Button
          type="submit"
          className={`w-100 mt-3 btn-form-submit ${isValid ? "btn-mas" : "btn-vacio"}`}
          disabled={!isValid}
        >
          Crear producto
        </Button>
      </Form>
    </>
  );
}
