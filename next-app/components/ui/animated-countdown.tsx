"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Countdown modular animado.
 *
 * Integrado el 28/10/2026 a partir del componente que pasó Valentín. Tres
 * cambios respecto del original, ninguno cosmético:
 *
 *  1. **`motion/react` en vez de `framer-motion`.** No se instaló nada: el
 *     paquete `motion` (^13.5.0) ya era dependencia del proyecto y es el mismo
 *     framer-motion renombrado. Agregar `framer-motion` aparte habría metido
 *     una segunda copia de la misma librería en el bundle.
 *  2. **Etiquetas en castellano**, que es el idioma del sitio.
 *  3. **Se saca la variante `digital`**, que venía con acentos cyan y sombras
 *     de neón. La campaña es monocromática; un celeste no entra.
 *
 * El resto es el componente tal cual, con sus props de clase, para poder
 * vestirlo sin tocar este archivo.
 */

type CountdownUnitKey = "days" | "hours" | "minutes" | "seconds";
type CountdownVariant = "modern" | "minimal" | "classic";
type CountdownSize = "sm" | "md" | "lg";

type TimeLeft = Record<CountdownUnitKey, number>;

export type AnimatedCountdownProps = {
  targetDate?: Date | string | number;
  variant?: CountdownVariant;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  unitOrder?: CountdownUnitKey[];
  className?: string;
  containerClassName?: string;
  unitClassName?: string;
  accentClassName?: string;
  labelClassName?: string;
  numberClassName?: string;
  separator?: React.ReactNode;
  showSeparators?: boolean;
  onComplete?: () => void;
  compact?: boolean;
  size?: CountdownSize;
  ariaLabel?: string;
};

const UNIT_LABELS: Record<CountdownUnitKey, string> = {
  days: "Días",
  hours: "Horas",
  minutes: "Min",
  seconds: "Seg",
};

/* "modern" es el tratamiento liquid glass, en monocromo. Qué lo hace vidrio y
   no "rectángulo oscuro con borde":
   - el relleno es un DEGRADÉ vertical de blanco translúcido (14% → 2%), no un
     color plano: el vidrio es más claro donde lo pega la luz;
   - `backdrop-blur` desenfoca lo que haya detrás (en el banner, la textura de
     wordmarks de la marca);
   - dos reflejos internos por sombra inset — el filo superior iluminado y un
     hilo tenue abajo — más una sombra externa que lo despega del fondo;
   - un barrido especular diagonal (en CountdownUnit), que es la "refracción"
     que se ve cruzar el bloque;
   - y el hairline de luz de arriba que ya traía el componente original, pasado
     de `primary` a blanco. */
const variantClasses: Record<CountdownVariant, string> = {
  modern: "border-white/10 bg-white/[0.03] shadow-2xl shadow-black/60 backdrop-blur-xl",
  minimal: "border-transparent bg-transparent shadow-none",
  classic: "border-white/15 bg-black/40",
};

const unitVariantClasses: Record<CountdownVariant, string> = {
  modern:
    "border-white/15 bg-gradient-to-b from-white/[0.14] via-white/[0.05] to-white/[0.02] backdrop-blur-xl " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(255,255,255,0.05),0_16px_32px_-20px_rgba(0,0,0,0.95)] " +
    "transition hover:border-white/30 hover:from-white/[0.18]",
  minimal: "border-transparent bg-transparent transition hover:bg-white/[0.04]",
  classic: "border-white/12 bg-black/50 transition hover:border-white/25",
};

const sizeClasses: Record<CountdownSize, { container: string; unit: string; number: string; label: string }> = {
  sm: { container: "gap-2 p-2", unit: "min-w-[4.25rem] rounded-xl px-3 py-3", number: "text-2xl", label: "text-[10px]" },
  md: {
    container: "gap-2.5 p-2.5 sm:gap-3 sm:p-3",
    unit: "min-w-[4.8rem] rounded-2xl px-3.5 py-4 sm:min-w-[5.6rem] sm:px-4",
    number: "text-3xl sm:text-4xl",
    label: "text-[10px] sm:text-[11px]",
  },
  lg: {
    container: "gap-3 p-3 sm:gap-4 sm:p-4",
    unit: "min-w-[5.2rem] rounded-2xl px-4 py-4 sm:min-w-[6.5rem] sm:px-5 sm:py-5",
    number: "text-4xl sm:text-5xl",
    label: "text-[11px] sm:text-xs",
  },
};

