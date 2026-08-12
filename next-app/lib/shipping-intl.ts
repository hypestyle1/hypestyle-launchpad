/**
 * Envío internacional — tarifario Boxfly (FedEx), vigente desde 12/08/2026.
 *
 * Reemplaza al `INTL_RATE` viejo, que era una constante en 0 y dejaba el costo
 * "a confirmar por mail dentro de las 24 h": el cliente pagaba la mercadería sin
 * saber cuánto iba a salir el envío, y alguien tenía que cotizar a mano pedido
 * por pedido. Ahora el precio se cierra en el checkout.
 *
 * Dos escalones planos, según lo pasado por Boxfly:
 *   - FedEx Pak, hasta 1,5 kg.
 *   - Caja, de 2 a 5 kg (neto o volumétrico) — mismo precio en todo el rango.
 *
 * El precio incluye flete, seguro por pérdida o daño e impuestos de exportación
 * de Argentina. NO incluye los impuestos ni los gastos aduaneros del país de
 * destino, que paga quien recibe — eso se avisa en el checkout y en el mail.
 */

export type IntlZone = 'america' | 'europa' | 'asia' | 'oceania';

/** Pesos argentinos por envío, por zona y escalón. */
export const INTL_RATES: Record<IntlZone, { pak: number; box: number }> = {
  america: { pak: 62873, box: 100336 },
  europa: { pak: 83951, box: 131486 },
  asia: { pak: 85671, box: 132983 },
  oceania: { pak: 101348, box: 158592 },
};

export const ZONE_LABEL: Record<IntlZone, string> = {
  america: 'Americas',
  europa: 'Europe',
  asia: 'Asia',
  oceania: 'Oceania',
};

const ZONE_BY_COUNTRY: Record<string, IntlZone> = {
  // América
  US: 'america', CA: 'america', MX: 'america', BR: 'america', CL: 'america',
  CO: 'america', PE: 'america', UY: 'america', PY: 'america', BO: 'america',
  EC: 'america',
  // Europa
  ES: 'europa', DE: 'europa', FR: 'europa', IT: 'europa', PT: 'europa',
  NL: 'europa', BE: 'europa', CH: 'europa', AT: 'europa', SE: 'europa',
  NO: 'europa', DK: 'europa', FI: 'europa', IE: 'europa', PL: 'europa',
  GR: 'europa', GB: 'europa',
  // Asia — Medio Oriente entra acá, que es como lo cotiza Boxfly.
  JP: 'asia', KR: 'asia', SG: 'asia', HK: 'asia', TW: 'asia', IN: 'asia',
  CN: 'asia', AE: 'asia', SA: 'asia', IL: 'asia',
  // Oceanía
  AU: 'oceania', NZ: 'oceania',
};

/**
 * Los destinos que el tarifario no cubre (Sudáfrica y "Other country") caen en
 * la zona más cara. Es deliberado: conviene cobrar de más y devolver la
 * diferencia antes que cotizar por debajo y perder plata en cada pedido. Si
 * empiezan a venderse seguido, pedirle a Boxfly la tarifa de África.
 */
const FALLBACK_ZONE: IntlZone = 'oceania';

export function zoneForCountry(countryCode: string): IntlZone {
  return ZONE_BY_COUNTRY[(countryCode ?? '').toUpperCase()] ?? FALLBACK_ZONE;
}

/**
 * Volumen que ocupa cada prenda doblada, en cm³.
 *
 * El límite real es el volumen, no el peso: en WooCommerce casi todos los
 * productos tienen 0,25 kg cargado — el mismo valor para una remera que para un
 * buzo—, así que sumar peso daría que entran 6 remeras en un Pak cuando en la
 * práctica entran 4 o 5.
 *
 * Se trabaja en cm³ y no en unidades propias para poder aplicar la fórmula de
 * peso volumétrico de Boxfly tal cual: alto × ancho × largo / 5000. Un FedEx
 * Pak lleno son 30 × 20 × 20 = 12.000 cm³, es decir los 2,4 kg volumétricos que
 * dieron como tope del Pak.
 *
 * Los valores reproducen los casos que pasaron sobre qué entra en un Pak:
 *   5 remeras               → 12.000   entra, justo
 *   1 buzo + 2 remeras      → 12.000   entra, justo
 *   1 buzo, o 1 campera     →  7.200   entra
 *   1 campera + 1 pantalón  → 12.000   entra, al límite
 *   6 remeras               → 14.400   pasa al escalón de caja
 */
/*
 * Hay dos vocabularios de categoría y la tabla tiene que entender los dos: el
 * cliente lee el nombre ya traducido por WP_CAT en products-normalize ("Tee",
 * "Top", "Jort") y el servidor lee el nombre crudo de WooCommerce ("Remera",
 * "Musculosa", "JORT"). Si solo se contemplara uno, el precio mostrado y el
 * cobrado saldrían distintos.
 */
