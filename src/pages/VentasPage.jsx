import { Button } from "react-bootstrap";

export default function VentasPage({
  props,
  eliminarProducto,
  actualizarCantidad,
  actualizarPrecio,
  focusFirstInput
}) {

  return (
    <div className="ventas-list">
      {props.map((a) => (
        <div key={a.codigo} className="carrito-container">
          <div>{a.articulo}</div>

          <div>
            <input
              className="sell-input"
              type="text"
              value={a.precio ? `$ ${a.precio.toLocaleString("es-AR")}` : ""}
              onChange={(e) => {
                const soloNumeros = e.target.value.replace(/\D/g, "");

                actualizarPrecio(
                  a.codigo,
                  soloNumeros ? Number(soloNumeros) : 0
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  focusFirstInput();
                }
              }}
            />
          </div>

          <div>
            <input
              className="sell-input-cantidad"
              type="text"
              inputMode="numeric"
              value={a.cantidad ? a.cantidad.toLocaleString("es-AR") : ""}
              onChange={(e) => {
                const soloNumeros = e.target.value.replace(/\D/g, "");

                actualizarCantidad(
                  a.codigo,
                  soloNumeros ? Math.max(1, Number(soloNumeros)) : 1
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  focusFirstInput();
                }
              }}
            />
          </div>

          <div className="sell-input-subtotal">
            ${(a.precio * a.cantidad).toLocaleString("es-AR")}
          </div>

          <div>
            <Button
              className="btn-edit"
              onClick={() => eliminarProducto(a.codigo)}
              tabIndex={-1}
            >
              <i className="fa-regular fa-trash-can"></i>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
