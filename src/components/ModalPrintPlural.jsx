import { Button } from "react-bootstrap";
import { SelectedIds } from "../context/SelectedIds";      
import { useContext } from "react";

export default function ModalPrintPlural() {
  const { selectedIds } = useContext(SelectedIds);
  const isEmpty = selectedIds.length < 2;

  return (
    <>
      <Button
        variant="primary"
        className={isEmpty ? "btn-vacio" : "btn-mas"}
        disabled={isEmpty}
        style={{ marginLeft: '10px' }}
      >
        Impresión Múltiple <i className="fa-solid fa-print m-2"></i>
      </Button>
    </>
  );
}

