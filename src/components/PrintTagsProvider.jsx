import { useContext, useState, useEffect } from "react";
import { ProductContext } from "../context/ProductContext";
import { SelectedIds } from "../context/SelectedIds";

export default function PrintTagsProvider({ children }) {
  const [tagsToPrint, setTagsToPrint] = useState([]);
  const { setSelectedProducts } = useContext(SelectedIds);

  const printSingle = (product) => {
    setTagsToPrint([product]);
  };

  const printMultiple = (products) => {
    setTagsToPrint(products);
  };

  useEffect(() => {
    if (tagsToPrint.length > 0) {
      setTimeout(() => {
        window.print();
        setTagsToPrint([]);
        setSelectedProducts([]); // Limpiar selección después de imprimir
      }, 100);
    }
  }, [tagsToPrint, setSelectedProducts]);

  return (
    <>
      {children(printSingle, printMultiple)}
      
      <div className="print-only">
        {tagsToPrint.map((prod, index) => (
          <div key={index} className="printable-tag">
            <div className="tag-articulo">{prod.articulo}</div>
            <div className="tag-precio">${prod.precio.toLocaleString("es-AR")}</div>
          </div>
        ))}
      </div>
    </>
  );
}
