import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage.jsx";
import EditComponent from "./components/EditComponent.jsx";
import SmartImport from "./components/SmartImport.jsx";
import DeleteProductoBDC from "./components/DeleteProductBDC.jsx";
import "./style/Style.css";
import { ProductProviderWrapper } from "./context/ProductContext.jsx";
import { SelectedProviderWrapper } from "./context/SelectedIds.jsx";
import VentasComponent from "./components/VentasComponent.jsx";
import BalanceWeb from "./components/BalanceWeb.jsx";
import GlobalAiChat from "./components/GlobalAiChat.jsx";
import { useEffect, useState } from "react";

function App() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("dark") === "true";
  });

  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    localStorage.setItem("dark", dark);
  }, [dark]);
  return (
    <>
      <button className="darkMode" onClick={() => setDark(!dark)}>
        {dark ? "☀️" : "🌙"}
      </button>
      <div className="app">
        <ProductProviderWrapper>
          <SelectedProviderWrapper>
            <BrowserRouter>
              <MainPage>
                <Routes>
                  <Route path="/edicion" element={<EditComponent />} />
                  <Route path="/import" element={<SmartImport />} />
                  <Route path="/destroy" element={<DeleteProductoBDC />} />
                  <Route path="/" element={<VentasComponent />} />

                  <Route path="/balance" element={<BalanceWeb />} />
                </Routes>
                <GlobalAiChat />
              </MainPage>
            </BrowserRouter>
          </SelectedProviderWrapper>
        </ProductProviderWrapper>
      </div>
    </>
  );
}

export default App;