const VOLUME_CM3_BY_CATEGORY: Record<string, number> = {
  remera: 2400,
  tee: 2400,
  musculosa: 1800,
  top: 1800,
  polo: 2600,
  hoodie: 7200,
  sweater: 6600,
  campera: 7200,
  pantalon: 4800,
  jort: 3600,
  short: 3600,
  accesorio: 1200,
  pack: 7200, // los packs del catálogo son de 3 remeras
  set: 12000, // conjunto completo: llena un Pak
};

/** Categoría desconocida: se asume una prenda de tamaño medio. */
const VOLUME_DEFAULT_CM3 = 3600;

/** Divisor de Boxfly para pasar de cm³ a kilos facturables. */
const VOLUMETRIC_DIVISOR = 5000;

/** Un FedEx Pak lleno: 30 × 20 × 20 cm = 2,4 kg volumétricos. */
const PAK_MAX_VOLUMETRIC_KG = 2.4;
/** Tope de peso real del primer escalón. */
const PAK_MAX_KG = 1.5;
/** Techo del segundo escalón, sobre el peso facturable. */
const BOX_MAX_KG = 5;

// Las categorías de Woo vienen capitalizadas y alguna con acento ("Pantalón",
// "SWEATER"). Se comparan en minúscula; la única acentuada se mapea aparte para
// no depender de normalización Unicode.
const CATEGORY_ALIASES: Record<string, string> = { 'pantalón': 'pantalon' };

function normalizeCategory(category?: string): string {
  const key = (category ?? '').toLowerCase().trim();
  return CATEGORY_ALIASES[key] ?? key;
}

export function volumeForCategory(category?: string): number {
  return VOLUME_CM3_BY_CATEGORY[normalizeCategory(category)] ?? VOLUME_DEFAULT_CM3;
}

export interface IntlShippingLine {
  category?: string;
  /** Peso real del producto en WooCommerce, si se conoce. */
  weightKg?: number;
  quantity: number;
}

export interface IntlShippingQuote {
  zone: IntlZone;
  tier: 'pak' | 'box';
  /** Cantidad de envíos: mayor a 1 solo si el pedido excede una caja de 5 kg. */
  packages: number;
  cost: number;
  label: string;
  /** Para depurar y para conciliar contra lo que termina facturando Boxfly. */
  actualKg: number;
  volumetricKg: number;
}

/** Peso asumido cuando el producto no tiene ninguno cargado en Woo. */
const DEFAULT_KG = 0.25;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteIntlShipping(
  countryCode: string,
  lines: IntlShippingLine[],
): IntlShippingQuote {
  const zone = zoneForCountry(countryCode);
  const rate = INTL_RATES[zone];

  let volumeCm3 = 0;
  let actualKg = 0;
  for (const line of lines) {
    const qty = Math.max(1, Number(line.quantity) || 1);
    volumeCm3 += volumeForCategory(line.category) * qty;
    actualKg += (Number(line.weightKg) > 0 ? Number(line.weightKg) : DEFAULT_KG) * qty;
  }

  const volumetricKg = volumeCm3 / VOLUMETRIC_DIVISOR;
  const base = { zone, actualKg: round2(actualKg), volumetricKg: round2(volumetricKg) };

  // El Pak entra en el primer escalón si la ropa entra físicamente adentro
  // (2,4 kg volumétricos) y además no supera 1,5 kg reales. El tope de 1,5 kg
  // volumétrico que mencionó Boxfly aplica a los envíos en caja, no al Pak.
  if (volumetricKg <= PAK_MAX_VOLUMETRIC_KG && actualKg <= PAK_MAX_KG) {
    return { ...base, tier: 'pak', packages: 1, cost: rate.pak, label: shippingLabel(zone, 1) };
  }

  // En caja se factura por el mayor entre peso real y volumétrico. Arriba de
  // 5 kg Boxfly no tiene tarifa publicada, así que se cobra por cajas enteras,
  // que es lo que se va a terminar despachando.
  const chargeableKg = Math.max(actualKg, volumetricKg);
  const packages = Math.max(1, Math.ceil(chargeableKg / BOX_MAX_KG));

  return {
    ...base,
    tier: 'box',
    packages,
    cost: rate.box * packages,
    label: shippingLabel(zone, packages),
  };
}

function shippingLabel(zone: IntlZone, packages: number): string {
  const base = `FedEx International — ${ZONE_LABEL[zone]}`;
  return packages > 1 ? `${base} (${packages} parcels)` : base;
}

/** Aviso de aduana: el precio de Boxfly excluye los impuestos de destino. */
export const CUSTOMS_NOTICE =
  'Import duties and customs fees at destination are not included and are paid by the recipient.';