function toDateTime(value: AnimatedCountdownProps["targetDate"]) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function getTimeLeft(targetDate?: AnimatedCountdownProps["targetDate"]): TimeLeft {
  const target = toDateTime(targetDate);
  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const total = Math.max(0, target - Date.now());
  const secondsTotal = Math.floor(total / 1000);
  return {
    days: Math.floor(secondsTotal / 86400),
    hours: Math.floor((secondsTotal % 86400) / 3600),
    minutes: Math.floor((secondsTotal % 3600) / 60),
    seconds: secondsTotal % 60,
  };
}

function isFinished(t: TimeLeft) {
  return t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0;
}

function format(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function CountdownNumber({ value, className }: { value: string; className?: string }) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <span className={cn("relative inline-grid min-w-[2ch] place-items-center tabular-nums", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {/* La transición con blur es del componente original: el dígito entra
            desenfocado y asienta nítido, como visto a través del vidrio. */}
        <motion.span
          key={value}
          initial={reduceMotion ? false : { y: 12, opacity: 0, filter: "blur(4px)" }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { y: -12, opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: reduceMotion ? 0.05 : 0.25, ease: "easeOut" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function CountdownUnit({
  unit, value, variant, size, unitClassName, numberClassName, labelClassName, accentClassName, index,
}: {
  unit: CountdownUnitKey;
  value: number;
  variant: CountdownVariant;
  size: CountdownSize;
  unitClassName?: string;
  numberClassName?: string;
  labelClassName?: string;
  accentClassName?: string;
  index: number;
}) {
  const reduceMotion = useReducedMotion() === true;
  const sizePreset = sizeClasses[size];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: reduceMotion ? 0 : index * 0.055, duration: 0.35, ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden border text-center",
        unitVariantClasses[variant],
        sizePreset.unit,
        unitClassName,
      )}
    >
      {variant === "modern" && (
        <>
          <span
            className={cn(
              "pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent",
              accentClassName,
            )}
          />
          {/* Barrido especular: la luz que cruza el vidrio en diagonal. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_36%,rgba(255,255,255,0.13)_47%,rgba(255,255,255,0.05)_52%,transparent_62%)]"
          />
        </>
      )}
      <CountdownNumber
        value={format(value)}
        className={cn("font-semibold leading-none tracking-[-0.04em] text-white", sizePreset.number, numberClassName)}
      />
      <span
        className={cn(
          "mt-2 font-semibold uppercase tracking-[0.18em] text-white/40",
          sizePreset.label,
          labelClassName,
        )}
      >
        {UNIT_LABELS[unit]}
      </span>
    </motion.div>
  );
}

export function AnimatedCountdown({
  targetDate,
  variant = "modern",
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
  unitOrder = ["days", "hours", "minutes", "seconds"],
  className,
  containerClassName,
  unitClassName,
  accentClassName,
  labelClassName,
  numberClassName,
  separator = ":",
  showSeparators = false,
  onComplete,
  compact = false,
  size = compact ? "sm" : "md",
  ariaLabel = "Cuenta regresiva",
}: AnimatedCountdownProps) {
  const reduceMotion = useReducedMotion() === true;
  const completedRef = React.useRef(false);
  const [timeLeft, setTimeLeft] = React.useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = React.useState(false);
  const sizePreset = sizeClasses[size];
  const completed = mounted && isFinished(timeLeft);

  const visibleUnits = React.useMemo(() => {
    const enabled = { days: showDays, hours: showHours, minutes: showMinutes, seconds: showSeconds };
    return unitOrder.filter((unit) => enabled[unit]);
  }, [showDays, showHours, showMinutes, showSeconds, unitOrder]);

  React.useEffect(() => {
    setMounted(true);
    setTimeLeft(getTimeLeft(targetDate));
    const interval = window.setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => window.clearInterval(interval);
  }, [targetDate]);

  React.useEffect(() => {
    if (!completed || completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [completed, onComplete]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full flex-col items-center rounded-[1.5rem] border",
        variantClasses[variant],
        sizePreset.container,
        compact && "rounded-2xl",
        containerClassName,
        className,
      )}
    >
      <div className={cn("grid max-w-full grid-cols-4 items-stretch gap-2", showSeparators && "sm:gap-0")}>
        {visibleUnits.map((unit, index) => (
          <React.Fragment key={unit}>
            <CountdownUnit
              unit={unit}
              value={timeLeft[unit]}
              variant={variant}
              size={size}
              unitClassName={unitClassName}
              numberClassName={numberClassName}
              labelClassName={labelClassName}
              accentClassName={accentClassName}
              index={index}
            />
            {showSeparators && index < visibleUnits.length - 1 && (
              <span className="hidden items-center px-2 text-2xl font-semibold text-white/25 sm:flex" aria-hidden>
                {separator}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}

export default AnimatedCountdown;
