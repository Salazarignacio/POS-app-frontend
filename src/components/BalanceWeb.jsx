export default function BalanceWeb() {
  const balanceUrl = import.meta.env.VITE_BALANCE_WEB_URL || "https://balance-five-gamma.vercel.app/";

  return (
    <div className="balance-wrapper">
      <iframe
        src={balanceUrl}
        title="Balance"
        className="balance-iframe"
      />
    </div>
  );
}
