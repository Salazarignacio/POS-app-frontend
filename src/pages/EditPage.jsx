import Loading from "../reutilizable/Loading.jsx";
import EditProductoPage from "./EditProductoPage";
import ModalCreate from "../components/ModalCreate.jsx";
import "../style/Style.css";
import ModalUpdatePlural from "../components/ModalUpdatePlural.jsx"
import Skeleton from "../reutilizable/Skeleton.jsx";


export default function EditPage({ productos, searchCode, loading }) {
  return (
    <div className="edit-page">
      <div className="searchBar">
        <input
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
       <ModalUpdatePlural></ModalUpdatePlural> 
      </div>

      <div className="scroll ">
        <div className="productos-header">
          <span className="header-item"></span> {/* Placeholder para el checkbox */}
          <span className="header-item">Código</span>
          <span className="header-item">Nombre</span>
          <span className="header-item">Categoría</span>
          <span className="header-item">Precio</span>
          <span className="header-item">Stock</span>
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
                <EditProductoPage props={element}></EditProductoPage>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
