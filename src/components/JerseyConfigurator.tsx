import { useState } from "react";

interface Props {
  playerName: string;
  playerNumber: string;
  onNameChange: (v: string) => void;
  onNumberChange: (v: string) => void;
  onClear: () => void;
}

const FONT = "'AdidasWorldCup', 'Arial Black', sans-serif";

export default function JerseyConfigurator({ playerName, playerNumber, onNameChange, onNumberChange, onClear }: Props) {
  const [view, setView] = useState<"frente" | "espalda">("espalda");

  return (
    <div className="mb-5 border border-border rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#f8f8f6] px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Personalizá tu dorsal</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Se ve en tiempo real sobre la camiseta</p>
        </div>
        {/* Toggle frente / espalda */}
        <div className="flex border border-border rounded-[8px] overflow-hidden text-[11px] font-semibold uppercase tracking-wider">
          <button
            onClick={() => setView("frente")}
            className={`px-3 py-1.5 transition-colors ${view === "frente" ? "bg-foreground text-background" : "hover:bg-bg-alt"}`}
          >
            Frente
          </button>
          <button
            onClick={() => setView("espalda")}
            className={`px-3 py-1.5 transition-colors ${view === "espalda" ? "bg-foreground text-background" : "hover:bg-bg-alt"}`}
          >
            Espalda
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col md:flex-row gap-5 items-start">

        {/* Preview */}
        <div className="w-full md:w-[340px] flex-shrink-0">
          <div className="relative w-full aspect-square select-none">
            {/* Jersey base */}
            <img
              src={view === "frente"
                ? "/products/argentina-jersey/preview-frente.png"
                : "/products/argentina-jersey/preview-espalda.png"}
              alt={view}
              className="w-full h-full object-contain transition-opacity duration-200"
              draggable={false}
            />

            {/* ── ESPALDA overlay ── */}
            {view === "espalda" && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Nombre — zona superior de la espalda */}
                {playerName && (
                  <div
                    className="absolute w-full flex justify-center"
                    style={{ top: "19%", left: 0 }}
                  >
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: "clamp(18px, 6.5vw, 42px)",
                        color: "#111",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        lineHeight: 1,
                        textShadow: "none",
                      }}
                    >
                      {playerName}
                    </span>
                  </div>
                )}

                {/* Número — centro espalda */}
                {playerNumber && (
                  <div
                    className="absolute w-full flex justify-center"
                    style={{ top: "33%", left: 0 }}
                  >
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: "clamp(60px, 22vw, 150px)",
                        color: "#111",
                        lineHeight: 1,
                        letterSpacing: "-2px",
                      }}
                    >
                      {playerNumber}
                    </span>
                  </div>
                )}

                {/* Placeholder */}
                {!playerName && !playerNumber && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="text-foreground/20 text-[11px] uppercase tracking-widest">Ingresá nombre y número</span>
                  </div>
                )}
              </div>
            )}

            {/* ── FRENTE overlay ── */}
            {view === "frente" && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Número en el pecho — zona central superior */}
                {playerNumber && (
                  <div
                    className="absolute w-full flex justify-center"
                    style={{ top: "34%", left: 0 }}
                  >
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: "clamp(28px, 10vw, 64px)",
                        color: "#1a2d6e",
                        lineHeight: 1,
                        letterSpacing: "-1px",
                      }}
                    >
                      {playerNumber}
                    </span>
                  </div>
                )}

                {!playerNumber && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: "30%" }}>
                    <span className="text-foreground/20 text-[11px] uppercase tracking-widest">Vista frontal</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hint debajo del preview */}
          <p className="text-center text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider">
            {view === "frente" ? "Vista frontal — número en pecho" : "Vista espalda — nombre + número"}
          </p>
        </div>

        {/* Inputs */}
        <div className="flex-1 flex flex-col gap-4 justify-center w-full">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2">
              Nombre en dorsal
            </label>
            <input
              type="text"
              maxLength={14}
              placeholder="Ej: GARCIA"
              value={playerName}
              onChange={(e) => onNameChange(e.target.value.toUpperCase())}
              className="w-full border border-border px-4 py-3 text-[15px] uppercase tracking-widest outline-none focus:border-foreground transition-colors rounded-[8px] bg-white placeholder:text-foreground/20 placeholder:tracking-wider placeholder:text-[13px]"
              style={{ fontFamily: FONT }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{playerName.length}/14 caracteres</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2">
              Número
            </label>
            <input
              type="text"
              maxLength={2}
              placeholder="10"
              value={playerNumber}
              onChange={(e) => onNumberChange(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-border px-4 py-3 text-[24px] outline-none focus:border-foreground transition-colors rounded-[8px] bg-white placeholder:text-foreground/20 text-center"
              style={{ fontFamily: FONT, letterSpacing: "4px" }}
            />
          </div>

          {(playerName || playerNumber) && (
            <button
              onClick={onClear}
              className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors text-left"
            >
              Limpiar personalización
            </button>
          )}

          {/* Resumen */}
          {(playerName || playerNumber) && (
            <div className="border border-border rounded-[8px] px-4 py-3 bg-[#f8f8f6]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tu personalización</p>
              <p
                className="text-[16px] font-bold text-foreground"
                style={{ fontFamily: FONT, letterSpacing: "2px" }}
              >
                {playerNumber && `#${playerNumber}`}{playerName && ` ${playerName}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
