import { getAll, getByCode, update } from "../api/ProductoService";
import { useState, useEffect, useContext } from "react";
import EditPage from "../pages/EditPage";
import { ProductContext } from "../context/ProductContext";
import { SelectedIds } from "../context/SelectedIds";
import AiChatAgent from "./AiChatAgent";
import { toast } from "react-hot-toast";

export default function EditComponent() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { renderProducts, setRenderProducts } = useContext(ProductContext);
  const { setSelectedIds } = useContext(SelectedIds);

  const [searchTerm, setSearchTerm] = useState("");

  const [smartCreateData, setSmartCreateData] = useState(null);
  const [showSmartModal, setShowSmartModal] = useState(false);

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

  const handleAiAction = async (aiResponse, filteredProducts) => {
    if (aiResponse.action === 'update_price') {
      try {
        setLoading(true);
        // Ejecutamos las actualizaciones una por una (o podrías hacer un endpoint bulk si el backend lo soporta)
        const updatePromises = filteredProducts.map(p => {
          const updatedProd = { ...p, precio: p.precio * aiResponse.percentage };
          return update(p.id, updatedProd);
        });

        await Promise.all(updatePromises);
        toast.success("¡Precios actualizados masivamente!");
        setRenderProducts(prev => !prev); // Recargar lista
      } catch (error) {
        toast.error("Error al actualizar precios masivamente");
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else if (aiResponse.action === 'set_price') {
      try {
        setLoading(true);
        const updatePromises = filteredProducts.map(p => {
          const updatedProd = { ...p, precio: aiResponse.price };
          return update(p.id, updatedProd);
        });

        await Promise.all(updatePromises);
        toast.success("¡Precios fijados correctamente!");
        setRenderProducts(prev => !prev);
      } catch (error) {
        toast.error("Error al fijar precios");
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else if (aiResponse.action === 'filter_view') {
      setSearchTerm(aiResponse.filter);
    } else if (aiResponse.action === 'create_product') {
      setSmartCreateData(aiResponse.data);
      setShowSmartModal(true);
    } else if (aiResponse.action === 'update_stock') {
      try {
        setLoading(true);
        const updatePromises = filteredProducts.map(p => {
          const newStock = aiResponse.type === 'set' 
            ? aiResponse.value 
            : (p.stock || 0) + aiResponse.value;
          
          const updatedProd = { ...p, stock: Math.max(0, newStock) }; // Evitar stock negativo
          return update(p.id, updatedProd);
        });

        await Promise.all(updatePromises);
        toast.success("¡Stock actualizado correctamente!");
        setRenderProducts(prev => !prev);
      } catch (error) {
        toast.error("Error al actualizar stock");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

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
      <AiChatAgent productos={productos} onActionExecuted={handleAiAction} />
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
      ></EditPage>
    </div>
  );
}
