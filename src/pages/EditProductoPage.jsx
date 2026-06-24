import { useContext } from "react";
import DeleteProductoBDC from "../components/DeleteProductBDC.jsx";
import ModalUpdate from "../components/ModalUpdate.jsx";
import { SelectedIds } from "../context/SelectedIds.jsx";
import { Button } from "react-bootstrap";

export default function EditProductoPage({ props, onPrint, clearSearch }) {
  const { selectedProducts, setSelectedProducts } = useContext(SelectedIds); 

  const isChecked = selectedProducts.some((p) => p.id == props.id);

  const handleSelect = (product, checked) => {
    setSelectedProducts((prev) => {
      if (checked) {
        if (prev.some((p) => p.id == product.id)) return prev;
        return [...prev, product];
      } else {
        return prev.filter((p) => p.id != product.id);
      }
    });
    if (checked && clearSearch) {
      clearSearch();
    }
  };

  const toggleSelect = (e) => {
    // Evitar disparar la selección si se hace click en los botones de acción o en el checkbox mismo
    if (e.target.closest(".prod-edit-btn") || e.target.type === "checkbox") {
      return;
    }
    handleSelect(props, !isChecked);
  };

  return (
    <ul className="productos-edit">
      <li 
        className={`producto-row ${isChecked ? "selected" : ""}`} 
        onClick={toggleSelect} 
        style={{ cursor: "pointer" }}
      >
        <span className="check">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => handleSelect(props, e.target.checked)}
          />
        </span>
        <span className="codigo">{props.codigo}</span>
        <span className="nombre">{props.articulo}</span>
        <span className="categoria">{props.categoria || "-"}</span>
        <span className="precio">${props.precio}</span>
        <span className="stock">{props.stock}</span>

        <div className="prod-edit-btn">
          <Button variant="primary" className="btn-edit" onClick={onPrint} title="Imprimir Etiqueta">
            <i className="fa-solid fa-print"></i>
          </Button>
          <ModalUpdate id={props.id}></ModalUpdate>
          <DeleteProductoBDC id={props.id} />
        </div>
      </li>
    </ul>
  );
}
