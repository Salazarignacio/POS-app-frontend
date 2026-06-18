import { createContext, useState } from "react";

const SelectedIds = createContext();

function SelectedProviderWrapper(props) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  return (
    <SelectedIds.Provider value={{ selectedProducts, setSelectedProducts }}>
      {props.children}
    </SelectedIds.Provider>
  );
}

export { SelectedIds, SelectedProviderWrapper };
