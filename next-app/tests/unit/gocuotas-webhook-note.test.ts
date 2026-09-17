import { describe, it, expect } from 'vitest';
import { gocuotasWebhookNote } from '@/lib/gocuotas-webhook-note';

/**
 * La nota es lo único que queda de lo que devolvió GOcuotas. Audit del
 * 17/09/2026: 31 pedidos failed y ningún registro de por qué.
 */
describe('gocuotasWebhookNote', () => {
  const now = new Date('2026-09-16T15:40:58Z');

  it('anota estado, operación, cuotas y minutos desde la creación', () => {
    const note = gocuotasWebhookNote(
      { order_reference_id: '3210', status: 'denied', order_id: 987654, number_of_installments: 4, amount_in_cents: 9880169 },
      '2026-09-16T15:09:10', now,
    );
    expect(note).toBe('GOcuotas webhook — status=denied · order_id=987654 · number_of_installments=4 · amount_in_cents=9880169 · a los 32 min de creado el pedido');
  });

  it('de un campo desconocido anota el nombre, nunca el valor', () => {
    const note = gocuotasWebhookNote({ status: 'approved', card_holder: 'Juan Perez', extra: { a: 1 } }, null, now);
    expect(note).toContain('otros campos: card_holder, extra');
    expect(note).not.toContain('Juan');
  });

  it('sin status lo dice, y no rompe con fechas raras', () => {
    expect(gocuotasWebhookNote({ order_reference_id: '1' }, 'no-es-fecha', now)).toBe('GOcuotas webhook — status=(sin status)');
  });

  it('recorta valores largos y saltos de línea', () => {
    const note = gocuotasWebhookNote({ status: 'denied', message: 'x'.repeat(300) + '\nfin' }, null, now);
    expect(note.length).toBeLessThan(140);
    expect(note).not.toContain('\n');
  });
});
