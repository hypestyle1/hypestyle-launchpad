// map con concurrencia acotada: WordPress (Hostinger) devuelve 500 esporádicos
// cuando recibe decenas de requests simultáneos (ver pedidos mayoristas de 35
// ítems), así que nunca hay que hacer fan-out ilimitado contra la API de WC.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
