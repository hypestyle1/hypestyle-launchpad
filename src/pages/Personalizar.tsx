import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { getProduct } from "@/data/products";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";

// ─── Canvas dimensions ────────────────────────────────────────────────
const S = 600; // internal canvas resolution

// ─── Arc text ─────────────────────────────────────────────────────────
// Draws text centered on an upward arc (like text on top of a circle)
// cx, cy = center of the circle; radius = arc radius
function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  letterSpacing = 0
) {
  if (!text) return;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const widths = [...text].map(ch => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((a, w) => a + w, 0) + letterSpacing * (text.length - 1);
  const totalAngle = totalWidth / radius;
  let angle = -Math.PI / 2 - totalAngle / 2;

  for (let i = 0; i < text.length; i++) {
    const w = widths[i];
    const charAngle = w / radius;
    const drawAngle = angle + charAngle / 2;

    ctx.save();
    ctx.translate(
      cx + radius * Math.cos(drawAngle),
      cy + radius * Math.sin(drawAngle)
    );
    ctx.rotate(drawAngle + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();

    angle += charAngle + letterSpacing / radius;
  }
}

// ─── Jersey renderer ──────────────────────────────────────────────────
const FONT = `"AdidasWorldCup", "Arial Black", Arial, sans-serif`;

// Carga la fuente via FontFace API para garantizar disponibilidad en canvas.
// CSS @font-face es lazy (solo carga cuando el DOM la usa); el canvas no activa
// esa carga, así que hay que forzarla manualmente antes de dibujar.
function ensureFont(): Promise<void> {
  return document.fonts.load('bold 60px "AdidasWorldCup"').then(() => {});
}


async function renderJersey(
  canvas: HTMLCanvasElement,
  view: "espalda" | "frente",
  playerName: string,
  playerNumber: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = S;
  canvas.height = S;
  ctx.clearRect(0, 0, S, S);

  // 1 — load jersey image
  const img = new Image();
  img.src =
    view === "espalda"
      ? "/products/argentina-jersey/preview-espalda.png"
      : "/products/argentina-jersey/preview-frente.png";
  await new Promise<void>((res) => {
    img.onload = () => res();
    img.onerror = () => res();
  });
  ctx.drawImage(img, 0, 0, S, S);

  // 2 — wait for Adidas font
  await ensureFont();

  // 3 — overlay text
  ctx.fillStyle = "#0a0a0a";

  if (view === "espalda") {
    if (playerName) {
      const fontSize = playerName.length > 10
        ? Math.round(S * 0.056)
        : playerName.length > 7
        ? Math.round(S * 0.066)
        : Math.round(S * 0.076);
      ctx.font = `bold ${fontSize}px ${FONT}`;
      ctx.fillStyle = "#0a0a0a";
      const spacing = Math.round(fontSize * 0.08);
      drawArcText(ctx, playerName, S / 2, S * 1.54, S * 1.20, spacing);
    }

    if (playerNumber) {
      const fontSize = playerNumber.length === 1
        ? Math.round(S * 0.33)
        : Math.round(S * 0.25);
      ctx.font = `bold ${fontSize}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(playerNumber, S * 0.5, S * 0.43);
    }
  }

  if (view === "frente") {
    if (playerNumber) {
      const fontSize = Math.round(S * 0.09);
      ctx.font = `bold ${fontSize}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(playerNumber, S * 0.50, S * 0.46);
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────
export default function Personalizar() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { add, setDrawerOpen } = useCart();
  const product = getProduct(slug || "");

  const [searchParams] = useSearchParams();
  const selectedSize = searchParams.get("talle");

  const [view, setView] = useState<"espalda" | "frente">("espalda");
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [added, setAdded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    if (canvasRef.current) {
      renderJersey(canvasRef.current, view, playerName, playerNumber);
    }
  }, [view, playerName, playerNumber]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/40">Producto no encontrado.</p>
      </div>
    );
  }

  const handleAdd = () => {
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: selectedSize,
      quantity: 1,
      ...(playerName || playerNumber
        ? { customization: { playerName, number: playerNumber } }
        : {}),
    });
    setAdded(true);
    setTimeout(() => { setDrawerOpen(true); navigate(`/producto/${slug}/`); }, 900);
  };

  const ADIDAS = `"AdidasWorldCup", "Arial Black", Arial, sans-serif`;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] min-h-screen bg-[#0a0a0a]">
        <div className="max-w-[1200px] mx-auto px-4 pt-4 pb-12">

          {/* Back link */}
          <button
            onClick={() => navigate(`/producto/${slug}/`)}
            className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-[11px] uppercase tracking-wider mb-6"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 2L4 7L9 12" />
            </svg>
            Volver al producto
          </button>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">

            {/* ── Preview canvas ── */}
            <div className="w-full lg:flex-1">
              <div className="flex gap-2 mb-5">
                {(["espalda", "frente"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-5 py-2 text-[11px] font-bold uppercase tracking-[0.15em] border transition-colors rounded-full ${
                      view === v
                        ? "bg-white text-black border-white"
                        : "text-white/50 border-white/20 hover:border-white/50 hover:text-white/80"
                    }`}
                  >
                    {v === "espalda" ? "Espalda" : "Frente"}
                  </button>
                ))}
              </div>

              {/* Canvas — se dibuja internamente a 600×600, se muestra a 100% del contenedor */}
              <div className="w-full aspect-square max-w-[540px] mx-auto lg:mx-0 rounded-[12px] overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  style={{ imageRendering: "crisp-edges" }}
                />
              </div>

              <p className="text-center text-[10px] text-white/30 uppercase tracking-[0.2em] mt-3">
                {view === "espalda"
                  ? "Vista espalda — nombre + número"
                  : "Vista frente — número en pecho"}
              </p>
            </div>

            {/* ── Panel ── */}
            <div className="w-full lg:w-[380px] flex-shrink-0">
              <div className="mb-6">
                <p className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-1">Personalización</p>
                <h1 className="text-white text-[20px] font-bold uppercase tracking-tight">{product.name}</h1>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 mb-2">
                    Nombre en dorsal
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="GARCIA"
                    value={playerName}
                    onChange={(e) => { setPlayerName(e.target.value.toUpperCase()); setView("espalda"); }}
                    className="w-full bg-white/5 border border-white/15 focus:border-white/60 text-white px-4 py-3.5 text-[17px] uppercase tracking-[0.12em] outline-none transition-colors rounded-[10px] placeholder:text-white/15"
                    style={{ fontFamily: ADIDAS }}
                  />
                  <p className="text-[10px] text-white/30 mt-1">{playerName.length}/14 caracteres</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 mb-2">Número</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="10"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white/5 border border-white/15 focus:border-white/60 text-white px-4 py-3.5 text-[32px] text-center outline-none transition-colors rounded-[10px] placeholder:text-white/15"
                    style={{ fontFamily: ADIDAS, letterSpacing: "6px" }}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 mb-6" />

              {selectedSize && (
                <p className="text-[11px] text-white/40 uppercase tracking-[0.15em] mb-6">
                  Talle seleccionado: <span className="text-white font-bold">{selectedSize}</span>
                </p>
              )}

              {(playerName || playerNumber) && (
                <div className="border border-white/10 rounded-[10px] px-4 py-3 mb-5 bg-white/5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1">Tu personalización</p>
                  <p className="text-white text-[18px] font-bold" style={{ fontFamily: ADIDAS, letterSpacing: "3px" }}>
                    {playerNumber && `#${playerNumber}`}{playerName && ` ${playerName}`}
                  </p>
                </div>
              )}

              <button
                onClick={handleAdd}
                className={`w-full py-4 text-[13px] font-bold uppercase tracking-[0.1em] transition-all rounded-[10px] ${
                  added ? "bg-green-500 text-white" : "bg-white text-black hover:bg-white/90"
                }`}
              >
                {added
                  ? "¡Agregado!"
                  : playerName || playerNumber
                  ? `Agregar — ${playerNumber ? `#${playerNumber}` : ""} ${playerName}`.trim()
                  : "Agregar al carrito"}
              </button>

              {(playerName || playerNumber) && !added && (
                <button
                  onClick={() => { setPlayerName(""); setPlayerNumber(""); }}
                  className="w-full text-center text-[11px] text-white/30 hover:text-white/60 mt-3 underline transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
