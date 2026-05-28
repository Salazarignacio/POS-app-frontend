import { getAll, getByCode } from "../api/ProductoService";
import { useState, useEffect, useContext } from "react";
import EditPage from "../pages/EditPage";
import { ProductContext } from "../context/ProductContext";

export default function EditComponent() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { renderProducts } = useContext(ProductContext);

  useEffect(() => {
    setLoading(true);
    getAll()
      .then((data) => {
        setProductos(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [renderProducts]);

  const searchCode = async (e) => {
    const code = e.target.value;
    setLoading(true);
    if (!code) {
      getAll()
        .then((data) => {
          setProductos(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
      return;
    }

    getByCode(code)
      .then((data) => {
        setProductos(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Falló getByCode:", err);
        setLoading(false);
      });
  };

  return (
    <div className="edit">
      {/* <h2 className="section-title mb-2">Editar Productos</h2> */}
      <EditPage productos={productos} searchCode={searchCode} loading={loading}></EditPage>
    </div>
  );
}
