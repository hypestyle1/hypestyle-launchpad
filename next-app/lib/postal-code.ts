/**
 * Normalización del código postal argentino.
 *
 * Andreani solo acepta el código postal numérico de 4 dígitos. Si el cliente
 * escribe el CPA completo — formato "C1414DNV": letra de provincia + 4 dígitos
 * + 3 letras de manzana, que es el que figura en el DNI y el que mucha gente
 * copia — la API de sucursales devuelve 400 y el checkout se queda sin
 * sucursales para ofrecer. Con "1414" devuelve 15.
 *
 * Se aplica solo a Argentina: los ZIP internacionales tienen letras válidas
 * (ej. "SW1A 1AA") y romperlos sería peor que dejarlos como están.
 */
export function normalizeCpAr(raw: string | null | undefined): string {
  const clean = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cuatroDigitos = clean.match(/\d{4}/);
  return cuatroDigitos ? cuatroDigitos[0] : clean;
}
