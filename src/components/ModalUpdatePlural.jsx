import { Button } from "react-bootstrap";
import { SelectedIds } from "../context/SelectedIds";
import { useContext, useState } from "react";
import { Modal } from "react-bootstrap";
import { getById, update } from "../api/ProductoService";
import UpdatePageForm from "../pages/UpdatePageForm";
import { ProductContext } from "../context/ProductContext";
import { toast } from "react-hot-toast";

export default function UpdatePlural({ clearSearch }) {
  const { setRenderProducts } = useContext(ProductContext);
  const { selectedProducts, setSelectedProducts } = useContext(SelectedIds);
  const isEmpty = selectedProducts.length < 2;

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const updateProds = async (formData) => {
    try {
      const { codigo, ...dataSinCodigo } = formData;

      await Promise.all(
        selectedProducts.map(async (product) => {
          const original = await getById(product.id);

          // 👇 Construimos solo los campos no vacíos
          const filteredData = Object.fromEntries(
            Object.entries(dataSinCodigo).filter(
              ([_, value]) => value !== "" && value !== null,
            ),
          );

          const merged = {
            ...original,
            ...filteredData,
          };

          return update(product.id, merged);
        }),
      );

      setRenderProducts((prev) => !prev);
      setSelectedProducts([]); // Limpiamos la selección después de actualizar
      if (clearSearch) clearSearch();
      toast.success("Productos actualizados correctamente");
      handleClose();
    } catch (error) {
      console.error("Error en actualización múltiple", error);
      toast.error("Error al actualizar productos");
    }
  };

  return (
    <>
      <Button
        variant="primary"
        className={isEmpty ? "btn-vacio" : "btn-mas"}
        disabled={isEmpty}
        onClick={handleShow}
      >
        Edición Múltiple <i className="fa-regular fa-pen-to-square m-2"></i>
      </Button>

      <Modal show={show} onHide={handleClose} centered backdrop="static">
        <Modal.Header closeButton className="modal-header-custom">
          <Modal.Title>Editar Productos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UpdatePageForm updateFn={updateProds} isMultiple={true} />
        </Modal.Body>
      </Modal>
    </>
  );
}

