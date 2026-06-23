import { getAll, getByCode, filterProducts } from "../api/ProductoService";
import { useState, useEffect, useContext } from "react";   
import EditPage from "../pages/EditPage";
import { ProductContext } from "../context/ProductContext";
import { SelectedIds } from "../context/SelectedIds";      
import { usePrint } from "./PrintTagsProvider";

export default function EditComponent() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { renderProducts } = useContext(ProductContext);
  const { selectedProducts, setSelectedProducts } = useContext(SelectedIds);
  const { printSingle, printMultiple: providerPrintMultiple } = usePrint();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchCriteria, setSearchCriteria] = useState("todos");

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

      let request;
      if (searchTerm) {
        if (searchCriteria === "todos") {
          request = getByCode(searchTerm);
        } else {
          const params = {
            articulo: searchCriteria === "articulo" ? searchTerm : "",
            categoria: searchCriteria === "categoria" ? searchTerm : "",
            codigo: searchCriteria === "codigo" ? searchTerm : ""
          };
          request = filterProducts(params);
        }
      } else {
        request = getAll();
      }

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
  }, [searchTerm, searchCriteria, renderProducts]);

  const searchCode = (e) => {
    setSearchTerm(e.target.value);
  };

  // Mostrar los seleccionados al principio, y luego el resto de los productos filtrados/buscados sin duplicar
  const displayedProducts = [
    ...selectedProducts,
    ...productos.filter((p) => !selectedProducts.some((sel) => sel.id == p.id))
  ];

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts((prev) => {
        const next = [...prev];
        displayedProducts.forEach((p) => {
          if (!next.some((sel) => sel.id == p.id)) {
            next.push(p);
          }
        });
        return next;
      });
    } else {
      setSelectedProducts((prev) => {
        return prev.filter((sel) => !displayedProducts.some((p) => p.id == sel.id));
      });
    }
  };

  const handlePrintMultiple = (products) => {
    providerPrintMultiple(products);
    setSelectedProducts([]);
    setSearchTerm("");
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="edit">
      <EditPage
        productos={displayedProducts}
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
        printMultiple={handlePrintMultiple}
        clearSearch={clearSearch}
        searchCriteria={searchCriteria}
        onChangeCriteria={(criteria) => setSearchCriteria(criteria)}
      />
    </div>
  );
}
