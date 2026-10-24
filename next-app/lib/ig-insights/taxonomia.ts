/**
 * TAXONOMÍA EDITORIAL v1 — fuente única de verdad del panel.
 *
 * Congelada el 24/10/2026 (doc 19 de la propuesta, aprobado). Cinco vocabularios
 * cerrados, cada uno con una pregunta distinta:
 *
 *   category      para qué existe la publicación (función editorial)
 *   coverType     qué se ve en la portada
 *   visualStyle   cómo está hecha la imagen
 *   scenario      dónde pasa
 *   hasModels     si hay personas
 *
 * El FORMATO no está acá a propósito: sale de campos observados
 * (`mediaProductType`, `mediaType`, `isSharedToFeed`) y no se clasifica a mano
 * (ver `formatoDe` en components/admin/intelligence/bits.tsx).
 *
 * Los valores y las definiciones son EXACTAMENTE los del gold set
 * (`_claude/propuestas/_content-intelligence-2026-10-17/gold-set/`), que es
 * donde se toman las 30 decisiones humanas de referencia. Si un valor cambia
 * acá y no allá, el gold set deja de medir lo mismo: sube `TAXONOMY_VERSION` y
 * se hace un gold set v2, no se reescribe el v1.
 *
 * El espejo de este archivo para el skill está en
 * `.claude/skills/hype-content-intelligence/lib/analisis.mjs` (`VOCABULARIO`), y
 * hay un test de paridad que falla si se separan.
 */

export const TAXONOMY_VERSION = 1;

type Opcion = {
  /** Valor que viaja a la base. Nunca se traduce. */
  valor: string;
  /** Etiqueta de pantalla. */
  label: string;
  /** Definición de una línea (la misma que ve quien clasifica). */
  def: string;
};

export type DimensionKey = 'category' | 'coverType' | 'visualStyle' | 'scenario' | 'hasModels';

export type Dimension = {
  campo: DimensionKey;
  titulo: string;
  ayuda: string;
  opciones: Opcion[];
};

/** Vacío = "sin clasificar" en las cinco dimensiones; nunca está en `opciones`. */
export const SIN_CLASIFICAR = '';

export const DIMENSIONES: Dimension[] = [
  {
    campo: 'category',
    titulo: 'Categoría de contenido',
    ayuda: 'Para qué existe la publicación.',
    opciones: [
      { valor: 'producto', label: 'Producto', def: 'Muestra la prenda para que se entienda y se compre: color, fit, detalle, precio' },
      { valor: 'drop', label: 'Drop', def: 'Anuncia o lanza: fecha, preventa, restock, últimas unidades, SALE' },
      { valor: 'editorial', label: 'Editorial', def: 'Construye marca: moda, actitud, clima. La prenda es vestuario, no explicación' },
      { valor: 'comunidad', label: 'Comunidad', def: 'Gente real de Hype: clientes, artistas, UGC, visto en' },
      { valor: 'cultura', label: 'Cultura', def: 'Música, deporte, barrio, referencias. No vende' },
      { valor: 'proceso', label: 'Proceso', def: 'Cómo se hace: estampa, taller, depósito, packaging, backstage' },
      { valor: 'institucional', label: 'Institucional', def: 'Avisos operativos: envíos, horarios, local, políticas, mayoristas' },
      { valor: 'otro', label: 'No encaja', def: 'Se vio y no entra en ninguna' },
    ],
  },
  {
    campo: 'coverType',
    titulo: 'Tipo de portada',
    ayuda: 'Qué se ve en la imagen que aparece en la grilla. Es la dimensión de la pregunta fundante.',
    opciones: [
      { valor: 'producto-piso', label: 'Producto en piso', def: 'Prenda acostada vista desde arriba, sin persona' },
      { valor: 'producto-detalle', label: 'Detalle de producto', def: 'Macro: estampa, cuello, textura' },
      { valor: 'producto-estudio', label: 'Producto en estudio', def: 'Prenda sola sobre fondo limpio o colgada' },
      { valor: 'modelo-editorial', label: 'Modelo editorial', def: 'Persona vestida, la foto construye clima' },
      { valor: 'modelo-producto', label: 'Modelo + producto', def: 'Persona mostrando la prenda, el producto es el foco' },
      { valor: 'grafica', label: 'Gráfica', def: 'Tipografía, lettering, placa de texto' },
      { valor: 'escena', label: 'Escena', def: 'Varias prendas u objetos, o un espacio' },
      { valor: 'otro', label: 'No encaja', def: 'Se ve y no entra en ninguna' },
    ],
  },
  {
    campo: 'visualStyle',
    titulo: 'Estilo visual',
    ayuda: 'Cómo está hecha la imagen.',
    opciones: [
      { valor: 'luz-natural', label: 'Luz natural', def: 'Día, sol, sombra, ventana' },
      { valor: 'estudio', label: 'Estudio', def: 'Luz armada, fondo limpio' },
      { valor: 'flash', label: 'Flash', def: 'Flash directo, sombras duras, look digicam' },
      { valor: 'nocturna', label: 'Nocturna', def: 'Poca luz, calle de noche, neón' },
      { valor: 'grafica-digital', label: 'Gráfica digital', def: 'Diseño sobre la imagen o pieza digital' },
      { valor: 'archivo', label: 'Archivo', def: 'Material viejo, baja resolución, captura' },
      { valor: 'ia-asistido', label: 'IA asistido', def: 'Generado o retocado con IA, y se ve' },
      { valor: 'otro', label: 'No encaja', def: 'Se ve y no entra en ninguna' },
    ],
  },
  {
    campo: 'scenario',
    titulo: 'Escenario',
    ayuda: 'Sin escenario es la respuesta correcta para flatlays y gráficas: no hay lugar.',
    opciones: [
      { valor: 'calle', label: 'Calle', def: 'Vereda, asfalto, muro, esquina' },
      { valor: 'interior-casa', label: 'Interior / casa', def: 'Casa, depto, cuarto' },
      { valor: 'local', label: 'Local', def: 'Palermo: salón, probador, mostrador' },
      { valor: 'taller', label: 'Taller', def: 'Estampa, costura, depósito, packaging' },
      { valor: 'estudio', label: 'Estudio', def: 'Set fotográfico armado' },
      { valor: 'exterior-natural', label: 'Exterior natural', def: 'Campo, playa, parque, agua' },
      { valor: 'evento', label: 'Evento', def: 'Recital, fiesta, cancha, feria' },
      { valor: 'sin-escenario', label: 'Sin escenario', def: 'Fondo neutro, flatlay, gráfica' },
      { valor: 'otro', label: 'No encaja', def: 'Hay un lugar y no supimos cuál' },
    ],
  },
  {
    campo: 'hasModels',
    titulo: 'Presencia de modelos',
    ayuda: 'Un maniquí no es una persona. Una persona dentro de un cuadro o una pantalla tampoco.',
    opciones: [
      { valor: 'no', label: 'No hay personas', def: 'Ni manos ni pies' },
      { valor: 'si-rostro', label: 'Sí, con rostro', def: 'Rostro visible e identificable' },
      { valor: 'si-sin-rostro', label: 'Sí, sin rostro', def: 'De espaldas, cortado, sólo manos o piernas' },
      { valor: 'grupo', label: 'Grupo', def: 'Dos o más personas' },
      { valor: 'otro', label: 'No se puede determinar', def: 'Multitud borrosa, reflejo' },
    ],
  },
];

