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
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleBlurCodigo = async () => {
    setTouched((prev) => ({ ...prev, codigo: true }));
    
    if (formData.codigo.trim()) {
      setIsValidating(true);
      try {
        const data = await getByCode(formData.codigo);
        // Si data existe y no es un array vacío, o si es un array con elementos
        if (data && (Array.isArray(data) ? data.length > 0 : true)) {
          setCodigoExiste(true);
        } else {
          setCodigoExiste(false);
        }
      } catch (error) {
        console.error("Error validando código:", error);
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSave(formData);
  };

  return (
    <>
      <Form onSubmit={handleSubmit} className="update-form">
        <Form.Group className="mb-3">
          <Form.Label>Código</Form.Label>
          <Form.Control
            type="text"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            onBlur={handleBlurCodigo}
            placeholder="Código obligatorio *"
            className={`input-soft ${
              (touched.codigo && !formData.codigo.trim()) || codigoExiste ? "input-error" : ""
            }`}
          />
          {touched.codigo && !formData.codigo.trim() && (
            <div className="error-text">El código es obligatorio</div>
          )}
          {codigoExiste && (
            <div className="error-text">Este código ya existe en la base de datos</div>
          )}
          {isValidating && (
            <div className="text-muted small mt-1">Validando código...</div>
          )}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nombre del artículo</Form.Label>
          <Form.Control
            type="text"
            name="articulo"
            value={formData.articulo}
            onChange={handleChange}
            onBlur={() => setTouched((prev) => ({ ...prev, articulo: true }))}
            placeholder="Nombre artículo obligatorio *"
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
          <Form.Label>Categoría</Form.Label>
          <Form.Control
            type="text"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            className="input-soft"
          />
        </Form.Group>

        <div className="form-row-2">
          <Form.Group>
            <Form.Label>Precio</Form.Label>
            <Form.Control
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              className="input-soft"
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Stock</Form.Label>
            <Form.Control
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
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
