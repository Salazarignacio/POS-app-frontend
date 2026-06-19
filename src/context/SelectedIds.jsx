import { createContext, useState, useEffect } from "react";

const SelectedIds = createContext();

function SelectedProviderWrapper(props) {
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    console.log("SelectedIds Context: selectedProducts updated ->", selectedProducts);
  }, [selectedProducts]);

  return (
    <SelectedIds.Provider value={{ selectedProducts, setSelectedProducts }}>
      {props.children}
    </SelectedIds.Provider>
  );
}

export { SelectedIds, SelectedProviderWrapper };
