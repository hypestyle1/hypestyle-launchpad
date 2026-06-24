export const FLASH_SALE_START = new Date('2026-06-24T00:00:00-03:00');
export const FLASH_SALE_END   = new Date('2026-06-25T22:00:00-03:00');
export const FLASH_DISCOUNT   = 50;

export function isFlashSaleActive(): boolean {
  const now = Date.now();
  return now >= FLASH_SALE_START.getTime() && now < FLASH_SALE_END.getTime();
}