const porCampo = (campo: DimensionKey): Dimension => {
  const d = DIMENSIONES.find((x) => x.campo === campo);
  if (!d) throw new Error(`Dimensión desconocida: ${campo}`);
  return d;
};

const valoresDe = (campo: DimensionKey): string[] => porCampo(campo).opciones.map((o) => o.valor);

const labelsDe = (campo: DimensionKey): Record<string, string> =>
  Object.fromEntries(porCampo(campo).opciones.map((o) => [o.valor, o.label]));

/** Vocabularios cerrados, sin el vacío. En el mismo orden que el gold set. */
export const VOCABULARIO: Record<DimensionKey, string[]> = {
  category: valoresDe('category'),
  coverType: valoresDe('coverType'),
  visualStyle: valoresDe('visualStyle'),
  scenario: valoresDe('scenario'),
  hasModels: valoresDe('hasModels'),
};

export const CATEGORIA_LABELS = labelsDe('category');
export const PORTADA_LABELS = labelsDe('coverType');
export const ESTILO_LABELS = labelsDe('visualStyle');
export const ESCENARIO_LABELS = labelsDe('scenario');
export const MODELOS_LABELS = labelsDe('hasModels');

/** Sin clasificar es válido en las cinco dimensiones. */
export const esValor = (campo: DimensionKey, valor: string): boolean =>
  valor === SIN_CLASIFICAR || VOCABULARIO[campo].includes(valor);

/**
 * Única regla de coherencia entre dimensiones (doc 19 §1): si la imagen se
 * declara hecha con IA, el uso de IA no puede ser `none`. Al revés no: se puede
 * usar IA sin que se vea.
 */
export const coherenciaIa = (visualStyle: string, aiUsage: string): boolean =>
  visualStyle !== 'ia-asistido' || aiUsage === 'assisted' || aiUsage === 'generated';

/**
 * MEZCLA EDITORIAL OBJETIVO — aprobada el 24/10/2026.
 *
 * Son objetivos ORIENTATIVOS, no cuotas: el sistema señala desvíos para
 * conversarlos y nunca corrige la planificación solo.
 */
export const MEZCLA_OBJETIVO: Record<string, number> = {
  producto: 0.3,
  editorial: 0.2,
  drop: 0.15,
  comunidad: 0.15,
  proceso: 0.1,
  cultura: 0.05,
  institucional: 0.05,
};
