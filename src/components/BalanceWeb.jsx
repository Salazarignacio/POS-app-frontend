import { useEffect, useRef } from "react";

export default function BalanceWeb({ isDarkMode }) {
  const balanceUrl = import.meta.env.VITE_BALANCE_WEB_URL || "https://balance-five-gamma.vercel.app/";
  const iframeRef = useRef(null);

  // Sincronizar tema con postMessage para cambio en caliente sin recargar el iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "THEME_CHANGE", theme: isDarkMode ? "dark" : "light" },
        "*"
      );
    }
  }, [isDarkMode]);

  // Al cargar, pasamos el tema inicial en el query string para evitar flashes de color
  const srcUrl = `${balanceUrl}?theme=${isDarkMode ? "dark" : "light"}`;

  return (
    <div className="balance-wrapper">
      <iframe
        ref={iframeRef}
        src={srcUrl}
        title="Balance"
        className="balance-iframe"
      />
    </div>
  );
}
