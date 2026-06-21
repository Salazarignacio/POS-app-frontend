import Loading from "../reutilizable/Loading.jsx";
import EditProductoPage from "./EditProductoPage";
import ModalCreate from "../components/ModalCreate.jsx";
import "../style/Style.css";
import ModalUpdatePlural from "../components/ModalUpdatePlural.jsx"
import ModalPrintPlural from "../components/ModalPrintPlural.jsx"; 
import Skeleton from "../reutilizable/Skeleton.jsx";
import { useContext } from "react";
import { SelectedIds } from "../context/SelectedIds.jsx";


export default function EditPage({
  productos,
  searchCode,
  loading,
  searchTerm,
  handleSelectAll,
  smartCreateData,
  showSmartModal,
  onCloseSmartModal,
  printSingle,
  printMultiple,
  clearSearch
}) {
  const { selectedProducts } = useContext(SelectedIds);
  const isAllSelected = productos.length > 0 && productos.every(p => selectedProducts.some(sel => sel.id == p.id));

  return (
    <div className="edit-page">
      <div className="searchBar">
        <input
          value={searchTerm}
          onChange={searchCode}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          className="search-input"
          placeholder="Código producto"
        />

        <ModalCreate />
        <ModalCreate
          externalShow={showSmartModal}
          externalOnHide={onCloseSmartModal}
          initialData={smartCreateData}
        />
       <ModalUpdatePlural clearSearch={clearSearch}></ModalUpdatePlural>
       <ModalPrintPlural printMultiple={() => {
         printMultiple(selectedProducts);
       }}></ModalPrintPlural>
      </div>

      <div className="scroll ">
        <div className="productos-header">
          <span className="header-item">
            {searchTerm && productos.length > 0 && (
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            )}
          </span> {/* Placeholder para el checkbox */}
          <span className="header-item">Código</span>
          <span className="header-item">Nombre</span>
          <span className="header-item categoria">Categoría</span>
          <span className="header-item">Precio</span>
          <span className="header-item stock">Stock</span>
          <span className="header-item">Acciones</span>
        </div>
        {loading ? (
          <Skeleton count={8} />
        ) : productos.length < 1 ? (
          <div className="no-products">
            <div className="text-center py-5">
              <i className="fa-solid fa-magnifying-glass fa-3x mb-3 opacity-25"></i>
              <h3 className="fw-bold opacity-50">Producto no existente</h3>
              <p className="small opacity-40">Prueba con otro código o crea uno nuevo</p>
            </div>
          </div>
        ) : (
          productos.map((element, a) => {
            return (
              <div key={a} className="">
                <EditProductoPage 
                  props={element} 
                  onPrint={() => printSingle(element)}
                ></EditProductoPage>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
