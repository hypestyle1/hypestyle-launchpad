'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { textoFirst10, type First10Info } from '@/lib/first10';
import { descuentoCupon, lineasExcluidasDelCupon, faltaElegibilidad, type ElegibilidadLinea } from '@/lib/cupon-lineas';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { isFlashSaleActive } from '@/lib/flash-sale';
import { compute3x2Discount, unitsToNext3x2 } from '@/lib/promo-3x2';
import { usePromo3x2Status } from '@/hooks/usePromo3x2Status';
import { computeChampionDiscount } from '@/lib/promo-champion';
import { computePackRegularDiscount, packRegularEtiqueta, packRegularFaltan, packRegularSiguienteGratis, precioPackRegular } from '@/lib/promo-pack-regular';
import { usePackRegularUnidades } from '@/hooks/usePackRegularUnidades';
import { usePromoChampionStatus } from '@/hooks/usePromoChampionStatus';
import { useLocale } from '@/context/LocaleContext';
import { localeForCountry } from '@/lib/geo';
import { chargeCurrency } from '@/lib/currency';
import { createOrderAndPreference, CreateOrderError } from '@/lib/wc-client';
import { saveCartSnapshot, readCartSnapshot } from '@/lib/cart-recovery';
import { getFbCookies } from '@/lib/fbtracking';
import { getClarityCookies, tagClarityOrder } from '@/lib/clarity-tracking';
import { captureAttribution } from '@/lib/attribution';
import { gaBeginCheckout, gaViewShippingOptions, gaAddShippingInfo, gaAddPaymentInfo, gaIrAPagar, type ShippingTier, type GaItem } from '@/lib/ga';
import { fbInitiateCheckout, fbAddPaymentInfo } from '@/lib/fbpixel';
import { imgSrc } from '@/lib/img';
import { normalizeCpAr } from '@/lib/postal-code';
import { localidadPorCp } from '@/lib/cp-localidad';
import { useProducts } from '@/hooks/useProducts';
import PriceChangeNotice from '@/components/PriceChangeNotice';
import { quoteIntlShipping, CUSTOMS_NOTICE } from '@/lib/shipping-intl';
import { FREE_SHIPPING_THRESHOLD, ahorroSucursal, alcanzaUmbral, costoEnvio, incluyeEnvioGratis, modoDeTarifa, ordenarTarifas, tarifaPorDefecto } from '@/lib/envio';
import { isGiftCardItem } from '@/lib/gift-card';
import GiftProgressBar from '@/components/GiftProgressBar';
import { Stepper } from '@/components/ui/stepper';
import { ScrambleText } from '@/components/ui/scramble-text';
import { DynamicButton } from '@/components/ui/dynamic-button';
import { ScrollFadeList } from '@/components/ui/scroll-fade-list';
import { ReceiptPrinter } from '@/components/ReceiptPrinter';
import { Button } from '@/components/ui/button';
import { FloatingInput, FloatingSelect } from '@/components/ui/floating-field';
import { Check } from '@/components/ui/check';
import { validarInfo, sugerirEmail, camposVisibles, type CampoInfo, type DatosInfo } from '@/lib/checkout-validacion';
import { leerDatos, guardarDatos, borrarDatos } from '@/lib/checkout-recordar';
import { MedioDePago, type MetodoPago } from '@/components/checkout/MedioDePago';
import { PagoSeguroBadge, NotaPagoSeguro, FranjaConfianza } from '@/components/checkout/Confianza';
import { PagoSeguroCard } from '@/components/checkout/PagoSeguro';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronDown, ChevronLeft, CreditCard, Gift, Home, Info, Lock, Mail, MapPin, Plane, ShoppingBag, Store, Tag, Truck, User } from 'lucide-react';
import { CloseFriendsCard, instagramValido } from '@/components/checkout/CloseFriendsCard';
import { Panel, Recap, RadioCard, BarraEnvioGratis } from '@/components/checkout/Panel';
import { useSyncExternalStore } from 'react';

type Step = 'info' | 'pago';
type OrdenCreada = Awaited<ReturnType<typeof createOrderAndPreference>>;

// En desktop el resumen es la columna de la derecha; en mobile pasa a ser una
// barra colapsable arriba del formulario (antes quedaba debajo del botón de
// pagar y el cliente confirmaba sin ver qué ni cuánto). El servidor siempre
// renderiza la vista de carrito vacío, así que no hay riesgo de desajuste.
const DESKTOP_MQ = '(min-width: 1024px)';
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP_MQ);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(DESKTOP_MQ).matches,
    () => true,
  );
}

