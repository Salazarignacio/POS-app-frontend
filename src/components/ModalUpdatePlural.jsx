import { Button } from "react-bootstrap";
import { SelectedIds } from "../context/SelectedIds";
import { useContext, useState } from "react";
import { Modal } from "react-bootstrap";
import { getById, update } from "../api/ProductoService";
import UpdatePageForm from "../pages/UpdatePageForm";
import { ProductContext } from "../context/ProductContext";
import { toast } from "react-hot-toast";

export default function UpdatePlural() {
  const { setRenderProducts } = useContext(ProductContext);
  const { selectedIds, setSelectedIds } = useContext(SelectedIds);
  const isEmpty = selectedIds.length < 2;

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const updateProds = async (formData) => {
    try {
      const { codigo, ...dataSinCodigo } = formData;

      await Promise.all(
        selectedIds.map(async (id) => {
          const original = await getById(id);

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

          return update(id, merged);
        }),
      );

      setRenderProducts((prev) => !prev);
      setSelectedIds([]); // Limpiamos la selección después de actualizar
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
