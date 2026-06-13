import { useContext } from "react";
import { ProductContext } from "../context/ProductContext";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { create } from "../api/ProductoService";
import CreatePageForm from "../pages/CreatePageForm";

import { toast } from "react-hot-toast";

export default function ModalCreate({ externalShow, externalOnHide, initialData }) {
  const { setRenderProducts } = useContext(ProductContext);
  const [internalShow, setInternalShow] = useState(false);
  
  const isSmart = externalShow !== undefined;
  const show = isSmart ? externalShow : internalShow;
  const handleClose = externalOnHide ? externalOnHide : () => setInternalShow(false);
  const handleShow = () => setInternalShow(true);

  const save = async (prod) => {
    try {
      const data = await create(prod);
      toast.success("Producto creado exitosamente");
      setRenderProducts((prev) => !prev);
      handleClose();
    } catch (error) {
      const errorMessage = error.message || "Error al crear el producto";
      toast.error(errorMessage);
    }
  };

  return (
    <>
      {!isSmart && (
        <Button variant="primary" className="btn-mas" onClick={handleShow} tabIndex={-1}>
          Agregar Producto{" "}
          <span className="m-2">
            <i className="fa-solid fa-plus"></i>
          </span>
        </Button>
      )}

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{initialData ? "Smart Create (IA)" : "Crear Producto"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CreatePageForm onSave={save} initialData={initialData}></CreatePageForm>
        </Modal.Body>
      </Modal>
    </>
  );
}