/** "CABA, CABA" → "CABA": ciudad y provincia suelen coincidir. */
function lugar(ciudad: string, provincia: string) {
  const c = ciudad.trim();
  const p = provincia.trim();
  return !p || c.toLowerCase() === p.toLowerCase() ? c : `${c}, ${p}`;
}

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: '', name: '──────────────' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: '', name: '──────────────' },
  { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PL', name: 'Poland' },
  { code: 'GR', name: 'Greece' },
  { code: '', name: '──────────────' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'EC', name: 'Ecuador' },
  { code: '', name: '──────────────' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: '', name: '──────────────' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Other country' },
];

// Países donde el estado/provincia es parte obligatoria de la dirección: sin
// eso el correo no emite la etiqueta y el pedido se traba después de cobrado.
const STATE_REQUIRED = ['US', 'CA', 'AU'];

interface ShippingRate { id: string; label: string; cost: number }
interface AndBranch { id: string; label: string; direccion: string; calle?: string; localidad?: string }
interface InfoForm {
  email: string; newsletter: boolean; nombre: string; apellido: string; dni: string;
  direccion: string; depto: string; cp: string; ciudad: string; provincia: string; pais: string; telefono: string;
}
interface PagoForm { metodo: string; instagram: string }

export default function Checkout() {
  const { items, total, clear, restore, hydrated, priceChanges } = useCart();
  // El regalo por compra nunca es un producto pago: no debe contarse para 3x2,
  // CAMPEON50, ni mandarse al backend como línea comercial — el servidor lo
  // recalcula y agrega por su cuenta (HPG_Gift_Engine).
  const purchasableItems = items.filter(item => !item.isGift);
  // Gift cards: digitales. Si el carrito es sólo gift cards no hay envío ni
  // dirección, y sobre su monto no aplican 3x2 ni el 10% de transferencia
  // (sería comprar crédito con descuento). El PHP valida lo mismo.
  const giftItems = purchasableItems.filter(isGiftCardItem);
  const fisicos = purchasableItems.filter(item => !isGiftCardItem(item));
  const soloGift = purchasableItems.length > 0 && fisicos.length === 0;
  const subtotalGift = giftItems.reduce((s, i) => s + i.price * i.quantity, 0);
  // Las líneas sobre las que puede caer un cupón. El id es el SLUG (lo único
  // que conoce el carrito); /validate-coupon lo resuelve a id de Woo y contesta
  // qué línea es elegible — ver lib/cupon-lineas.
  const lineasCupon = purchasableItems.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity }));
  const router = useRouter();
  const { formatPrice, formatPriceIn, currency, setCurrency, currencyChosen, country } = useLocale();
  const [step, setStep] = useState<Step>('info');
  const isDesktop = useIsDesktop();
  const primerPaso = useRef(true);
  useEffect(() => {
    if (primerPaso.current) { primerPaso.current = false; return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [pagoSinMetodo, setPagoSinMetodo] = useState(false);
  // Qué le falta al envío cuando intentan continuar (tarifa o sucursal):
  // el aviso aparece recién al tocar el botón, no de entrada.
  const [envioAviso, setEnvioAviso] = useState<string | null>(null);
  // La dirección detectó un CP distinto del que la persona TIPEÓ: no se pisa
  // nada, se ofrece ("Para esa dirección el CP es X · Usar").
  const [cpSugerido, setCpSugerido] = useState<{ cp: string; barrio: string } | null>(null);
  // El total de Woo vino distinto del que el cliente estuvo viendo (un precio
  // cambió entre armar el carrito y confirmar): la orden queda en espera y no
  // se cobra nada hasta que acepte el monto nuevo.
  const [totalAjustado, setTotalAjustado] = useState<number | null>(null);
  // Cuando el total sube porque Woo tiró el cupón, hay que decir ESO y no
  // "cambió un precio": es lo que pasó con el pedido #4092 (26/10/2026) y la
  // clienta se enteró del total real recién en el mail de transferencia.
  const [cuponCaido, setCuponCaido] = useState<{ code: string; reason: string } | null>(null);
  const ordenPendiente = useRef<OrdenCreada | null>(null);
  // País y provincia casi nunca se cambian: viven colapsados como texto con
  // "Cambiar" y el select aparece recién si hace falta. Menos pantalla ocupada.
  const [paisExpandido, setPaisExpandido] = useState(false);
  const [provinciaExpandida, setProvinciaExpandida] = useState(false);
  // Campos por los que ya pasó la persona: el error se muestra recién al salir
  // del campo (o al intentar continuar), no mientras escribe por primera vez.
  const [tocados, setTocados] = useState<Partial<Record<CampoInfo, boolean>>>({});
  /** Rechazos por campo que vinieron del servidor (422), con el valor que los causó. */
  const [erroresServidor, setErroresServidor] = useState<Partial<Record<CampoInfo, string>>>({});
  const valoresRechazados = useRef<Partial<Record<CampoInfo, string>>>({});
  const [precargado, setPrecargado] = useState(false);
  const [cuponAbierto, setCuponAbierto] = useState(false);
  // Lo que hay escrito en Close Friends aunque no hayan tocado "Sumarme".
  const igBorrador = useRef('');
  const [coupon, setCoupon] = useState('');
  // `items`: la elegibilidad por línea que devuelve /validate-coupon (el backend
  // resuelve el slug a id de Woo y dice qué línea cobra el descuento). Sin ella
  // —backend viejo o cupón de carrito— el cálculo cae al % sobre todo el subtotal.
  const [couponData, setCouponData] = useState<{ code: string; type: string; amount: number; description?: string; free_shipping?: boolean; first10?: First10Info; items?: ElegibilidadLinea[] | null } | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoForm>({
    email: '', newsletter: false, nombre: '', apellido: '', dni: '',
    direccion: '', depto: '', cp: '', ciudad: '', provincia: 'Buenos Aires', pais: 'AR', telefono: '',
  });
  const [pago, setPago] = useState<PagoForm>({ metodo: '', instagram: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<'failed' | 'generic' | null>(null);
  const restoreChecked = useRef(false);
  const countryTouched = useRef(false);
  // Autocompletado por CP: qué dejó puesto el último autofill y si la persona
  // eligió provincia a mano (en ese caso el select no se pisa nunca).
  const provinciaTocada = useRef(false);
  const autofillCp = useRef({ cp: '', ciudad: '', provincia: '' });

  const [flashActive, setFlashActive] = useState(false);
  const { promoActive: promo3x2Won } = usePromo3x2Status();
  const { promoActive: championWon } = usePromoChampionStatus();
  // Tamaño del pack libre según la hora del servidor (3 de siempre, 4 en la
  // ventana del evento HYPE 72). Nunca se mira el reloj del navegador.
  const unidadesPack = usePackRegularUnidades();

  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [branches, setBranches] = useState<AndBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<AndBranch | null>(null);
  // Estado de la búsqueda de sucursales. 'error' y 'vacio' son cosas distintas:
  // un fallo del servicio no significa que el CP no tenga sucursales.
  const [sucursalesEstado, setSucursalesEstado] = useState<'idle' | 'cargando' | 'ok' | 'vacio' | 'error'>('idle');
  const loadingBranches = sucursalesEstado === 'cargando';

  const isInternational = info.pais !== 'AR';
  // El sitio muestra precios en ocho monedas pero cobra en dos: pesos si el
  // envío es a Argentina, dólares si es afuera (PayPal y wire). Cuando la
  // persona mira los precios en otra moneda, el resumen lo aclara.
  const cobro = chargeCurrency(info.pais, pago.metodo);
  const cobroDistinto = currency !== cobro;

  // Envío internacional: el precio se cierra acá, con el tarifario de Boxfly.
  // La categoría y el peso salen del catálogo ya cargado, y el servidor rehace
  // exactamente esta misma cuenta al crear la orden (create-order-intl), así que
  // lo que se muestra y lo que se cobra no pueden separarse.
  const { data: catalog = [] } = useProducts(0);
  const intlQuote = useMemo(() => {
    if (!isInternational || purchasableItems.length === 0) return null;
    const bySlug = new Map(catalog.map(p => [p.slug, p]));
    return quoteIntlShipping(
      info.pais,
      purchasableItems.map(item => {
        const p = bySlug.get(item.id);
        return { category: p?.category, weightKg: p?.weight, quantity: item.quantity };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInternational, info.pais, catalog, JSON.stringify(purchasableItems.map(i => [i.id, i.quantity]))]);
  const stateRequired = STATE_REQUIRED.includes(info.pais);
  const isSucursal = !isInternational && (selectedRate?.label?.toLowerCase().includes('sucursal') || selectedRate?.id?.toLowerCase().includes('sucursal'));
  // El cartel de abajo promete "podés igualmente continuar y te contactamos para
  // coordinar", pero exigir sucursal elegida dejaba el botón deshabilitado y el
  // pedido moría ahí (caso real: CP sin sucursales en la respuesta de Andreani).
  // Si no hay ninguna sucursal para elegir, no se le puede pedir al cliente que elija.
  // Solo una búsqueda que terminó bien y vino vacía habilita el camino "a
  // coordinar"; un error del servicio pide reintentar (o elegir domicilio).
  const sinSucursales = sucursalesEstado === 'vacio';
  const branchReady = isInternational || !isSucursal || !!selectedBranch || sinSucursales;
  // El pedido viaja con el CP de 4 dígitos: es el que sabe leer el plugin de
  // Andreani para generar la guía. El ZIP internacional se deja tal cual.
  const cpEnvio = isInternational ? info.cp : normalizeCpAr(info.cp);

  const tierEnvio = (): ShippingTier => (soloGift ? 'gift' : isInternational ? 'internacional' : isSucursal ? 'sucursal' : 'domicilio');
  const gaItems = (): GaItem[] => items.map(i => ({ item_id: i.id, item_name: i.name, item_variant: i.size, price: i.price, quantity: i.quantity }));

  const optsValidacion = { soloGift, internacional: isInternational, provinciaObligatoria: stateRequired, retiraEnSucursal: isSucursal };
  const errores = validarInfo(info as unknown as DatosInfo, optsValidacion);
  const sugerenciaEmail = sugerirEmail(info.email);
  /** Props de error para cada FloatingInput del primer paso. */
  const campo = (c: CampoInfo) => ({
    // `errores` se deriva de `info`, así que no hay dónde poner un rechazo del
    // servidor sobre algo que el validador del navegador considera válido. El
    // del servidor va aparte y es el respaldo: manda el derivado. Se muestra
    // solo mientras el campo siga teniendo el valor que fue rechazado, así se
    // apaga en cuanto la persona lo edita, sin tocar los onChange de cada input.
    error: tocados[c]
      ? errores[c] ?? (erroresServidor[c] && valoresRechazados.current[c] === info[c] ? erroresServidor[c] : null)
      : null,
    onBlur: () => setTocados(t => (t[c] ? t : { ...t, [c]: true })),
  });

  // Datos de la compra anterior. Solo si el formulario está vacío, y una vez.
  const datosLeidos = useRef(false);
  useEffect(() => {
    if (!hydrated || datosLeidos.current) return;
    datosLeidos.current = true;
    const d = leerDatos();
    if (!d) return;
    const { instagram, ...dir } = d;
    // Corre una sola vez, al hidratar: el formulario todavía es el inicial,
    // salvo que la persona ya haya empezado a escribir.
    if (info.email || info.nombre || info.direccion) return;
    setInfo(prev => ({ ...prev, ...dir, provincia: dir.provincia || (dir.pais === 'AR' ? 'Buenos Aires' : '') }));
    setPrecargado(true);
    if (instagram) setPago(p => (p.instagram ? p : { ...p, instagram }));
    // El país guardado manda sobre el de la geo, igual que si lo hubiera elegido.
    countryTouched.current = true;
    // La provincia recordada vale como elección propia: el CP no la pisa.
    if (dir.provincia) provinciaTocada.current = true;
    if (dir.pais && dir.pais !== 'AR' && !currencyChosen) setCurrency(localeForCountry(dir.pais)?.currency ?? 'ARS', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const olvidarDatos = () => {
    borrarDatos();
    setPrecargado(false);
    setTocados({});
    provinciaTocada.current = false;
    autofillCp.current = { cp: '', ciudad: '', provincia: '' };
    setInfo({
      email: '', newsletter: false, nombre: '', apellido: '', dni: '',
      direccion: '', depto: '', cp: '', ciudad: '', provincia: 'Buenos Aires', pais: 'AR', telefono: '',
    });
    setPago(p => ({ ...p, instagram: '' }));
  };

  useEffect(() => { setFlashActive(isFlashSaleActive() || promo3x2Won || championWon); }, [promo3x2Won, championWon]);

  // El destino arrancaba siempre en Argentina, así que el comprador de afuera
  // caía en el formulario doméstico —  DNI obligatorio, provincia argentina y
  // todo en español— hasta que encontraba el selector de país, que está dentro
  // del bloque de dirección. Se preselecciona el país detectado. Solo mientras
  // no lo haya tocado a mano: a partir de ahí manda la persona.
  useEffect(() => {
    // Argentina ya es el default y su provincia viene precargada: no hay nada
    // que cambiar (y pisarla dejaría el select de provincia en blanco).
    if (!country || country === 'AR' || countryTouched.current) return;
    const known = COUNTRIES.some(c => c.code === country);
    setInfo(prev => (prev.pais === 'AR'
      ? { ...prev, pais: known ? country : 'OTHER', provincia: '' }
      : prev));
    // El resumen pasa a la moneda del destino, igual que cuando se cambia el
    // país a mano (handleCountryChange). Fuera del checkout el sitio queda en
    // pesos para todos; acá la moneda es contexto del pedido y no se persiste.
    if (info.pais === 'AR' && !currencyChosen) setCurrency(localeForCountry(country)?.currency ?? 'ARS', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // La moneda que el checkout toma prestada del país de envío (ver
  // handleCountryChange) se devuelve al salir: fuera del checkout el sitio
  // vuelve a pesos, salvo que la persona haya elegido moneda a mano.
  const currencyChosenRef = useRef(currencyChosen);
  currencyChosenRef.current = currencyChosen;
  useEffect(() => () => {
    if (currencyChosenRef.current) return;
    setCurrency('ARS', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vuelta de un pago que no se concretó. Los tres gateways (MercadoPago, PayPal,
  // GOcuotas) devuelven acá cuando el pago se rechaza o se cancela, y para ese
  // entonces el carrito ya estaba vacío: el cliente veía "Tu carrito está vacío"
  // justo después del rechazo y tenía que rearmar toda la compra. Restauramos la
  // copia que se guardó antes de redirigir. Ver lib/cart-recovery.ts.
  useEffect(() => {
    if (!hydrated || restoreChecked.current) return;
    restoreChecked.current = true;
    if (items.length > 0) return; // el carrito sobrevivió, no tocar nada
    const saved = readCartSnapshot();
    if (!saved) return;
    restore(saved);
    // Los parámetros de vuelta no son confiables en todos los gateways (MP no
    // siempre los manda en failure, y el botón "atrás" del navegador no manda
    // ninguno), así que solo sirven para elegir el mensaje — nunca para decidir
    // si restaurar o no.
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('collection_status') || params.get('status');
    const failed = params.get('gocuotas') === 'failed' || (!!mpStatus && mpStatus !== 'approved');
    setRecovered(failed ? 'failed' : 'generic');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const subtotal = total;
  // El cupón de envío gratis cubre cualquier modo de entrega; el umbral, solo sucursal.
  const couponFreeShip = !isInternational && !!couponData?.free_shipping;
  // El umbral de envío gratis se mide sobre lo físico: una gift card no viaja.
  const envioCtx = {
    subtotalFisico: subtotal - subtotalGift,
    cuponEnvioGratis: couponFreeShip,
    internacional: isInternational,
    // El regalo por compra no se paga: no trae el envío incluido aunque sea uno de esos productos.
    productoConEnvioGratis: incluyeEnvioGratis(items.filter((i) => !i.isGift).map((i) => i.id)),
  };
  const sobreUmbral = alcanzaUmbral(envioCtx);
  const costoDe = (rate: ShippingRate) => costoEnvio(rate, shippingRates, envioCtx);
  const envioCosto = soloGift || !selectedRate ? 0 : costoDe(selectedRate);
  const freeShipping = soloGift || (!isInternational && envioCosto === 0 && (sobreUmbral || couponFreeShip));
  const ahorroEnSucursal = ahorroSucursal(shippingRates);
  // Si el cotizador falla y el carrito ya tenía el envío bonificado, el pedido
  // sigue sin tarifa elegida en vez de morir en este paso.
  const shippingReady = soloGift ? true : isInternational ? !!selectedRate : sobreUmbral || couponFreeShip || !!selectedRate;
  // Un cupón de monto fijo (o una gift card) nunca descuenta más que el subtotal:
  // sin este tope una gift card de $250k sobre un carrito de $80k daba negativo.
  // FIRST10 pide $100.000 en productos: si el carrito baja del mínimo con el
  // código ya puesto, se saca acá y se avisa (Woo lo rechazaría al confirmar).
  useEffect(() => {
    if (!couponData?.first10) return;
    if (subtotal >= couponData.first10.min) return;
    setCouponData(null);
    setCouponError(`FIRST10 necesita $${couponData.first10.min.toLocaleString('es-AR')} en productos. Sumá algo y volvé a aplicarlo.`);
  }, [subtotal, couponData]);
  // Validar un código contra Woo (vía el PHP). El mail viaja porque hay cupones
  // personales (email_restrictions) y con tope por persona: sin él se aprueban
  // códigos que Woo rechaza al crear el pedido, y el total del resumen termina
  // no siendo el del pedido.
  const validarCupon = async (codigo: string, email: string) => {
    const res = await fetch('/api/validate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Los ítems van para que el PHP resuelva los ids y conteste qué líneas son
      // elegibles: HYPE10 excluye 12 productos y Woo descuenta SOLO el resto.
      body: JSON.stringify({ code: codigo, total: subtotal, email, items: lineasCupon.map((l) => ({ id: l.id, quantity: l.quantity })) }),
    });
    return await res.json() as { valid: boolean; code?: string; type?: string; amount?: number; free_shipping?: boolean; gift_card?: boolean; first10?: First10Info; items?: ElegibilidadLinea[] | null; error?: string };
  };

  // Un cupón personal se valida contra el mail, así que si lo cambian DESPUÉS de
  // aplicarlo hay que volver a preguntar (Woo lo valida contra el mail de
  // facturación al crear el pedido). Con debounce para no pegarle por tecla.
  // Y también si cambia el carrito: la elegibilidad es por línea, así que
  // agregar o sacar un producto cambia el descuento. La clave junta las dos
  // cosas (mail y carrito) para no pegarle por tecla ni por render.
  const cuponValidadoPara = useRef('');
  const firmaCarrito = lineasCupon.map((l) => l.id + 'x' + l.quantity).join(',');
  useEffect(() => {
    const code = couponData?.code;
    if (!code) { cuponValidadoPara.current = ''; return; }
    const clave = code + '|' + info.email.trim().toLowerCase() + '|' + firmaCarrito;
    if (cuponValidadoPara.current === clave) return;
    let vigente = true;
    const t = setTimeout(async () => {
      try {
        const data = await validarCupon(code, info.email);
        if (!vigente) return;
        cuponValidadoPara.current = clave;
        if (!data?.valid) {
          setCouponData(null);
          setCouponError(data?.error || 'El código ya no es válido');
          return;
        }
        // Elegibilidad fresca para el carrito de AHORA: sin esto el resumen
        // seguiría descontando con el mapa del carrito anterior.
        setCouponData((prev) => (prev && prev.code === code ? { ...prev, items: data.items ?? null } : prev));
      } catch { /* si falla la red, lo valida Woo al confirmar */ }
    }, 700);
    return () => { vigente = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponData?.code, info.email, firmaCarrito]);

  // El descuento del cupón sale de lib/cupon-lineas: la misma cuenta que hace
  // Woo al crear el pedido (floor por línea, solo las elegibles). Antes era
  // `subtotal × %` sobre todo el carrito y prometía plata que el pedido no iba
  // a descontar — HYPE10 excluye 12 productos.
  const cuponDescuento = descuentoCupon(lineasCupon, couponData);
  const lineasSinCupon = lineasExcluidasDelCupon(lineasCupon, couponData);
  const cuponRevalidando = faltaElegibilidad(lineasCupon, couponData);
  // 50% off "campeones del mundo" tiene prioridad sobre el 3x2 — no deberían solaparse
  // (si por algún motivo ambos estados dieran 'won' a la vez, no se suman).
  const championActive = championWon && !isInternational;
  const championDescuento = championActive ? computeChampionDiscount(fisicos) : 0;
  // 3x2 (más barata gratis) solo si Argentina ganó — promo local, no aplica a envíos internacionales.
  const promo3x2Active = promo3x2Won && !isInternational && !championActive;
  const promo3x2Descuento = promo3x2Active ? compute3x2Discount(fisicos) : 0;
  const promo3x2UnidadesFaltan = promo3x2Active ? unitsToNext3x2(fisicos) : 0;
  // Pack libre de Regular Tees: 3 individuales de cualquier color = precio del
  // 3-PACK (4 durante la ventana del evento). No se suma a las promos de arriba
  // (misma regla que el servidor).
  const packRegularActive = !isInternational && !championActive && !promo3x2Active;
  const packRegularDescuento = packRegularActive ? computePackRegularDiscount(fisicos, precioPackRegular(catalog), unidadesPack) : 0;
  const packRegularFaltanN = packRegularActive ? packRegularFaltan(fisicos, unidadesPack) : 0;
  // En la ventana, con el pack de 3 ya descontado, la cuarta entra gratis. No es
  // lo mismo que `faltan`: ahí no falta nada para el descuento, lo que hay es
  // una unidad más sin costo.
  const packRegularCuartaGratis = packRegularActive
    && packRegularSiguienteGratis(fisicos, precioPackRegular(catalog), unidadesPack);
  const descuento = cuponDescuento + promo3x2Descuento + championDescuento + packRegularDescuento;
  // El envío entra al total apenas hay tarifa — desde el paso 1, donde la
  // cotiza el CP (sucursal preseleccionada). El costo sorpresa al final es la
  // causa #1 de abandono; sin tarifa todavía, envioCosto es 0 y la línea de
  // envío del resumen lo aclara.
  const totalFinal = subtotal - descuento + envioCosto;
  const totalMostrado = totalFinal;
  // El 10% de transferencia va sobre lo físico; la gift card se paga entera.
  // Y va después del pack libre, igual que en el servidor.
  const transferTotal = Math.round((subtotal - subtotalGift - packRegularDescuento) * 0.90) + subtotalGift - (descuento - packRegularDescuento) + envioCosto;

  // InitiateCheckout / begin_checkout: al ENTRAR al checkout con carrito, no en el
  // paso 2. Estaba enganchado a la transición envío → pago, que es el tercer paso
  // del formulario: todo el que abandonaba en datos o al calcular el envío quedaba
  // fuera del embudo, y esos son justamente los que hay que poder retargetear.
  // Es además lo que el evento significa para Meta y para GA4 — "entró al checkout",
  // no "llegó al final del formulario". Los dos se mueven juntos para que sigan
  // siendo comparables entre sí.
  //
  // Una sola vez por visita al checkout: la vuelta de un pago rechazado remonta la
  // página y vuelve a contar, que es correcto (es un intento nuevo).
  const checkoutStartSent = useRef(false);
  useEffect(() => {
    if (!hydrated || checkoutStartSent.current || items.length === 0) return;
    checkoutStartSent.current = true;
    // El total todavía no incluye envío (no hay tarifa elegida) — sí cupones y
    // promos, que ya están aplicados.
    fbInitiateCheckout(
      items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      totalFinal,
    );
    gaBeginCheckout(
      items.map(i => ({
        item_id: i.id,
        item_name: i.name,
        item_variant: i.size,
        price: i.price,
        quantity: i.quantity,
      })),
      totalFinal,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, items.length]);

  const handleCountryChange = (pais: string) => {
    countryTouched.current = true;
    // Cambió el destino: el autocompletado por CP y la cotización arrancan de cero.
    provinciaTocada.current = false;
    autofillCp.current = { cp: '', ciudad: '', provincia: '' };
    cotizado.current = '';
    setCpSugerido(null);
    if (pais === 'AR') setPaisExpandido(false); // vuelve a Argentina: fila compacta otra vez
    const provincia = pais === 'AR' ? 'Buenos Aires' : '';
    setInfo(prev => ({ ...prev, pais, provincia }));
    // La moneda de la vitrina es pesos salvo elección explícita. Si la
    // persona nunca eligió moneda a mano y cambia el país de envío, el resumen
    // pasa a la moneda de ese destino (ES → EUR, US → USD, AR → ARS): antes un
    // pedido a España desde una IP argentina se veía en pesos hasta el final.
    // No se persiste: es contexto del pedido, no una elección de la persona.
    if (!currencyChosen) setCurrency(localeForCountry(pais)?.currency ?? 'ARS', false);
    setSelectedRate(null);
    setShippingRates([]);
    setRatesError(null);
    setBranches([]);
    setSelectedBranch(null);
    setPago(prev => ({ ...prev, metodo: '' }));
  };

  // Autocompletar ciudad y provincia a partir del CP (solo Argentina). Los dos
  // campos siguen a la vista y editables, y lo escrito a mano nunca se pisa:
  // ciudad solo si está vacía o quedó de un autocompletado anterior; provincia
  // solo mientras no hayan elegido una en el select.
  const handleCpChange = (cp: string) => {
    setCpSugerido(null); // está escribiendo el CP: la sugerencia vieja no corre más
    setInfo(prev => ({ ...prev, cp }));
    void localidadPorCp(cp).then(loc => {
      if (!loc) return;
      // Se captura el autofill anterior afuera del updater: React (StrictMode)
      // puede invocarlo dos veces y un ref mutado adentro rompe la comparación.
      const previo = autofillCp.current;
      // En CABA loc.ciudad trae el barrio mayoritario del CP (o vacío si el CP
      // está repartido entre barrios sin mayoría clara).
      const ciudadNueva = loc.ciudad;
      // Tipear el CP a mano lo vuelve propio: la búsqueda por dirección ya no lo pisa.
      autofillCp.current = { cp: '', ciudad: ciudadNueva, provincia: loc.provincia };
      setInfo(prev => {
        // Para cuando el mapa resolvió, el CP (o el país) pudo haber cambiado.
        if (prev.pais !== 'AR' || normalizeCpAr(prev.cp) !== normalizeCpAr(cp)) return prev;
        const next = { ...prev };
        // Si lo que hay era de un autofill anterior se reemplaza (o se limpia,
        // cuando el CP nuevo no trae ciudad); lo escrito a mano no se toca.
        if (!prev.ciudad.trim() || prev.ciudad === previo.ciudad) {
          next.ciudad = ciudadNueva;
        }
        if (!provinciaTocada.current || prev.provincia === previo.provincia) {
          next.provincia = loc.provincia;
        }
        return next;
      });
    });
  };

  // Camino inverso: dirección → CP y barrio, solo CABA (ver /api/direccion-caba;
  // para el resto del país no hay servicio público calle → CP). Corre al salir
  // del campo dirección con provincia CABA. Un CP vacío o puesto por este mismo
  // autocompletado se actualiza directo; uno TIPEADO distinto no se pisa: se
  // ofrece como sugerencia reversible. El barrio exacto de USIG llena el campo
  // si estaba vacío o era nuestro.
  const buscarCpPorDireccion = () => {
    const dir = info.direccion.trim();
    if (info.pais !== 'AR' || info.provincia !== 'CABA' || dir.length < 5 || !/\d/.test(dir)) return;
    void fetch(`/api/direccion-caba?direccion=${encodeURIComponent(dir)}`)
      .then(r => (r.ok ? (r.json() as Promise<{ cp?: string; barrio?: string }>) : null))
      .then(data => {
        if (!data?.cp) return;
        const previo = autofillCp.current;
        const cpTipeado = info.cp.trim();
        const cpManual = !!cpTipeado && cpTipeado !== previo.cp;
        if (cpManual && normalizeCpAr(cpTipeado) !== data.cp) {
          setCpSugerido({ cp: data.cp, barrio: data.barrio ?? '' });
          autofillCp.current = { ...previo, ciudad: data.barrio || previo.ciudad };
        } else {
          setCpSugerido(null);
          autofillCp.current = { cp: data.cp, ciudad: data.barrio || previo.ciudad, provincia: 'CABA' };
        }
        setInfo(prev => {
          // Si mientras tanto cambió la dirección (o el destino), no tocar.
          if (prev.pais !== 'AR' || prev.provincia !== 'CABA' || prev.direccion.trim() !== dir) return prev;
          const next = { ...prev };
          if (!cpManual) next.cp = data.cp!;
          if (data.barrio && (!prev.ciudad.trim() || prev.ciudad === previo.ciudad)) next.ciudad = data.barrio;
          return next;
        });
      })
      .catch(() => {});
  };

  const aplicarCpSugerido = () => {
    if (!cpSugerido) return;
    const { cp, barrio } = cpSugerido;
    const previo = autofillCp.current;
    autofillCp.current = { cp, ciudad: barrio || previo.ciudad, provincia: 'CABA' };
    setInfo(prev => ({
      ...prev,
      cp,
      ciudad: barrio && (!prev.ciudad.trim() || prev.ciudad === previo.ciudad) ? barrio : prev.ciudad,
    }));
    setCpSugerido(null);
    // El CP nuevo recotiza solo (efecto sobre info.cp).
  };

  // Número de secuencia de cada búsqueda: si el CP cambia rápido, la respuesta
  // vieja llega después y pisaba a la nueva — tarifas (o sucursales) de un CP
  // que ya no es el del formulario. Solo la última solicitud toca el estado.
  const ratesSeq = useRef(0);
  const branchesSeq = useRef(0);
  // Embudo: cada evento una sola vez por lo que mide (tarifas vistas por CP,
  // envío confirmado por modalidad) — recargar o volver atrás no lo infla.
  const tarifasVistas = useRef(new Set<string>());
  const ultimoShippingInfo = useRef<ShippingTier | null>(null);

  const fetchRates = async () => {
    if (!info.cp) return;
    const seq = ++ratesSeq.current;
    setLoadingRates(true);
    setRatesError(null);
    setShippingRates([]);
    setSelectedRate(null);
    setBranches([]);
    setSelectedBranch(null);
    setSucursalesEstado('idle');
    try {
      const res = await fetch(
        `/api/andreani-rates?cp=${encodeURIComponent(info.cp)}&provincia=${encodeURIComponent(info.provincia)}&valor=${subtotal}&peso=0.5`
      );
      const data: { rates?: ShippingRate[]; error?: string } = await res.json();
      if (seq !== ratesSeq.current) return; // ya hay una búsqueda más nueva
      if (data.rates && data.rates.length > 0) {
        // Sucursal primero y preseleccionada: es el envío que menos cuesta.
        const elegida = tarifaPorDefecto(data.rates);
        setShippingRates(ordenarTarifas(data.rates));
        setSelectedRate(elegida);
        if (elegida) fetchBranches(elegida);
        const cpNorm = normalizeCpAr(info.cp);
        if (!tarifasVistas.current.has(cpNorm)) {
          tarifasVistas.current.add(cpNorm);
          gaViewShippingOptions();
        }
      } else {
        setRatesError('No se encontraron opciones de envío para este código postal.');
      }
    } catch {
      if (seq !== ratesSeq.current) return;
      setRatesError('No se pudo calcular el envío. Intentá de nuevo.');
    } finally {
      if (seq === ratesSeq.current) setLoadingRates(false);
    }
  };

  // Cotizar apenas el CP está completo, ya en el paso 1. Debounce corto para
  // no pegarle a Andreani en cada tecla; la clave evita recotizar lo mismo al
  // avanzar de paso. Si cambia el carrito (subtotal) se recotiza: el valor
  // declarado afecta la tarifa.
  const cotizado = useRef('');
  useEffect(() => {
    if (!hydrated || isInternational || soloGift) return;
    const cp = normalizeCpAr(info.cp);
    if (!/^\d{4}$/.test(cp)) return;
    const clave = `${cp}|${subtotal}`;
    if (cotizado.current === clave) return;
    const t = setTimeout(() => {
      if (cotizado.current === clave) return;
      cotizado.current = clave;
      fetchRates();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isInternational, soloGift, info.cp, subtotal]);

  // Internacional: la cotización sale del tarifario local (Boxfly) y existe
  // desde el paso 1 — la tarifa se fija apenas se conoce, no al cambiar de paso.
  useEffect(() => {
    if (!isInternational) return;
    const rate = intlQuote ? { id: 'fedex_international', label: intlQuote.label, cost: intlQuote.cost } : null;
    setSelectedRate(rate);
    setShippingRates(rate ? [rate] : []);
    if (rate && !tarifasVistas.current.has(`intl:${info.pais}`)) {
      tarifasVistas.current.add(`intl:${info.pais}`);
      gaViewShippingOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInternational, intlQuote]);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errores).length > 0) {
      // Se marcan todos de una (no de a uno como el globito nativo) y se lleva
      // el foco al primero con problema.
      setTocados(Object.fromEntries(camposVisibles(optsValidacion).map(c => [c, true])));
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('form [aria-invalid="true"]')?.focus();
      });
      return;
    }
    guardarDatos({
      email: info.email, nombre: info.nombre, apellido: info.apellido, direccion: info.direccion, depto: info.depto,
      cp: info.cp, ciudad: info.ciudad, provincia: info.provincia, pais: info.pais, telefono: info.telefono,
    });
    if (soloGift) {
      // Nada que enviar: directo a pagar.
      setSelectedRate(null);
      setShippingRates([]);
      if (ultimoShippingInfo.current !== 'gift') {
        ultimoShippingInfo.current = 'gift';
        gaAddShippingInfo(gaItems(), totalFinal, 'gift');
      }
      setStep('pago');
      return;
    }
    // El envío se resuelve en este mismo paso: sin tarifa (o con sucursal sin
    // elegir) no se avanza, y el aviso dice qué falta en vez de un botón muerto.
    if (loadingRates) {
      setEnvioAviso('Un segundo: estamos calculando el envío.');
      return;
    }
    if (!shippingReady || !branchReady) {
      setEnvioAviso(!shippingReady
        ? (isInternational ? 'Choose a shipping method to continue.' : 'Elegí un método de envío para continuar.')
        : sucursalesEstado === 'error'
          ? 'No pudimos cargar las sucursales. Reintentá o elegí envío a domicilio.'
          : 'Elegí tu sucursal de Andreani para continuar.');
      document.getElementById('metodo-envio')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnvioAviso(null);
    // Envío resuelto de verdad (método y sucursal si aplica): acá se mide, no
    // en un render. Una vez por modalidad — volver y re-confirmar no lo duplica.
    const tier = tierEnvio();
    if (ultimoShippingInfo.current !== tier) {
      ultimoShippingInfo.current = tier;
      gaAddShippingInfo(gaItems(), totalFinal, tier);
    }
    setStep('pago');
  };

  const fetchBranches = async (rate: ShippingRate) => {
    const isSuc = rate.label?.toLowerCase().includes('sucursal') || rate.id?.toLowerCase().includes('sucursal');
    if (!isSuc) { setBranches([]); setSelectedBranch(null); setSucursalesEstado('idle'); return; }
    const seq = ++branchesSeq.current;
    setSucursalesEstado('cargando');
    setBranches([]);
    setSelectedBranch(null);
    try {
      const res = await fetch(`/api/andreani-branches?cp=${encodeURIComponent(info.cp)}`);
      const data: { branches?: AndBranch[]; error?: string } = await res.json();
      if (seq !== branchesSeq.current) return;
      // Un fallo del servicio NO es "no hay sucursales": antes se mostraba el
      // mismo cartel y el pedido entraba "a coordinar" sin necesidad.
      if (!res.ok || data.error) {
        setSucursalesEstado('error');
        return;
      }
      setBranches(data.branches ?? []);
      setSucursalesEstado((data.branches ?? []).length > 0 ? 'ok' : 'vacio');
    } catch {
      if (seq !== branchesSeq.current) return;
      setSucursalesEstado('error');
    }
  };

  const handleRateSelect = (rate: ShippingRate) => {
    setEnvioAviso(null);
    setSelectedRate(rate);
    fetchBranches(rate);
  };

  // Vaciar el carrito guardando primero una copia: si el pago se rechaza y el
  // gateway devuelve a /checkout, el carrito se restaura solo en vez de aparecer
  // vacío. La copia se descarta recién cuando el pago se confirma (/confirmacion).
  const snapshotAndClear = () => {
    saveCartSnapshot(items);
    clear();
  };

  // AddPaymentInfo del pixel: el evento no existía en el sitio. El punto natural
  // es acá, cuando el cliente elige medio de pago — es el último paso medible
  // antes de irse al gateway, y en los pagos off-site (MercadoPago, GOcuotas,
  // PayPal) es la última señal que se puede tomar desde el navegador.
  //
  // Se manda una sola vez por paso de pago aunque el cliente cambie de medio:
  // cada cambio de radio es la misma intención, no una nueva. Si el total cambia
  // después (el descuento del 10% por transferencia), el evento ya salió con el
  // total del momento — se prefiere eso a mandar un evento por cada tanteo.
  //
  // Acá ya se conocen los datos reales del comprador, así que el evento viaja con
  // advanced matching (el servidor los hashea, ver app/api/capi/route.ts). Es el
  // mismo criterio del Purchase en ConfirmacionClient: sin email ni teléfono, un
  // evento server-side matchea solo por IP y cookie, que es el match más débil.
  const addPaymentInfoSent = useRef(false);
  const handleMetodoChange = (metodo: string) => {
    setPago(prev => ({ ...prev, metodo }));
    // Si quedó un total ajustado esperando confirmación, cambiar de medio lo
    // descarta: la orden pendiente ya no refleja la elección.
    setTotalAjustado(null);
    setCuponCaido(null);
    ordenPendiente.current = null;
    if (addPaymentInfoSent.current) return;
    addPaymentInfoSent.current = true;
    gaAddPaymentInfo(gaItems(), totalFinal, metodo);
    fbAddPaymentInfo(
      items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      totalFinal,
      {
        em: info.email, ph: info.telefono, fn: info.nombre, ln: info.apellido,
        ct: info.ciudad, st: info.provincia, zp: info.cp, country: info.pais,
      },
    );
  };

  // El cliente aceptó el total actualizado: la orden que quedó en espera sigue
  // su camino a la pasarela sin crear otra.
  const confirmarTotalAjustado = async () => {
    const orden = ordenPendiente.current;
    if (!orden || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setTotalAjustado(null);
    setCuponCaido(null);
    ordenPendiente.current = null;
    await continuarAlPago(orden);
  };

  const handlePagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Con un total ajustado en espera, el único camino es aceptarlo (o cambiar
    // de medio): volver a enviar crearía una segunda orden.
    if (!pago.metodo || submitting || totalAjustado !== null) return;
    // Si escribió un usuario válido y pagó sin tocar "Sumarme", igual se guarda.
    const instagram = pago.instagram || (instagramValido(igBorrador.current) ? '@' + igBorrador.current : '');
    if (instagram) guardarDatos({ instagram });
    setSubmitting(true);
    setSubmitError(null);
    const isTransfer      = pago.metodo === 'transferencia';
    const isLocalTransfer = isTransfer && !isInternational;
    const isPaypal        = pago.metodo === 'paypal';
    const isMp            = pago.metodo === 'mercadopago' || pago.metodo === 'tarjeta';
    const isGocuotas      = pago.metodo === 'gocuotas';
    try {
      let orderRes;
      try {
        orderRes = await createOrderAndPreference({
          items: purchasableItems.map(item => ({ id: item.id, slug: item.id, name: item.name, price: item.price, quantity: item.quantity, size: item.size, image: item.image, customization: item.customization, gift: item.customization?.gift })),
          customer: { email: info.email, nombre: info.nombre, apellido: info.apellido, dni: info.dni, direccion: info.direccion, depto: info.depto, cp: cpEnvio, ciudad: info.ciudad, provincia: info.provincia, pais: info.pais, telefono: info.telefono, instagram },
          shipping: envioCosto,
          discountAmount: (isLocalTransfer ? Math.round((subtotal - subtotalGift - packRegularDescuento) * 0.10) : 0) + promo3x2Descuento + championDescuento + packRegularDescuento,
          discountLabel: [championDescuento > 0 ? 'CAMPEON50' : '', promo3x2Descuento > 0 ? '3x2' : '', packRegularDescuento > 0 ? packRegularEtiqueta(unidadesPack) : '', isLocalTransfer ? 'Transferencia (10%)' : ''].filter(Boolean).join(' + ') || undefined,
          couponCode: couponData?.code,
          // Solo para medir la paridad en el server (el precio y el descuento los
          // calcula él, nunca el navegador): si Woo descuenta otra cosa, queda en
          // el log con el número que el cliente estuvo viendo.
          couponDiscount: cuponDescuento,
          paymentMethod: pago.metodo,
          shippingMethodId: selectedRate?.id,
          shippingLabel: selectedRate?.label,
          // Sin sucursal elegida el pedido igual entra (ver branchReady), pero tiene
          // que quedar dicho en el pedido para que el equipo la coordine y no se
          // despache como envío a domicilio.
          shippingBranch: selectedBranch
            ? `${selectedBranch.label} — ${selectedBranch.direccion}`
            : isSucursal
              ? 'A COORDINAR — no se encontraron sucursales para el CP'
              : undefined,
          // El código (`id`) es lo único que el plugin de Andreani sabe leer para empaquetar;
          // el texto de arriba es solo para mostrar. Ver Andreani_Order_Mapper::get_branch_code_for_order.
          shippingBranchCode: selectedBranch?.id || undefined,
          // El retiro en sucursal no pide domicilio, así que el destino del
          // envío es la sucursal: sin esto el plugin de Andreani no puede
          // emitir la guía (ver lib/sucursal-destino).
          shippingBranchStreet: selectedBranch?.calle || undefined,
          shippingBranchCity:   selectedBranch?.localidad || undefined,
          ...getFbCookies(),
          ...getClarityCookies(),
          attribution: captureAttribution(),
        });
      } catch (wcErr) {
        console.error('[checkout] create-order error:', wcErr);
        // El servidor rechazó un dato de contacto y no creó el pedido: se vuelve
        // al paso 1 con el campo marcado, en vez de dejar un cartel genérico en
        // el paso de pago. No se toca nada más — ni el carrito (snapshotAndClear
        // vive en salirAPagar, al que no se llega), ni el envío, ni la sucursal,
        // ni el cupón, ni el medio de pago elegido.
        if (wcErr instanceof CreateOrderError && wcErr.status === 422 && wcErr.errores) {
          const recibidos = wcErr.errores as Partial<Record<CampoInfo, string>>;
          const visibles = camposVisibles(optsValidacion);
          const soloVisibles: Partial<Record<CampoInfo, string>> = {};
          for (const c of visibles) if (recibidos[c]) soloVisibles[c] = recibidos[c];
          // Si el rechazo es de un campo que este formulario no muestra, no hay
          // dónde marcarlo: se cae al cartel de abajo y no se pierde el aviso.
          if (Object.keys(soloVisibles).length > 0) {
            valoresRechazados.current = Object.fromEntries(visibles.map(c => [c, info[c]]));
            setErroresServidor(soloVisibles);
            setTocados(Object.fromEntries(visibles.map(c => [c, true])));
            setStep('info');
            setSubmitting(false);
            requestAnimationFrame(() => {
              document.querySelector<HTMLInputElement>('form [aria-invalid="true"]')?.focus();
            });
            return;
          }
        }
        const wcMsg = wcErr instanceof Error ? wcErr.message : '';
        setSubmitError(wcMsg || 'Error al crear el pedido. Revisá tu conexión e intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      // Usar el total de WooCommerce como fuente de verdad para los gateways de pago.
      // wcTotal refleja sale_price, cupones y cualquier descuento aplicado en Woo,
      // independientemente del precio que haya quedado guardado en el carrito del frontend.
      const authorizedTotal = orderRes.wcTotal || totalFinal;
      // Si Woo calculó un total distinto del que el cliente estuvo viendo, no se
      // lo manda a pagar un monto que no vio: se muestra el nuevo y sigue recién
      // cuando lo acepta (ver el panel de total ajustado en el paso de pago).
      if (Math.abs(authorizedTotal - montoAPagar) > 1) {
        ordenPendiente.current = orderRes;
        // Si Woo tiró el cupón, el resumen no puede seguir mostrando un
        // descuento que el pedido no tiene: se saca y se dice por qué.
        if (orderRes.couponDropped) {
          setCuponCaido(orderRes.couponDropped);
          setCouponData(null);
          setCoupon('');
          setCouponError('El código ' + orderRes.couponDropped.code + ' no se pudo aplicar: ' + orderRes.couponDropped.reason + '.');
        }
        setTotalAjustado(authorizedTotal);
        setSubmitting(false);
        return;
      }
      await continuarAlPago(orderRes);
    } catch (err) {
      console.error('[checkout] unexpected error:', err);
      setSubmitError('Error inesperado. Revisá la consola del navegador.');
      setSubmitting(false);
    }
  };

  // La orden ya existe en Woo: guarda el comprobante en sessionStorage y sale
  // hacia la pasarela (o la pantalla de transferencia/confirmación).
  const continuarAlPago = async (orderRes: OrdenCreada) => {
    const isTransfer      = pago.metodo === 'transferencia';
    const isLocalTransfer = isTransfer && !isInternational;
    const isPaypal        = pago.metodo === 'paypal';
    const isMp            = pago.metodo === 'mercadopago' || pago.metodo === 'tarjeta';
    const isGocuotas      = pago.metodo === 'gocuotas';
    const authorizedTotal = orderRes.wcTotal || totalFinal;
    const salirAPagar = () => {
      gaIrAPagar(pago.metodo, authorizedTotal, tierEnvio());
      snapshotAndClear();
    };
    try {
      // Etiqueta la sesión de Clarity con el número de pedido (custom tag
      // filtrable en Recordings). Best-effort: si Clarity no cargó, no hace nada.
      tagClarityOrder(orderRes.wcOrderNumber);
      sessionStorage.setItem('hype_order', JSON.stringify({
        wcOrderId: orderRes.wcOrderId, wcOrderNumber: orderRes.wcOrderNumber,
        orderKey: orderRes.orderKey,
        orderNum: orderRes.wcOrderNumber, items,
        total: authorizedTotal,
        metodo: pago.metodo, email: info.email, nombre: info.nombre, apellido: info.apellido,
        direccion: info.direccion, ciudad: info.ciudad, provincia: info.provincia,
        cp: cpEnvio, telefono: info.telefono, pais: info.pais,
        talo: isLocalTransfer ? orderRes.taloPaymentData : undefined,
        // Si Woo tiró el cupón al confirmar (cupo de FIRST10 agotado, vencido o
        // ya usado), la pantalla siguiente se lo dice al cliente.
        couponDropped: orderRes.couponDropped ?? null,
        first10: !!orderRes.first10,
      }));
      if (isGocuotas) {
        let gcRes;
        try {
          gcRes = await fetch('/api/gocuotas-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wcOrderId: orderRes.wcOrderId,
              total: authorizedTotal,
              email: info.email,
              phone: info.telefono,
              orderKey: orderRes.orderKey,
            }),
          });
        } catch {
          setSubmitError('Error de red al conectar con GOcuotas. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        if (!gcRes.ok) {
          const errData = await gcRes.json().catch(() => ({})) as { error?: string };
          setSubmitError(`GOcuotas: ${errData.error || 'Error al iniciar el pago'}. Intentá de nuevo.`);
          setSubmitting(false);
          return;
        }
        const gcData = await gcRes.json() as { urlInit?: string };
        if (!gcData.urlInit) {
          setSubmitError('GOcuotas no devolvió un link de pago. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        salirAPagar();
        window.location.href = gcData.urlInit;
        return;
      }
      if (isMp && !orderRes.initPoint) {
        setSubmitError('No se pudo iniciar el pago con MercadoPago. Intentá de nuevo o elegí otro método.');
        setSubmitting(false);
        return;
      }
      if (isPaypal) {
        let ppRes;
        try {
          ppRes = await fetch('/api/paypal-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wcOrderId: orderRes.wcOrderId, totalARS: authorizedTotal }),
          });
        } catch (ppErr) {
          console.error('[checkout] paypal-order fetch error:', ppErr);
          setSubmitError('Error de red al conectar con PayPal. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        if (!ppRes.ok) {
          const errData = await ppRes.json().catch(() => ({})) as { error?: string };
          console.error('[checkout] paypal-order non-ok:', ppRes.status, errData);
          setSubmitError(`PayPal: ${errData.error || 'Error ' + ppRes.status}. Intentá de nuevo.`);
          setSubmitting(false);
          return;
        }
        const ppData = await ppRes.json() as { approvalUrl?: string };
        if (!ppData.approvalUrl) {
          setSubmitError('PayPal no devolvió un link de pago. Intentá de nuevo.');
          setSubmitting(false);
          return;
        }
        salirAPagar();
        window.location.href = ppData.approvalUrl;
        return;
      }
      if (isLocalTransfer && !orderRes.taloPaymentData?.alias) {
        setSubmitError('No se pudo iniciar el pago con Talo Pay. Intentá de nuevo o elegí otro método.');
        setSubmitting(false);
        return;
      }
      salirAPagar();
      if (isMp && orderRes.initPoint) { window.location.href = orderRes.initPoint; }
      else if (isTransfer)            { router.push('/pendiente-de-pago'); }
      else                            { router.push('/confirmacion'); }
    } catch (err) {
      console.error('[checkout] unexpected error:', err);
      setSubmitError('Error inesperado. Revisá la consola del navegador.');
      setSubmitting(false);
    }
  };

  // Hasta que no se leyó el carrito (localStorage) y se evaluó la copia de
  // seguridad no se puede afirmar que esté vacío — mostrarlo antes hacía
  // parpadear "Tu carrito está vacío" en cada carga del checkout.
  if (!hydrated) return <div className="min-h-screen bg-white" />;

  if (items.length === 0 && step === 'info') return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-[14px] text-muted-foreground">Tu carrito está vacío.</p>
      <a href="/" className="text-[13px] underline">Volver al inicio</a>
    </div>
  );

  const stepLabel = (s: Step) => ({ info: soloGift ? 'Información' : 'Datos y envío', pago: 'Pago' }[s]);
  const stepIcon = { info: soloGift ? User : Truck, pago: CreditCard } as const;
  const unidades = purchasableItems.reduce((n, i) => n + i.quantity, 0);
  // Lo que dice el botón "Pagar $X": con transferencia local, el total con el
  // 10% off; en la moneda en que se cobra, no en la de vitrina.
  const avisarSinMetodo = () => {
    if (pago.metodo) return;
    setPagoSinMetodo(true);
    document.getElementById('medio-de-pago')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const montoAPagar = pago.metodo === 'transferencia' && !isInternational ? transferTotal : totalFinal;
  // Dos pasos: "Datos y envío" (el CP cotiza en vivo y el método se elige ahí
  // mismo) y "Pago". El paso de envío propio quedó vacío de contenido cuando
  // la cotización pasó al primer paso, así que se fusionó.
  const steps: Step[] = ['info', 'pago'];

  // Mercado Pago reactivado (12/07/2026): la cuenta fue devuelta tras la suspensión
  // del 05/07. Vuelve a ofrecerse como la forma más simple de cobrar con tarjeta
  // mientras se resuelve el alta de Getnet.
  const paymentMethods = [
    !isInternational && { id: 'tarjeta',       label: 'Tarjeta de crédito o débito',       sub: 'Hasta 3 cuotas sin interés' },
    !isInternational && { id: 'gocuotas',      label: '4 cuotas con débito sin interés',   sub: 'Con tu tarjeta de débito · sin interés' },
    !isInternational && { id: 'transferencia', label: 'Transferencia o depósito bancario',  sub: currency !== 'ARS' ? '' : soloGift ? 'Sin descuento sobre gift cards' : `Pagás ${formatPrice(transferTotal)}`, badge: soloGift ? undefined : '10% off' },
    !isInternational && { id: 'mercadopago',   label: 'Mercado Pago',                       sub: '' },
    !isInternational && { id: 'paypal',        label: 'PayPal',                             sub: 'Solo con saldo disponible en tu cuenta de PayPal' },
    isInternational  && { id: 'paypal',        label: 'PayPal',                             sub: 'Credit card, debit or PayPal balance · charged in USD' },
    isInternational  && { id: 'transferencia', label: 'Bank transfer (USD wire)',             sub: 'Lead Bank · USD ACH/Wire · details shown after order' },
  ].filter(Boolean) as MetodoPago[];

  // Productos, cupón y totales. Va en la columna derecha en desktop y dentro
  // de la barra colapsable en mobile (ver useIsDesktop).
  const resumen = (
    <>
            {/* Con muchos productos la lista scrollea dentro de una altura fija
                y se difumina en los bordes, así el total no se va de la vista. */}
            <ScrollFadeList
              className="mb-6 [--scroll-fade-bg:#fff]"
              scrollClassName="max-h-[360px] overflow-y-auto overscroll-contain space-y-4 pr-1"
            >
              {items.map(item => (
                <div
                  key={`${item.id}-${item.size}-${item.customization?.number ?? ''}-${item.customization?.playerName ?? ''}`}
                  className={`flex gap-3 items-center ${item.isGift ? 'bg-green-50/60 border border-green-100 rounded-[8px] p-2 -mx-2' : ''}`}
                >
                  <div className="relative w-16 h-20 bg-bg-alt flex-shrink-0 overflow-hidden rounded-[10px]">
                    {item.image ? (
                      <img
                        src={imgSrc(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : null}
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/60 text-white text-[10px] flex items-center justify-center font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                    {item.isGift ? (
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-green-700">Regalo por compra</p>
                    ) : isGiftCardItem(item) ? (
                      <p className="text-[11px] text-muted-foreground">
                        {item.customization?.gift?.paraEmail
                          ? `Para ${item.customization.gift.paraNombre || item.customization.gift.paraEmail}`
                          : 'Digital · por mail'}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Talle: {item.size}</p>
                    )}
                    {item.customization && (item.customization.playerName || item.customization.number) && (
                      <p className="text-[11px] text-foreground/70 font-medium">
                        Dorsal: {item.customization.number && `#${item.customization.number}`}{item.customization.playerName && ` ${item.customization.playerName}`}
                      </p>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </ScrollFadeList>
            <GiftProgressBar
              email={info.email}
              couponCode={couponData?.code}
              promoDiscount={promo3x2Descuento + championDescuento + packRegularDescuento}
              className="pb-4 mb-4 border-b border-border"
            />
            {/* Colapsado: un input de cupón a la vista manda a buscar códigos
                afuera y muchos no vuelven. Se abre con el link. */}
            {cuponAbierto || couponData || coupon ? (
            <div className="space-y-1.5 mb-5">
              <div className="flex gap-2">
                <input type="text" autoFocus={cuponAbierto && !coupon} placeholder={isInternational ? 'Discount code' : 'Código de descuento'} value={coupon}
                  onChange={e => { setCoupon(e.target.value); setCouponError(null); if (couponData) setCouponData(null); }}
                  className="flex-1 border border-border px-3 py-2.5 text-[12px] focus:outline-none focus:border-foreground transition-colors rounded-[10px]" />
                <DynamicButton
                  onClick={async () => {
                    if (!coupon.trim() || couponValidating) return;
                    setCouponValidating(true);
                    setCouponError(null);
                    try {
                      const data = await validarCupon(coupon, info.email);
                      if (data.valid && data.gift_card && giftItems.length > 0) {
                        setCouponError('Una gift card no sirve para comprar otra gift card');
                      } else if (data.valid && data.code && data.type && data.amount !== undefined) {
                        cuponValidadoPara.current = data.code + '|' + info.email.trim().toLowerCase();
                        setCouponData({ code: data.code, type: data.type, amount: data.amount, free_shipping: data.free_shipping, first10: data.first10, items: data.items ?? null });
                      }
                      else { setCouponError(data.error || 'Código inválido'); }
                    } catch { setCouponError('Error al validar el código'); }
                    finally { setCouponValidating(false); }
                  }}
                  disabled={couponValidating || !!couponData}
                  className={`px-4 py-2.5 border text-[12px] font-medium rounded-[10px] disabled:opacity-60 ${couponData ? 'border-green-700 text-green-700' : 'border-border hover:border-foreground'}`}
                >
                  {couponData
                    ? (isInternational ? 'Applied' : 'Aplicado')
                    : couponValidating
                      ? (isInternational ? 'Checking' : 'Validando')
                      : (isInternational ? 'Apply' : 'Aplicar')}
                </DynamicButton>
              </div>
              {couponError && <p className="text-[11px] text-destructive">{couponError}</p>}
              {couponData && (
                <p className="text-[11px] text-green-700 font-medium">
                  Cupón {couponData.code} aplicado — {couponData.first10 ? textoFirst10(couponData.first10) : couponData.type === 'percent' ? `${couponData.amount}% off` : formatPrice(couponData.amount)}
                </p>
              )}
              {/* Carrito mixto: un cupón de producto descuenta SOLO las líneas
                  elegibles (HYPE10 excluye 12 productos). Decirlo acá y no en el
                  mail de pago es la diferencia entre un total claro y el reclamo
                  del #4092. */}
              {lineasSinCupon.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {couponData?.code} corre sobre {lineasCupon.length - lineasSinCupon.length} de los {lineasCupon.length} productos del carrito.
                </p>
              )}
              {cuponRevalidando && (
                <p className="text-[11px] text-muted-foreground">Actualizando el descuento…</p>
              )}
              {couponData?.first10 && (
                <div className="flex items-center gap-3 rounded-[8px] border border-green-100 bg-green-50/60 p-2">
                  {couponData.first10.image ? (
                    <img src={couponData.first10.image} alt={couponData.first10.name} className="h-12 w-10 flex-shrink-0 rounded-[6px] object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-tight">{couponData.first10.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-green-700">Regalo FIRST10 · se agrega al confirmar</p>
                  </div>
                  <span className="text-[12px] font-semibold">{formatPrice(0)}</span>
                </div>
              )}
            </div>
            ) : (
              <button
                type="button"
                onClick={() => setCuponAbierto(true)}
                className="mb-5 flex items-center gap-1.5 text-[12px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                <Tag className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                {isInternational ? 'Have a discount code?' : '¿Tenés un código de descuento?'}
              </button>
            )}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {championDescuento > 0 && <div className="flex justify-between text-[13px] text-green-700"><span>Campeones del mundo · 50%</span><span>−{formatPrice(championDescuento)}</span></div>}
              {promo3x2Descuento > 0 && <div className="flex justify-between text-[13px] text-green-700"><span>3x2</span><span>−{formatPrice(promo3x2Descuento)}</span></div>}
              {packRegularDescuento > 0 && <div className="flex justify-between text-[13px] text-green-700"><span>{packRegularEtiqueta(unidadesPack)}</span><span>−{formatPrice(packRegularDescuento)}</span></div>}
              {packRegularFaltanN > 0 && (
                <p className="text-[11px] text-foreground/70">
                  Sumá {packRegularFaltanN} Regular Tee{packRegularFaltanN > 1 ? 's' : ''} más y pagás precio de pack
                </p>
              )}
              {packRegularCuartaGratis && (
                <p className="text-[11px] text-foreground/70">
                  Sumá 1 Regular Tee más y te sale $0: pagás 3, llevás 4
                </p>
              )}
              {cuponDescuento > 0 && <div className="flex justify-between text-[13px] text-green-700"><span>Descuento {couponData?.type === 'percent' ? `(${couponData.amount}%)` : ''}</span><span>−{formatPrice(cuponDescuento)}</span></div>}
              {promo3x2Active && items.length > 0 && (promo3x2UnidadesFaltan === 1 || promo3x2UnidadesFaltan === 2) && (
                <p className="text-[11px] text-foreground/70">
                  Agregá {promo3x2UnidadesFaltan} producto{promo3x2UnidadesFaltan > 1 ? 's' : ''} más y llevate el 3x2
                </p>
              )}
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">
                  {isInternational ? 'Shipping' : step === 'info' && isSucursal ? 'Envío a sucursal' : 'Envío'}
                </span>
                <span>
                  {/* En el paso 1 la tarifa ya está apenas hay CP (cotización en
                      vivo); mientras no la haya, se dice qué falta en vez de "—". */}
                  {step === 'info' && !selectedRate && !loadingRates ? (
                    <span className="text-muted-foreground text-[11px]">
                      {isInternational ? 'Calculated with your country' : 'Se calcula con tu código postal'}
                    </span>
                  ) : isInternational ? (
                    selectedRate ? formatPrice(selectedRate.cost) : <span className="text-muted-foreground">—</span>
                  ) : loadingRates ? (
                    <span className="text-muted-foreground">Calculando...</span>
                  ) : freeShipping ? (
                    <><span className="line-through text-muted-foreground mr-1">{selectedRate ? formatPrice(selectedRate.cost) : ''}</span><span className="text-green-700 font-semibold">Gratis</span></>
                  ) : selectedRate && Math.round(envioCosto) < Math.round(selectedRate.cost) ? (
                    <><span className="line-through text-muted-foreground mr-1">{formatPrice(selectedRate.cost)}</span>{formatPrice(envioCosto)}</>
                  ) : selectedRate ? (
                    formatPrice(selectedRate.cost)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[16px] font-bold border-t border-border pt-3 mt-2">
                <span>Total</span>
                {/* El total cambia al sumar el envío, aplicar un cupón o elegir
                    transferencia: el número viejo se descifra en el nuevo en vez
                    de saltar. Al cargar se muestra directo. */}
                <ScrambleText animateOnMount={false} intervalMs={16} numeric className="tabular-nums">
                  {formatPrice(totalMostrado)}
                </ScrambleText>
              </div>
              {cobroDistinto && (
                <p data-testid="aviso-moneda-cobro" className="text-[11px] text-muted-foreground mt-1 text-right">
                  {isInternational
                    ? <>Prices in {currency} are for reference. You pay in US dollars: <strong className="text-foreground">{formatPriceIn(totalMostrado, 'USD')}</strong> at today&apos;s rate.</>
                    : cobro === 'USD'
                      ? <>PayPal cobra en dólares: <strong className="text-foreground">{formatPriceIn(totalMostrado, 'USD')}</strong> a la cotización del día.</>
                      : <>Los precios en {currency} son de referencia. El pago se hace en pesos argentinos: <strong className="text-foreground">{formatPriceIn(step === 'pago' && pago.metodo === 'transferencia' ? transferTotal : totalMostrado, 'ARS')}</strong>.</>}
                </p>
              )}
              {step === 'pago' && pago.metodo === 'transferencia' && !isInternational && (
                <p className="text-[11px] text-green-700 font-semibold mt-1 text-right">Con transferencia pagás {formatPrice(transferTotal)}</p>
              )}
              {isInternational && step === 'pago' && (
                <p className="text-[11px] text-muted-foreground mt-1">{CUSTOMS_NOTICE}</p>
              )}
            </div>
    </>
  );

  // Selector de método de envío. Vivía en un paso propio; con la cotización en
  // vivo por CP quedó sin razón de ser y ahora es parte del primer paso.
  const metodoEnvio = (
    <div id="metodo-envio" className="pt-2 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {isInternational ? 'Shipping method' : 'Método de envío'}
      </p>
      {isInternational ? (
        <>
          <RadioCard
            name="envio"
            checked
            onSelect={() => {}}
            icon={Plane}
            title={selectedRate?.label ?? 'International shipping'}
            sub="Door to door · tracked · insured"
            right={<span className="text-[13px] font-semibold">{selectedRate ? formatPrice(selectedRate.cost) : '—'}</span>}
          />
          <div className="bg-foreground/[0.03] px-4 py-3.5 rounded-[10px] text-[12px] text-foreground/60 leading-relaxed">
            {CUSTOMS_NOTICE}
          </div>
        </>
      ) : (
        <>
          {!loadingRates && !ratesError && shippingRates.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              Completá tu código postal y te mostramos las opciones con su precio.
            </p>
          )}

          {loadingRates && (
            <div className="space-y-2" aria-live="polite">
              {[0, 1].map(i => (
                <div key={i} className="flex items-center gap-3.5 rounded-[10px] border border-border px-4 py-4">
                  <span className="h-[18px] w-[18px] rounded-full bg-foreground/[0.06] animate-pulse" />
                  <span className="h-10 w-10 rounded-[8px] bg-foreground/[0.06] animate-pulse" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-3 w-1/3 rounded bg-foreground/[0.06] animate-pulse" />
                    <span className="block h-2.5 w-1/4 rounded bg-foreground/[0.05] animate-pulse" />
                  </span>
                  <span className="h-3 w-14 rounded bg-foreground/[0.06] animate-pulse" />
                </div>
              ))}
              <p className="text-[12px] text-muted-foreground">Calculando opciones de envío para CP {info.cp}...</p>
            </div>
          )}

          {ratesError && !loadingRates && (
            <div className="space-y-3">
              <p className="text-[12px] text-destructive bg-destructive/10 px-4 py-3 rounded-[8px]">{ratesError}</p>
              <button type="button" onClick={fetchRates}
                className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
                Intentar de nuevo
              </button>
            </div>
          )}

          {!loadingRates && shippingRates.length > 0 && (
            <>
              <div className="space-y-2">
                {shippingRates.map(rate => {
                  const esSucursal = modoDeTarifa(rate) === 'sucursal';
                  const costo = costoDe(rate);
                  // costoEnvio devuelve la tarifa cruda (con centavos) cuando no hay bonificación:
                  // comparar redondeado, si no $5.555,6 < $5.556 mostraba el mismo precio tachado.
                  const bonificado = Math.round(costo) < Math.round(rate.cost);
                  return (
                    <RadioCard
                      key={rate.id}
                      name="envio"
                      className="py-3"
                      checked={selectedRate?.id === rate.id}
                      onSelect={() => handleRateSelect(rate)}
                      icon={esSucursal ? Store : Home}
                      title={esSucursal ? 'Retiro en sucursal' : 'Envío a domicilio'}
                      sub={rate.label}
                      right={
                        <>
                          {bonificado && (
                            <span className="text-[12px] text-muted-foreground line-through block">{formatPrice(rate.cost)}</span>
                          )}
                          {costo === 0 ? (
                            <span className="text-[13px] font-semibold text-green-700 block">Gratis</span>
                          ) : (
                            <span className="text-[13px] font-semibold block">{formatPrice(costo)}</span>
                          )}
                          {esSucursal && !bonificado && ahorroEnSucursal > 0 && (
                            <span className="inline-block mt-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              Ahorrás {formatPrice(ahorroEnSucursal)}
                            </span>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </div>
              {/* La barra de envío gratis motiva cuando el umbral está cerca;
                  con menos de la mitad del camino hecho solo mete ruido en el
                  momento de pagar (no cambia ninguna condición comercial:
                  el umbral sigue siendo el mismo y el descuento lo aplica
                  lib/envio igual que siempre). */}
              {(couponFreeShip || sobreUmbral || envioCtx.subtotalFisico >= FREE_SHIPPING_THRESHOLD / 2) && (
              <BarraEnvioGratis
                falta={couponFreeShip || sobreUmbral ? 0 : FREE_SHIPPING_THRESHOLD - envioCtx.subtotalFisico}
                progreso={couponFreeShip || sobreUmbral ? 1 : envioCtx.subtotalFisico / FREE_SHIPPING_THRESHOLD}
              >
                {couponFreeShip ? (
                  'Cupón de envío gratis aplicado.'
                ) : sobreUmbral ? (
                  <>Tu compra tiene <span className="font-semibold text-foreground">envío gratis a sucursal</span>.</>
                ) : (
                  <>Sumá <span className="font-semibold text-foreground">{formatPrice(FREE_SHIPPING_THRESHOLD - envioCtx.subtotalFisico)}</span> y el envío a sucursal es gratis.</>
                )}
              </BarraEnvioGratis>
              )}
            </>
          )}

          {isSucursal && selectedBranch && (
            // Elegida la sucursal, la lista se va: queda la card con "Cambiar".
            <div className="flex items-start justify-between gap-3 rounded-[10px] border border-foreground bg-foreground/[0.02] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-0.5">Retirás en</p>
                <p className="text-[13px] font-semibold leading-tight">{selectedBranch.label}</p>
                {selectedBranch.direccion && <p className="text-[11px] text-muted-foreground mt-0.5">{selectedBranch.direccion}</p>}
              </div>
              <button type="button" onClick={() => setSelectedBranch(null)}
                className="flex-shrink-0 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Cambiar
              </button>
            </div>
          )}
          {isSucursal && !selectedBranch && (
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2">Elegí tu sucursal Andreani</p>
              {loadingBranches && (
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground px-4 py-3 border border-border rounded-[10px]">
                  <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  Buscando sucursales cerca de CP {info.cp}...
                </div>
              )}
              {sucursalesEstado === 'error' && (
                <div className="space-y-2">
                  <p className="text-[12px] text-destructive bg-destructive/10 px-4 py-3 rounded-[8px]">
                    No pudimos cargar las sucursales. Reintentá en un momento.
                  </p>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => selectedRate && fetchBranches(selectedRate)}
                      className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
                      Reintentar
                    </button>
                    <span className="text-[12px] text-muted-foreground">Si sigue sin andar, elegí envío a domicilio.</span>
                  </div>
                </div>
              )}
              {sucursalesEstado === 'ok' && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {branches.map(b => (
                    <RadioCard
                      key={b.id}
                      name="sucursal"
                      checked={selectedBranch?.id === b.id}
                      onSelect={() => {
                        setEnvioAviso(null);
                        setSelectedBranch(b);
                        // Con la sucursal resuelta, lo que sigue son los datos:
                        // se acompaña con scroll, sin robar el foco ni abrir teclado.
                        setTimeout(() => document.getElementById('tus-datos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
                      }}
                      title={b.label}
                      sub={b.direccion || undefined}
                      className="py-3"
                    />
                  ))}
                </div>
              )}
              {sucursalesEstado === 'vacio' && (
                <div className="flex gap-3 rounded-[10px] bg-foreground/[0.04] px-4 py-3.5">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-foreground/50" strokeWidth={1.75} aria-hidden="true" />
                  <p className="text-[12px] text-foreground/70 leading-relaxed">
                    No se encontraron sucursales para CP {info.cp}. Podés igualmente continuar y te contactamos para coordinar.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#f4f4f4]${flashActive ? ' pt-[40px]' : ''}`}>
      <div className="relative border-b border-border bg-white py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
        <div className="pointer-events-none absolute inset-x-0 top-[27px] mx-auto flex max-w-[1100px] justify-end px-4">
          <PagoSeguroBadge en={isInternational} />
        </div>
        {/* Los pasos completados son clickeables para volver; adelantarse no,
            porque cada paso valida al enviar su formulario. */}
        <Stepper<Step>
          className="mt-4"
          steps={steps.map(s => ({ id: s, label: stepLabel(s), icon: stepIcon[s] }))}
          current={step}
          onSelect={setStep}
        />
      </div>

      {/* Mobile: el resumen arriba, colapsado en una barra con el total.
          Antes quedaba debajo del botón de pagar. Sticky: el total queda a la
          vista mientras se scrollea el formulario (el header con el stepper sí
          se va — pinearlo todo comería un quinto de la pantalla). */}
      {!isDesktop && (
        <div className={`sticky z-30 border-b border-border bg-white ${flashActive ? 'top-[40px]' : 'top-0'}`}>
          <button
            type="button"
            onClick={() => setResumenAbierto(o => !o)}
            aria-expanded={resumenAbierto}
            aria-controls="resumen-mobile"
            className="w-full bg-foreground/[0.025] px-4 py-4 flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <ShoppingBag className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              {resumenAbierto
                ? (isInternational ? 'Hide order summary' : 'Ocultar resumen')
                : (isInternational ? 'Show order summary' : 'Ver resumen del pedido')}
              <ChevronDown
                aria-hidden="true"
                className={`w-4 h-4 text-foreground/50 transition-transform duration-200 ${resumenAbierto ? 'rotate-180' : ''}`}
              />
            </span>
            <span className="text-[15px] font-bold tabular-nums">{formatPrice(totalMostrado)}</span>
          </button>
          <AnimatePresence initial={false}>
            {resumenAbierto && (
              <motion.div
                id="resumen-mobile"
                key="resumen-mobile"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                {/* Desplegado también es sticky: si no entra, scrollea adentro. */}
                <div className="max-h-[65vh] overflow-y-auto overscroll-contain px-4 pt-5 pb-6">{resumen}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Precio del carrito puesto al día con el de la tienda (lib/cart-reprice.ts):
          arriba de todo, en mobile y en desktop, porque el resumen mobile está
          colapsado y el cambio tiene que verse antes de pagar. */}
      {priceChanges.length > 0 && (
        <div className="max-w-[1100px] mx-auto px-4 pt-6">
          <PriceChangeNotice en={isInternational} className="rounded-[10px]" />
        </div>
      )}

      {recovered && (
        <div className="max-w-[1100px] mx-auto px-4 pt-6">
          <div className="border border-amber-300 bg-amber-50 px-4 py-3.5 rounded-[10px]">
            <p className="text-[13px] font-semibold text-amber-900">
              {recovered === 'failed' ? 'El pago no se completó' : 'Recuperamos tu carrito'}
            </p>
            <p className="text-[12px] text-amber-900/80 leading-relaxed mt-0.5">
              {recovered === 'failed'
                ? 'Guardamos tu carrito tal como estaba. Podés intentar el pago de nuevo o elegir otro medio de pago.'
                : 'Tus productos siguen acá para que puedas terminar la compra.'}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-4 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
        <div className="min-w-0">
          {/* Cada paso entra deslizando desde el costado del avance y sale por el
              otro. mode="wait": nunca hay dos formularios montados a la vez. */}
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
          {step === 'info' && (
            <form onSubmit={handleInfoSubmit} noValidate className="space-y-4">
              {/* En el flujo argentino el email vive dentro de "Tus datos": el
                  primer campo del checkout es el CP, que desbloquea todo. */}
              {(soloGift || isInternational) && (
              <Panel
                icon={Mail}
                title={isInternational ? 'Contact' : 'Contacto'}
                sub={precargado
                  ? (isInternational ? 'We filled in your details from last time' : 'Completamos con los datos de tu última compra')
                  : (isInternational ? 'We send your order updates here' : 'Te mandamos la confirmación y el seguimiento')}
                action={precargado ? (
                  <button type="button" onClick={olvidarDatos} className="flex-shrink-0 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    {isInternational ? 'Not you?' : '¿No sos vos?'}
                  </button>
                ) : undefined}
              >
                <FloatingInput type="email" label="Email" required autoComplete="email" inputMode="email" {...campo('email')} value={info.email}
                  hint={sugerenciaEmail ? (
                    <button type="button" onClick={() => setInfo(i => ({ ...i, email: sugerenciaEmail }))} className="text-left text-foreground/70 hover:text-foreground">
                      {isInternational ? 'Did you mean ' : '¿Quisiste decir '}
                      <span className="font-semibold text-foreground underline underline-offset-2">{sugerenciaEmail}</span>?
                    </button>
                  ) : undefined}
                  onChange={e => setInfo({ ...info, email: e.target.value })} />
                <Check className="mt-3" checked={info.newsletter} onChange={e => setInfo({ ...info, newsletter: e.target.checked })}>
                  {isInternational ? 'Get early access to drops & restocks' : 'Recibir novedades, drops y acceso anticipado'}
                </Check>
              </Panel>
              )}

              {soloGift ? (
              // Sólo gift cards: nada se envía. Alcanza con nombre y teléfono
              // para el pedido y el mail; sin dirección, DNI ni código postal.
              <Panel icon={User} title="Tus datos" sub="La gift card es digital: te llega por mail apenas se acredita el pago">
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <FloatingInput label="Nombre" required autoComplete="given-name" {...campo('nombre')} value={info.nombre} onChange={e => setInfo({ ...info, nombre: e.target.value })} />
                    <FloatingInput label="Apellido" required autoComplete="family-name" {...campo('apellido')} value={info.apellido} onChange={e => setInfo({ ...info, apellido: e.target.value })} />
                  </div>
                  <FloatingInput type="tel" label="Teléfono (con código de área)" required autoComplete="tel" {...campo('telefono')} value={info.telefono} onChange={e => setInfo({ ...info, telefono: e.target.value })} />
                </div>
              </Panel>
              ) : (
              <Panel icon={Truck} title={isInternational ? 'Shipping' : 'Envío'} sub={isInternational ? 'Where and how you get your order' : 'Elegí cómo y dónde recibís tu pedido'}>
                <div className="space-y-2.5">
                  {/* Con Argentina determinado, el select de país es una fila de
                      texto: casi nadie lo cambia y ocupa media pantalla menos. */}
                  {info.pais === 'AR' && !paisExpandido ? (
                    <div className="flex items-center justify-between rounded-[10px] border border-border bg-foreground/[0.02] px-4 py-2.5">
                      <p className="text-[12px]"><span className="text-muted-foreground">País: </span><span className="font-medium">Argentina</span></p>
                      <button type="button" onClick={() => setPaisExpandido(true)} className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                        Cambiar
                      </button>
                    </div>
                  ) : (
                  <FloatingSelect
                    label={isInternational ? 'Country' : 'País'}
                    autoComplete="country"
                    value={info.pais}
                    onChange={e => handleCountryChange(e.target.value)}
                  >
                    {COUNTRIES.map((c, i) =>
                      c.code === ''
                        ? <option key={i} value="" disabled>{c.name}</option>
                        : <option key={c.code} value={c.code}>{c.name}</option>
                    )}
                  </FloatingSelect>
                  )}

                  {/* International notice */}
                  {isInternational && (
                    <div className="bg-foreground/[0.03] border border-border px-4 py-3 rounded-[10px]">
                      <p className="text-[12px] text-foreground/70 leading-relaxed">
                        <span className="font-semibold text-foreground">Worldwide shipping available.</span>
                        {' '}Shipping is quoted right below and charged with your order — tracked and
                        insured, door to door.
                      </p>
                    </div>
                  )}

                  {isInternational ? (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <FloatingInput label="First name" required autoComplete="given-name" {...campo('nombre')} value={info.nombre} onChange={e => setInfo({ ...info, nombre: e.target.value })} />
                        <FloatingInput label="Last name" required autoComplete="family-name" {...campo('apellido')} value={info.apellido} onChange={e => setInfo({ ...info, apellido: e.target.value })} />
                      </div>
                      <FloatingInput label="Address" required autoComplete="address-line1" {...campo('direccion')} value={info.direccion} onChange={e => setInfo({ ...info, direccion: e.target.value })} />
                      <FloatingInput label="Apartment, suite (optional)" autoComplete="address-line2" value={info.depto} onChange={e => setInfo({ ...info, depto: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2.5">
                        <FloatingInput label="City" required autoComplete="address-level2" {...campo('ciudad')} value={info.ciudad} onChange={e => setInfo({ ...info, ciudad: e.target.value })} />
                        <FloatingInput
                          label={stateRequired ? 'State / Province' : 'State / Province (optional)'}
                          required={stateRequired}
                          autoComplete="address-level1"
                          {...campo('provincia')} value={info.provincia}
                          onChange={e => setInfo({ ...info, provincia: e.target.value })} />
                      </div>
                      <FloatingInput label="Postal / ZIP code" required autoComplete="postal-code" {...campo('cp')} value={info.cp} onChange={e => setInfo({ ...info, cp: e.target.value })} />
                      <FloatingInput type="tel" label="Phone (with country code)" required autoComplete="tel" {...campo('telefono')} value={info.telefono} onChange={e => setInfo({ ...info, telefono: e.target.value })} />
                      {metodoEnvio}
                    </>
                  ) : (
                    <>
                      {/* El CP va primero: cotiza el envío y autocompleta lo
                          geográfico. Con retiro en sucursal, barrio, provincia
                          y domicilio directamente no se piden. */}
                      <div className={isSucursal ? '' : 'grid grid-cols-2 gap-2.5'}>
                        <FloatingInput label="Código postal" required autoComplete="postal-code" {...campo('cp')} value={info.cp}
                          hint={cpSugerido ? (
                            <button type="button" onClick={aplicarCpSugerido} className="text-left text-foreground/70 hover:text-foreground">
                              Para esa dirección el CP es <span className="font-semibold text-foreground underline underline-offset-2">{cpSugerido.cp}</span> · Usar
                            </button>
                          ) : undefined}
                          onChange={e => handleCpChange(e.target.value)} />
                        {!isSucursal && (
                          <FloatingInput label={info.provincia === 'CABA' ? 'Barrio' : 'Ciudad'} required autoComplete="address-level2" {...campo('ciudad')} value={info.ciudad} onChange={e => setInfo({ ...info, ciudad: e.target.value })} />
                        )}
                      </div>
                      {metodoEnvio}
                      {!isSucursal && (
                        <>
                          <FloatingInput label="Dirección y número" required autoComplete="address-line1" error={tocados.direccion ? errores.direccion ?? null : null}
                            onBlur={() => { setTocados(t => (t.direccion ? t : { ...t, direccion: true })); buscarCpPorDireccion(); }}
                            value={info.direccion} onChange={e => setInfo({ ...info, direccion: e.target.value })} />
                          <FloatingInput label="Departamento / Piso (opcional)" autoComplete="address-line2" value={info.depto} onChange={e => setInfo({ ...info, depto: e.target.value })} />
                          {provinciaExpandida ? (
                            <FloatingSelect label="Provincia" autoComplete="address-level1" value={info.provincia} onChange={e => { provinciaTocada.current = true; setInfo({ ...info, provincia: e.target.value }); }}>
                              {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                            </FloatingSelect>
                          ) : (
                            <div className="flex items-center justify-between rounded-[10px] border border-border bg-foreground/[0.02] px-4 py-2.5">
                              <p className="text-[12px]"><span className="text-muted-foreground">Provincia: </span><span className="font-medium">{info.provincia}</span></p>
                              <button type="button" onClick={() => setProvinciaExpandida(true)} className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                                Cambiar
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </Panel>
              )}

              {!soloGift && !isInternational && (
              <div id="tus-datos">
              <Panel icon={User} title="Tus datos"
                sub={precargado ? 'Completamos con los datos de tu última compra' : 'La confirmación y el seguimiento van a tu mail'}
                action={precargado ? (
                  <button type="button" onClick={olvidarDatos} className="flex-shrink-0 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    ¿No sos vos?
                  </button>
                ) : undefined}
              >
                <div className="space-y-2.5">
                  <FloatingInput type="email" label="Email" required autoComplete="email" inputMode="email" {...campo('email')} value={info.email}
                    hint={sugerenciaEmail ? (
                      <button type="button" onClick={() => setInfo(i => ({ ...i, email: sugerenciaEmail }))} className="text-left text-foreground/70 hover:text-foreground">
                        ¿Quisiste decir <span className="font-semibold text-foreground underline underline-offset-2">{sugerenciaEmail}</span>?
                      </button>
                    ) : undefined}
                    onChange={e => setInfo({ ...info, email: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <FloatingInput label="Nombre" required autoComplete="given-name" {...campo('nombre')} value={info.nombre} onChange={e => setInfo({ ...info, nombre: e.target.value })} />
                    <FloatingInput label="Apellido" required autoComplete="family-name" {...campo('apellido')} value={info.apellido} onChange={e => setInfo({ ...info, apellido: e.target.value })} />
                  </div>
                  <FloatingInput label="DNI" required inputMode="numeric" hint={isSucursal ? 'Lo vas a necesitar para retirar el paquete' : 'Lo pide el correo para que tu envío llegue seguro'} {...campo('dni')} value={info.dni} onChange={e => setInfo({ ...info, dni: e.target.value })} />
                  <FloatingInput type="tel" label="Teléfono (con código de área)" required autoComplete="tel" {...campo('telefono')} value={info.telefono} onChange={e => setInfo({ ...info, telefono: e.target.value })} />
                  <Check className="mt-1" checked={info.newsletter} onChange={e => setInfo({ ...info, newsletter: e.target.checked })}>
                    Recibir novedades, drops y acceso anticipado
                  </Check>
                </div>
              </Panel>
              </div>
              )}

              <Button type="submit" variant="hype" size="ctaFull" className="rounded-[10px] gap-2">
                {isInternational ? 'Continue to payment' : 'Continuar con el pago'}
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
              </Button>
              {envioAviso && (
                <p className="text-[12px] text-destructive" aria-live="polite">{envioAviso}</p>
              )}
            </form>
          )}
          {step === 'pago' && (
            <form onSubmit={handlePagoSubmit} noValidate className={`space-y-4${isDesktop ? '' : ' pb-24'}`}>
              {/* Mobile: total y botón pegados al pie. El botón en el flujo quedaba
                  debajo de cinco medios de pago y había que ir a buscarlo. */}
              {!isDesktop && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
                  <div className="flex items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Total</p>
                      <p className="text-[17px] font-bold leading-tight tabular-nums">{formatPriceIn(montoAPagar, cobro)}</p>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      onClick={avisarSinMetodo}
                      className="ml-auto inline-flex h-12 flex-1 max-w-[230px] items-center justify-center gap-2 rounded-[10px] bg-bg-dark text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-bg-dark/85 disabled:opacity-60"
                    >
                      {submitting ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                      ) : (
                        <Lock className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                      )}
                      {submitting ? (isInternational ? 'Processing' : 'Procesando') : (isInternational ? 'Pay' : 'Pagar')}
                    </button>
                  </div>
                </div>
              )}
              <Recap
                cambiar={isInternational ? 'Change' : 'Cambiar'}
                rows={[
                  { icon: Mail, label: isInternational ? 'Contact' : 'Contacto', value: info.email, onChange: () => setStep('info') },
                  ...(soloGift
                    ? [{ icon: Gift, label: 'Entrega', value: `Gift card digital · por mail a ${info.email}` }]
                    // Retiro en sucursal: no hay domicilio cargado, el destino es la sucursal.
                    : isSucursal
                      ? []
                      : [{ icon: MapPin, label: isInternational ? 'Ship to' : 'Enviar a', value: `${info.direccion}, ${lugar(info.ciudad, info.provincia)}`, onChange: () => setStep('info') }]),
                  ...(selectedRate
                    ? [{
                        icon: Truck,
                        label: isInternational ? 'Shipping' : 'Envío',
                        value: selectedRate.label,
                        extra: selectedBranch
                          ? `${selectedBranch.label} — ${selectedBranch.direccion}`
                          : isSucursal
                            ? 'Sucursal a coordinar'
                            : undefined,
                        onChange: () => setStep('info'),
                      }]
                    : []),
                ]}
              />

              {isInternational && (
                <div className="bg-white border border-border px-4 py-3 rounded-[10px]">
                  <p className="text-[12px] text-foreground/60 leading-relaxed">
                    {CUSTOMS_NOTICE}
                  </p>
                </div>
              )}

              {/* Close Friends de @hypestyle: la comunidad. El usuario se suma a
                  mano después de la compra (panel /admin/content/close-friends). */}
              <CloseFriendsCard
                en={isInternational}
                value={pago.instagram}
                onChange={ig => setPago(p => ({ ...p, instagram: ig }))}
                onBorrador={u => { igBorrador.current = u; }}
              />

              <div id="medio-de-pago">
              <Panel icon={CreditCard} title={isInternational ? 'Payment method' : 'Medio de pago'} sub={isInternational ? 'You will finish the payment on the next screen' : 'Terminás de pagar en la pantalla siguiente'}>
                <MedioDePago
                  metodos={paymentMethods}
                  value={pago.metodo}
                  onChange={id => { setPagoSinMetodo(false); handleMetodoChange(id); }}
                  destacarSub={id => id === 'transferencia' && !isInternational}
                />
                {/* El aviso sale recién si intentó pagar sin elegir: antes aparecía
                    en rojo apenas se entraba al paso, como si ya hubiera un error. */}
                {pagoSinMetodo && !pago.metodo && <p className="text-[11px] text-destructive mt-2">{isInternational ? 'Select a payment method' : 'Seleccioná un medio de pago'}</p>}
              </Panel>
              </div>

              {submitError && <p className="text-[12px] text-destructive bg-destructive/10 px-4 py-3 rounded-[8px]">{submitError}</p>}
              {totalAjustado !== null && (
                <div className="border border-amber-300 bg-amber-50 px-4 py-3.5 rounded-[10px] space-y-2.5" aria-live="polite">
                  <p className="text-[13px] font-semibold text-amber-900">
                    {cuponCaido
                      ? (isInternational ? 'The code could not be applied' : 'El código no se pudo aplicar')
                      : (isInternational ? 'The total was updated' : 'El total se actualizó')}
                  </p>
                  <p className="text-[12px] text-amber-900/80 leading-relaxed">
                    {cuponCaido
                      ? (isInternational
                        ? <>The code <strong>{cuponCaido.code}</strong> is not valid for this order ({cuponCaido.reason}). The final total is <strong>{formatPriceIn(totalAjustado, cobro)}</strong>. Nothing was charged yet.</>
                        : <>El código <strong>{cuponCaido.code}</strong> no vale para este pedido ({cuponCaido.reason}). El total final es <strong>{formatPriceIn(totalAjustado, cobro)}</strong>. Todavía no se cobró nada.</>)
                      : (isInternational
                        ? <>A price changed while you were shopping. The final total is <strong>{formatPriceIn(totalAjustado, cobro)}</strong>. Nothing was charged yet.</>
                        : <>Algún precio cambió mientras comprabas. El total final es <strong>{formatPriceIn(totalAjustado, cobro)}</strong>. Todavía no se cobró nada.</>)}
                  </p>
                  <button type="button" onClick={confirmarTotalAjustado} disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-amber-900 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-white hover:bg-amber-800 disabled:opacity-60">
                    {isInternational ? 'Pay' : 'Pagar'} {formatPriceIn(totalAjustado, cobro)}
                  </button>
                </div>
              )}
              <div className="space-y-3 pt-1">
                {isDesktop && (
                <DynamicButton
                  type="submit"
                  width="full"
                  disabled={submitting}
                  onClick={avisarSinMetodo}
                  icon={submitting ? (
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  ) : (
                    <Lock className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                  )}
                  className="w-full justify-center bg-bg-dark text-primary-foreground px-8 py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? (isInternational ? 'Processing' : 'Procesando')
                    : `${isInternational ? 'Pay' : 'Pagar'} ${formatPriceIn(montoAPagar, cobro)}`}
                </DynamicButton>
                )}
                {isDesktop
                  ? <NotaPagoSeguro en={isInternational} />
                  : <PagoSeguroCard en={isInternational} className="bg-white" />}
                <button type="button" onClick={() => setStep('info')} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {isInternational ? 'Back' : 'Volver'}
                </button>
              </div>
            </form>
          )}
          </motion.div>
          </AnimatePresence>
          <FranjaConfianza en={isInternational} className="mt-10" />
        </div>

        {/* Order summary */}
        <div className="min-w-0">
          <div className="sticky top-6 space-y-4">
            {submitting ? (
              // Al confirmar, el resumen se convierte en la misma impresora que
              // después imprime el comprobante en /confirmacion: la orden se está
              // creando en Woo y armando el pago. Cubre los 2 a 4 segundos que
              // antes eran un spinner en el botón.
              <ReceiptPrinter stage="procesando" className="mx-auto">
                <ReceiptPrinter.Machine>
                  <ReceiptPrinter.Header>
                    <img src="/logo-hypestyle-2026.png" alt="" className="h-4 w-auto invert" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/40">
                      {isInternational ? 'New order' : 'Nuevo pedido'}
                    </span>
                  </ReceiptPrinter.Header>
                  <ReceiptPrinter.Screen>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between gap-4 font-mono text-[12px]">
                        <span className="text-white/60">{purchasableItems.length} {purchasableItems.length === 1 ? 'producto' : 'productos'}</span>
                        {/* Acá ya se está cobrando: va en la moneda del cobro, no en la de vitrina. */}
                        <strong className="text-[14px]">{formatPriceIn(totalFinal, cobro)}</strong>
                      </div>
                      <ReceiptPrinter.Status>
                        {isInternational ? 'Creating your order' : 'Creando tu pedido'}
                      </ReceiptPrinter.Status>
                    </div>
                  </ReceiptPrinter.Screen>
                </ReceiptPrinter.Machine>
              </ReceiptPrinter>
            ) : (
            <>
            {isDesktop && (
              <div className="rounded-[10px] border border-border bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em]">
                    <ShoppingBag className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    {isInternational ? 'Your order' : 'Tu pedido'}
                  </h2>
                  <span className="text-[12px] text-muted-foreground">
                    {unidades} {unidades === 1 ? (isInternational ? 'item' : 'producto') : (isInternational ? 'items' : 'productos')}
                  </span>
                </div>
                {resumen}
              </div>
            )}
            {isDesktop && <PagoSeguroCard en={isInternational} className="bg-white" />}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
