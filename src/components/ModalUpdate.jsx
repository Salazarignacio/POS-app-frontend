import { useContext } from "react";
import { ProductContext } from "../context/ProductContext";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { update, getById } from "../api/ProductoService";
import UpdatePageForm from "../pages/UpdatePageForm.jsx";


export default function ModalUpdate({ id }) {
  const { setRenderProducts } = useContext(ProductContext);

  const [show, setShow] = useState(false);
  const [producto, setProducto] = useState(null);

  const updateProd = async (prod) => {
    const data = await update(parseInt(id), prod);
    setProducto(data);
    setRenderProducts((prev) => !prev);
    handleClose();
  };

  const handleClose = () => {
    setShow(false);
    setProducto(null);
  };
  const handleShow = async () => {
    const data = await getById(id);
    setProducto(data);
    setShow(true);
  };
  return (
    <>
      <Button variant="primary" className="btn-edit" onClick={handleShow}>
        <i className="fa-regular fa-pen-to-square"></i>
      </Button>

      <Modal show={show} onHide={handleClose} centered backdrop="static">
        <Modal.Header closeButton className="modal-header-custom">
          <Modal.Title>Editar Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UpdatePageForm
            updateFn={updateProd}
            producto={producto}
          ></UpdatePageForm>
        </Modal.Body>
      </Modal>
    </>
  );
}
