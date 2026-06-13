import TicketPage from "../pages/TicketPage";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function TicketComponent({ prods, setProductos }) {
  const [discount, setDiscount] = useState({ value: 0, type: 'fixed' });

  useEffect(() => {
    const handleAiDiscount = (e) => {
      const { value, type } = e.detail;
      setDiscount({ value, type });
      toast.success(`Descuento aplicado: ${type === 'percentage' ? value + '%' : '$' + value}`);
    };
    window.addEventListener('ai-apply-discount', handleAiDiscount);
    return () => window.removeEventListener('ai-apply-discount', handleAiDiscount);
  }, []);

  let subtotal = 0;
  let items = 0;
  prods.forEach((element) => {
    subtotal += element.precio * element.cantidad;
    items += element.cantidad;
  });

  const discountAmount = discount.type === 'percentage' 
    ? (subtotal * discount.value) / 100 
    : discount.value;
  
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <>
      <TicketPage 
        prods={prods} 
        total={total} 
        subtotal={subtotal}
        discount={discountAmount}
        items={items} 
        setProductos={setProductos}
      ></TicketPage>
    </>
  );
}
