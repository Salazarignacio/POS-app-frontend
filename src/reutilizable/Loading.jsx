import Spinner from "react-bootstrap/Spinner";

export default function Loading() {
  return (
    <div className="loading">Cargando Productos
      <div className="d-flex justify-content-center p-4">
        <Spinner animation="border" className="custom-spinner" style={{ width: "4rem", height: "4rem" }}/>
      </div>
    </div>
  );
}
