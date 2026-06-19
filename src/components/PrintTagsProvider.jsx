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
            <div className="tag-articulo">{prod.articulo}</div>
            <div className="tag-precio">${prod.precio.toLocaleString("es-AR")}</div>
          </div>
        ))}
      </div>
    </PrintContext.Provider>
  );
}
