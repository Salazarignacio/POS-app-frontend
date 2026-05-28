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
        articulo: producto.articulo,
        categoria: producto.categoria,
        precio: producto.precio,
        porcentaje: "",
        stock: producto.stock,
        codigo: producto.codigo,
      });
      setCodigoExiste(false);
    }
  }, [producto]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (name === "codigo") {
      setCodigoExiste(false);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleBlurCodigo = async () => {
    setTouched((prev) => ({ ...prev, codigo: true }));
    
    // Si el código es el mismo que el original, no validamos
    if (producto && formData.codigo.trim() === producto.codigo) {
      setCodigoExiste(false);
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
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    let dataToSend = { ...formData };

    if (modoPrecio === "precio") {
      delete dataToSend.porcentaje;
    }

    if (modoPrecio === "porcentaje") {
      delete dataToSend.precio;
    }
    console.log(formData);
    updateFn(dataToSend);
  };
  return (
    <div>
      <Form onSubmit={handleSubmit} className="update-form">
        {!isMultiple && (
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
              <div className="error-text">Este código ya pertenece a otro producto</div>
            )}
            {isValidating && (
              <div className="text-muted small mt-1">Validando código...</div>
            )}
          </Form.Group>
        )}

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
            <div className="price-options">
              <Form.Check
                type="radio"
                label="$"
                name="modoPrecio"
                checked={modoPrecio === "precio"}
                onChange={() => {
                  setModoPrecio("precio");
                  setFormData((prev) => ({ ...prev, porcentaje: "" }));
                }}
              />

              <Form.Check
                type="radio"
                label="%"
                name="modoPrecio"
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
                modoPrecio === "precio" ? "Precio exacto" : "% de aumento"
              }
              value={
                modoPrecio === "precio" ? formData.precio : formData.porcentaje
              }
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
