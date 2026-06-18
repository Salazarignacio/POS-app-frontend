import { getAll, getByCode } from "../api/ProductoService";
import { useState, useEffect, useContext } from "react";   
import EditPage from "../pages/EditPage";
import { ProductContext } from "../context/ProductContext";
import { SelectedIds } from "../context/SelectedIds";      
import PrintTagsProvider from "./PrintTagsProvider";

export default function EditComponent() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { renderProducts, setRenderProducts } = useContext(ProductContext);
  const { setSelectedProducts } = useContext(SelectedIds);

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
      // Ya no limpiamos la selección al buscar para permitir selección acumulativa

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
      setSelectedProducts((prev) => {
        // Combinamos los productos actuales con los ya seleccionados sin duplicados por ID
        const newSelection = [...prev];
        productos.forEach(prod => {
          if (!newSelection.some(p => p.id === prod.id)) {
            newSelection.push(prod);
          }
        });
        return newSelection;
      });
    } else {
      // Si desmarcamos "Todos", solo quitamos los que están actualmente visibles
      setSelectedProducts((prev) => 
        prev.filter(p => !productos.some(visible => visible.id === p.id))
      );
    }
  };

  return (
    <div className="edit">
      <PrintTagsProvider>
        {(printSingle, printMultiple) => (
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
        )}
      </PrintTagsProvider>
    </div>
  );
}
