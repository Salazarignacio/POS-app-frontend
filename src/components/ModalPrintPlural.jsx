import { Button } from "react-bootstrap";
import { SelectedIds } from "../context/SelectedIds";      
import { useContext } from "react";

export default function ModalPrintPlural({ printMultiple }) {
  const { selectedProducts } = useContext(SelectedIds);
  const isEmpty = selectedProducts.length < 2; // Habilitar solo con 2 o más

  return (
    <>
      <Button
        variant="primary"
        className={isEmpty ? "btn-vacio" : "btn-mas"}
        disabled={isEmpty}
        style={{ marginLeft: '10px' }}
        onClick={printMultiple}
      >
        Impresión Múltiple <i className="fa-solid fa-print m-2"></i>
      </Button>
    </>
  );
}
