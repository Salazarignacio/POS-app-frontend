import { useContext, useState, useEffect, createContext } from "react";
import { SelectedIds } from "../context/SelectedIds";      

const PrintContext = createContext();

export const usePrint = () => useContext(PrintContext);

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
    const handleAiPrint = (e) => {
      const { products } = e.detail;
      if (products && products.length > 0) {
        printMultiple(products);
      }
    };

    window.addEventListener('ai-print-tags', handleAiPrint);
    return () => window.removeEventListener('ai-print-tags', handleAiPrint);
  }, []);

  useEffect(() => {
    if (tagsToPrint.length > 0) {
      setTimeout(() => {
        window.print();
        setTagsToPrint([]);
        if (setSelectedProducts) setSelectedProducts([]); 
      }, 100);
    }
  }, [tagsToPrint, setSelectedProducts]);

  return (
    <PrintContext.Provider value={{ printSingle, printMultiple }}>
      {typeof children === 'function' ? children(printSingle, printMultiple) : children}

      <div className="print-only">
        {tagsToPrint.map((prod, index) => (
          <div key={index} className="printable-tag">
            <div className="tag-inner">
              {/* Encabezado con marca y categoría */}
              <div className="tag-header">
                <span className="tag-brand">MI NEGOCIO</span>
                <span className="tag-category">{prod.categoria || "ALMACEN"}</span>
              </div>
              
              {/* Cuerpo con artículo y precio grande */}
              <div className="tag-body">
                <div className="tag-articulo">{prod.articulo}</div>
                <div className="tag-precio-box">
                  <span className="tag-currency">$</span>
                  <span className="tag-price-value">{prod.precio.toLocaleString("es-AR")}</span>
                </div>
              </div>
              
              {/* Pie de página con código de barras y metadatos */}
              <div className="tag-footer">
                <div className="tag-barcode-container">
                  <svg className="tag-barcode" viewBox="0 0 100 25">
                    <rect x="0" y="0" width="2" height="25" fill="black" />
                    <rect x="3" y="0" width="1" height="25" fill="black" />
                    <rect x="5" y="0" width="3" height="25" fill="black" />
                    <rect x="9" y="0" width="1" height="25" fill="black" />
                    <rect x="12" y="0" width="2" height="25" fill="black" />
                    <rect x="15" y="0" width="4" height="25" fill="black" />
                    <rect x="20" y="0" width="1" height="25" fill="black" />
                    <rect x="22" y="0" width="2" height="25" fill="black" />
                    <rect x="25" y="0" width="3" height="25" fill="black" />
                    <rect x="29" y="0" width="1" height="25" fill="black" />
                    <rect x="31" y="0" width="2" height="25" fill="black" />
                    <rect x="34" y="0" width="1" height="25" fill="black" />
                    <rect x="37" y="0" width="4" height="25" fill="black" />
                    <rect x="42" y="0" width="2" height="25" fill="black" />
                    <rect x="45" y="0" width="1" height="25" fill="black" />
                    <rect x="47" y="0" width="3" height="25" fill="black" />
                    <rect x="51" y="0" width="2" height="25" fill="black" />
                    <rect x="54" y="0" width="1" height="25" fill="black" />
                    <rect x="56" y="0" width="4" height="25" fill="black" />
                    <rect x="61" y="0" width="2" height="25" fill="black" />
                    <rect x="64" y="0" width="1" height="25" fill="black" />
                    <rect x="66" y="0" width="3" height="25" fill="black" />
                    <rect x="70" y="0" width="2" height="25" fill="black" />
                    <rect x="73" y="0" width="1" height="25" fill="black" />
                    <rect x="75" y="0" width="4" height="25" fill="black" />
                    <rect x="80" y="0" width="2" height="25" fill="black" />
                    <rect x="83" y="0" width="1" height="25" fill="black" />
                    <rect x="85" y="0" width="3" height="25" fill="black" />
                    <rect x="89" y="0" width="2" height="25" fill="black" />
                    <rect x="92" y="0" width="1" height="25" fill="black" />
                    <rect x="94" y="0" width="4" height="25" fill="black" />
                  </svg>
                  <span className="tag-code-text">*{prod.codigo}*</span>
                </div>
                <div className="tag-decorations">
                  <span className="tag-date">{new Date().toLocaleDateString("es-AR")}</span>
                  <span className="tag-regular-price-label">PRECIO REGULAR</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PrintContext.Provider>
  );
}
