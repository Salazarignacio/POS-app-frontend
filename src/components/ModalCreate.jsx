import { useContext } from "react";
import { ProductContext } from "../context/ProductContext";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { create } from "../api/ProductoService";
import CreatePageForm from "../pages/CreatePageForm";

import { toast } from "react-hot-toast";

export default function ModalCreate({}) {
  const { setRenderProducts } = useContext(ProductContext);
  const [show, setShow] = useState(false);
  const [producto, setProducto] = useState(null);

  const save = async (prod) => {
    try {
      const data = await create(prod);
      toast.success("Producto creado exitosamente");
      setProducto(data);
      setRenderProducts((prev) => !prev);
      handleClose();
    } catch (error) {
      // Intentamos extraer el mensaje de error específico si existe
      const errorMessage = error.message || "Error al crear el producto";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  return (
    <>
      <Button variant="primary" className="btn-mas" onClick={handleShow} tabIndex={-1}>
        Agregar Producto{" "}
        <span className="m-2">
          <i className="fa-solid fa-plus"></i>
        </span>
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Crear Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CreatePageForm onSave={save}></CreatePageForm>
        </Modal.Body>
      </Modal>
    </>
  );
}
