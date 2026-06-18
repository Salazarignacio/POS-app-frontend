import { getAll, getByCode } from "../api/ProductoService";
import { useState, useEffect, useContext } from "react";   
import EditPage from "../pages/EditPage";
import { ProductContext } from "../context/ProductContext";
import { SelectedIds } from "../context/SelectedIds";      
import { usePrint } from "./PrintTagsProvider";

export default function EditComponent() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { renderProducts } = useContext(ProductContext);
  const { setSelectedProducts } = useContext(SelectedIds);
  const { printSingle, printMultiple } = usePrint();

  const [searchTerm, setSearchTerm] = useState("");

  const [smartCreateData, setSmartCreateData] = useState(null);
  const [showSmartModal, setShowSmartModal] = useState(false);

  useEffect(() => {
    const handleAiFilter = (e) => {
      if (e.detail.action === 'filter_view') {
        setSearchTerm(e.detail.filter);
      }
    };
    window.addEventListener('ai-filter-view', handleAiFilter);
    return () => window.removeEventListener('ai-filter-view', handleAiFilter);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      setSelectedProducts([]); 

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
  }, [searchTerm, renderProducts, setSelectedProducts]);

  const searchCode = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = productos.map((p) => p.id);
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts([]);
    }
  };

  return (
    <div className="edit">
      <EditPage
        productos={productos}
        searchCode={searchCode}
        loading={loading}
        searchTerm={searchTerm}
        handleSelectAll={handleSelectAll}
        smartCreateData={smartCreateData}
        showSmartModal={showSmartModal}
        onCloseSmartModal={() => {
          setShowSmartModal(false);
          setSmartCreateData(null);
        }}
        printSingle={printSingle}
        printMultiple={printMultiple}
      />
    </div>
  );
}
