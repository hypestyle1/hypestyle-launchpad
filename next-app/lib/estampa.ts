import { PDFDocument, rgb, radians, StandardFonts, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Genera los archivos de estampa (1:1, vector) de LA NUESTRA a partir del
// nombre/número de un pedido. Mismas reglas que la ficha técnica:
//  - número espalda: 1 dígito = 45 cm de alto · 2 dígitos = 30 cm de ancho
//  - número frente: 10 cm de alto
//  - nombre: 8 cm de letra, máx. 42 cm de ancho (si se pasa, se reduce)
//  - el nombre sigue el arco del vivo del canesú: radio 112 cm

const MM = 72 / 25.4; // mm -> pt
const R = {
  BACK_1DIG_H: 450, BACK_2DIG_W: 300, FRONT_H: 100,
  NAME_CAP: 80, NAME_MAX_W: 420, MARGIN: 25, GAP: 45, CANESU_R: 1120,
};
const BLACK = rgb(0.04, 0.04, 0.04);
const GRAY = rgb(0.6, 0.6, 0.6);

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
let fontCache: Uint8Array | null = null;
async function getFontBytes(): Promise<Uint8Array> {
  if (fontCache) return fontCache;
  const res = await fetch(`${SITE_URL}/Francia2006.otf`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo cargar la fuente (${res.status})`);
  fontCache = new Uint8Array(await res.arrayBuffer());
  return fontCache;
}

// Alto de mayúscula/dígito por punto de tamaño (constante de la fuente).
function capRatio(font: PDFFont, sample: string): number {
  try {
    const fk: any = (font as any).embedder?.font;
    if (fk?.unitsPerEm) {
      const run = fk.layout(sample);
      const h = run?.bbox?.height ?? 0;
      if (h > 0) return h / fk.unitsPerEm;
    }
  } catch { /* fallback */ }
  return 0.72;
}

function drawArc(page: any, font: PDFFont, text: string, size: number, ls: number, centerX: number, apexBaselineY: number, radius: number) {
  const cy = apexBaselineY - radius; // centro del círculo (abajo)
  const widths = [...text].map(c => font.widthOfTextAtSize(c, size));
  const total = widths.reduce((a, w) => a + w, 0) + ls * (text.length - 1);
  const halfAngle = total / radius / 2;
  let theta = Math.PI / 2 + halfAngle; // arranca a la izquierda y decrece
  for (let i = 0; i < text.length; i++) {
    const w = widths[i];
    const dA = w / radius;
    const cT = theta - dA / 2;
    const px = centerX + radius * Math.cos(cT);
    const py = cy + radius * Math.sin(cT);
    const phi = Math.atan2(-Math.cos(cT), Math.sin(cT)); // rotación de la letra
    const ox = px - (w / 2) * Math.cos(phi);
    const oy = py - (w / 2) * Math.sin(phi);
    page.drawText(text[i], { x: ox, y: oy, size, font, color: BLACK, rotate: radians(phi) });
    theta -= dA + ls / radius;
  }
}

async function newDoc() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await getFontBytes(), { subset: false });
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  return { doc, font, helv };
}

function caption(page: any, helv: PDFFont, text: string, pageW: number) {
  const size = 4 * MM * 0.7;
  const w = helv.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageW - w) / 2, y: R.MARGIN * MM * 0.45, size, font: helv, color: GRAY });
}

export async function generateEspalda(name: string, number: string): Promise<Uint8Array> {
  const { doc, font, helv } = await newDoc();
  const N = (name || '').toUpperCase();
  const num = (number || '').replace(/\D/g, '');
  const rUpper = capRatio(font, 'POZZI'), rDigit = capRatio(font, '0');

  // nombre
  let fsName = (R.NAME_CAP * MM) / rUpper;
  let ls = 0.08 * fsName;
  let nameW = N ? [...N].reduce((a, c) => a + font.widthOfTextAtSize(c, fsName), 0) + ls * (N.length - 1) : 0;
  if (nameW > R.NAME_MAX_W * MM) { const k = (R.NAME_MAX_W * MM) / nameW; fsName *= k; ls *= k; nameW = R.NAME_MAX_W * MM; }
  const nameCap = rUpper * fsName;

  // número
  const oneDig = num.length <= 1;
  let fsNum: number, numCap: number, numW: number;
  if (oneDig) { fsNum = (R.BACK_1DIG_H * MM) / rDigit; numCap = R.BACK_1DIG_H * MM; numW = font.widthOfTextAtSize(num, fsNum); }
  else { const w1 = font.widthOfTextAtSize(num, 1); fsNum = (R.BACK_2DIG_W * MM) / w1; numW = R.BACK_2DIG_W * MM; numCap = rDigit * fsNum; }

  const rad = R.CANESU_R * MM;
  const halfAngle = nameW / rad / 2;
  const sag = rad * (1 - Math.cos(halfAngle));
  const margin = R.MARGIN * MM, gap = R.GAP * MM, capH = 18;

  const pageW = Math.max(nameW, numW) + 2 * margin;
  const pageH = 2 * margin + capH + nameCap + sag + gap + numCap;
  const page = doc.addPage([pageW, pageH]);

  const apexBaselineY = pageH - margin - nameCap;
  if (N) drawArc(page, font, N, fsName, ls, pageW / 2, apexBaselineY, rad);
  const numBaseline = margin + capH;
  page.drawText(num, { x: (pageW - numW) / 2, y: numBaseline, size: fsNum, font, color: BLACK });
  caption(page, helv, `LA NUESTRA · ESPALDA · ${oneDig ? 'numero ' + R.BACK_1DIG_H / 10 + ' cm alto' : 'numero ' + R.BACK_2DIG_W / 10 + ' cm ancho'} · nombre ${(nameCap / MM / 10).toFixed(1)} cm · arco vivo r=112cm · imprimir 100%`, pageW);

  return doc.save();
}

export async function generateFrente(number: string): Promise<Uint8Array> {
  const { doc, font, helv } = await newDoc();
  const num = (number || '').replace(/\D/g, '');
  const rDigit = capRatio(font, '0');
  const fsNum = (R.FRONT_H * MM) / rDigit;
  const numCap = R.FRONT_H * MM;
  const numW = font.widthOfTextAtSize(num, fsNum);
  const margin = R.MARGIN * MM, capH = 18;
  const pageW = numW + 2 * margin;
  const pageH = 2 * margin + capH + numCap;
  const page = doc.addPage([pageW, pageH]);
  page.drawText(num, { x: (pageW - numW) / 2, y: margin + capH, size: fsNum, font, color: BLACK });
  caption(page, helv, `LA NUESTRA · FRENTE · numero ${R.FRONT_H / 10} cm · imprimir 100%`, pageW);
  return doc.save();
}

export async function generateEstampas(name: string, number: string) {
  const [espalda, frente] = await Promise.all([generateEspalda(name, number), generateFrente(number)]);
  return { espalda, frente };
}
