import { getAll, getByCode } from "../api/ProductoService";
import { useState, useEffect, useContext } from "react";
import EditPage from "../pages/EditPage";
import { ProductContext } from "../context/ProductContext";
import { SelectedIds } from "../context/SelectedIds";

export default function EditComponent() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { renderProducts } = useContext(ProductContext);
  const { setSelectedIds } = useContext(SelectedIds);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      setSelectedIds([]); // Limpiamos selección al buscar o recargar
      
      const request = searchTerm 
        ? getByCode(searchTerm) 
        : getAll();

      request
        .then((data) => {
          setProductos(data || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al obtener productos:", err);
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, renderProducts]);

  const searchCode = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = productos.map((p) => p.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <div className="edit">
      {/* <h2 className="section-title mb-2">Editar Productos</h2> */}
      <EditPage
        productos={productos}
        searchCode={searchCode}
        loading={loading}
        searchTerm={searchTerm}
        handleSelectAll={handleSelectAll}
      ></EditPage>
    </div>
  );
}
