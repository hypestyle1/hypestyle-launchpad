import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "@/context/LocaleContext";

const CVU = "0000168300000005801714";
const TITULAR = "Pozzi Valentín";
const BANCO = "LEMON CASH";

export default function PendientePago() {
  const navigate = useNavigate();
  const { formatPrice } = useLocale();
  const [order, setOrder] = useState<{
    wcOrderNumber?: string;
    orderNum: number | string;
    items: { name: string; price: number; quantity: number; size: string; image: string }[];
    total: number;
    email: string;
    nombre: string;
    apellido: string;
    direccion: string;
    ciudad: string;
    provincia: string;
    cp: string;
    telefono: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("hype_order");
    if (!raw) { navigate("/"); return; }
    setOrder(JSON.parse(raw));
  }, [navigate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(CVU).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!order) return null;

  const transferTotal = Math.round(order.total * 0.85 / 1.15); // approximate — already correct from checkout
  // Use the pre-calculated total stored; since transfer gives 15% off on subtotal
  // The total stored already accounts for shipping but not the discount if via transfer
  // Let's just show what was saved
  const displayTotal = order.total;
  const displayOrderNum = order.wcOrderNumber || order.orderNum;

  const today = new Date();
  const fecha = today.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" />
        </a>
      </div>

      {/* Top banner */}
      <div className="bg-[#1a1a1a] text-white text-center px-6 py-10">
        <p className="text-[12px] uppercase tracking-[0.2em] text-white/60 mb-3">STYLE&CULTURE</p>
        <p className="text-[15px] md:text-[17px] font-light leading-relaxed max-w-[620px] mx-auto">
          Gracias por ser parte. Estamos preparando tu pedido con el respeto que merece la cultura.
          Nos vemos cuando lo tengas puesto. Esto no es para cualquiera.
        </p>
        <p className="text-[13px] uppercase tracking-[0.3em] text-white/40 mt-5 font-semibold">STYLE&CULTURE.</p>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">

        {/* LEFT */}
        <div className="space-y-8">

          {/* Order number */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Pedido</p>
            <p className="text-[22px] font-bold">#{displayOrderNum}</p>
          </div>

          {/* En espera de pago */}
          <div className="border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">En espera de pago</p>
                <p className="text-[11px] text-muted-foreground">Realizá la transferencia para confirmar tu pedido</p>
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Instrucciones */}
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Transferí el monto exacto a los datos bancarios de abajo. Una vez confirmado el pago, te avisamos por email o Instagram.
              </p>

              {/* Datos bancarios */}
              <div className="bg-[#f8f8f6] border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Banco</p>
                  <p className="text-[13px] font-semibold">{BANCO}</p>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Titular</p>
                  <p className="text-[13px] font-semibold">{TITULAR}</p>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">CVU</p>
                    <p className="text-[13px] font-mono font-semibold tracking-wider">{CVU}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all flex-shrink-0 ${
                      copied
                        ? "border-green-600 text-green-600 bg-green-50"
                        : "border-foreground text-foreground hover:bg-foreground hover:text-white"
                    }`}
                  >
                    {copied ? "✓ Copiado" : "Copiar CVU"}
                  </button>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Monto a transferir</p>
                  <p className="text-[15px] font-bold">{formatPrice(displayTotal)}</p>
                </div>
              </div>

              {/* Cambiar medio de pago */}
              <button
                onClick={() => navigate("/checkout/")}
                className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors"
              >
                Cambiar medio de pago
              </button>
            </div>
          </div>

          {/* Seguir comprando */}
          <a
            href="/"
            className="inline-block border border-foreground text-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-foreground hover:text-white transition-colors"
          >
            Seguir comprando
          </a>
        </div>

        {/* RIGHT — Order summary */}
        <div className="lg:border-l lg:border-border lg:pl-10">
          <div className="sticky top-6 space-y-6">

            {/* Items */}
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="relative w-16 h-20 bg-[#f0f0ec] flex-shrink-0 overflow-hidden">
                    <img src={item.image ? (item.image.startsWith('http') ? item.image : `/${item.image}`) : ''} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/60 text-white text-[10px] flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">Talle: {item.size}</p>
                  </div>
                  <span className="text-[13px] font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-[16px] font-bold">
                <span>Total</span>
                <span>{formatPrice(displayTotal)}</span>
              </div>
            </div>

            {/* Cómo seguir el pedido */}
            <div className="border border-border p-4 space-y-3">
              <p className="text-[12px] font-bold uppercase tracking-wider">Cómo seguir el pedido</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Una vez confirmado el pago, te enviamos un email con el número de seguimiento de Andreani.
                También podés escribirnos por Instagram.
              </p>
              <a
                href="https://www.instagram.com/hypestylearg/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[12px] underline hover:text-foreground/70 transition-colors"
              >
                @hypestylearg →
              </a>
            </div>

            {/* Info del pedido */}
            <div className="space-y-2 text-[12px]">
              <p className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">Información del pedido</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pedido</span>
                  <span className="font-medium">#{displayOrderNum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span>{fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate ml-4 text-right">{order.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>Andreani</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino</span>
                  <span>{order.ciudad}, {order.provincia}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
