import { useContext } from "react";
import DeleteProductoBDC from "../components/DeleteProductBDC.jsx";
import ModalUpdate from "../components/ModalUpdate.jsx";
import { SelectedIds } from "../context/SelectedIds.jsx";
import { Button } from "react-bootstrap";

export default function EditProductoPage({ props, onPrint }) {
  const { selectedIds, setSelectedIds } = useContext(SelectedIds); 
  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      } else {
        return prev.filter((p) => p !== id);
      }
    });
  };

  return (
    <ul className="productos-edit">
      <li className="producto-row">
        <span className="check">
          <input
            type="checkbox"
            checked={selectedIds.includes(props.id)}
            onChange={(e) => handleSelect(props.id, e.target.checked)}
          />
        </span>
        <span className="codigo">{props.codigo}</span>
        <span className="nombre">{props.articulo}</span>
        <span className="categoria">{props.categoria}</span>
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
