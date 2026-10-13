import { describe, it, expect } from 'vitest';
import { pagoInfoFromEnv, isPagoConfigured, pagoDetailLines, pagoSteps, pagoHtml } from '@/lib/mayorista-pago';

// "Cómo pagar" del pedido mayorista. Los datos de la cuenta salen del entorno
// y nunca se inventan: sin alias ni CBU, el bloque manda a WhatsApp.

const full = { MAYORISTA_PAGO_ALIAS: 'hype.mayoristas', MAYORISTA_PAGO_CBU: '0000003100012345678901', MAYORISTA_PAGO_TITULAR: 'Hype SRL', MAYORISTA_PAGO_CUIT: '30-11111111-1', MAYORISTA_PAGO_BANCO: 'Banco Test', MAYORISTA_PAGO_PLAZO_RESERVA_DIAS: '3' };

describe('pagoInfoFromEnv', () => {
  it('lee las variables y limpia espacios y BOM', () => {
    expect(pagoInfoFromEnv({ ...full, MAYORISTA_PAGO_ALIAS: '﻿ hype.mayoristas ' })).toEqual({
      alias: 'hype.mayoristas', cbu: '0000003100012345678901', titular: 'Hype SRL', cuit: '30-11111111-1', banco: 'Banco Test', plazoReservaDias: 3,
    });
  });
  it('sin variables: todo null y no configurado', () => {
    const info = pagoInfoFromEnv({});
    expect(info).toEqual({ alias: null, cbu: null, titular: null, cuit: null, banco: null, plazoReservaDias: null });
    expect(isPagoConfigured(info)).toBe(false);
  });
  it('plazo inválido (texto, 0, negativo) queda null', () => {
    for (const v of ['abc', '0', '-2', '1.5', '']) expect(pagoInfoFromEnv({ MAYORISTA_PAGO_PLAZO_RESERVA_DIAS: v }).plazoReservaDias).toBeNull();
  });
  it('con alias solo ya está configurado', () => {
    expect(isPagoConfigured(pagoInfoFromEnv({ MAYORISTA_PAGO_ALIAS: 'x.y' }))).toBe(true);
  });
});

describe('pagoDetailLines / pagoSteps', () => {
  it('solo las líneas cargadas, en orden', () => {
    expect(pagoDetailLines(pagoInfoFromEnv({ MAYORISTA_PAGO_CBU: '123', MAYORISTA_PAGO_BANCO: 'B' })).map(l => l.label)).toEqual(['CBU / CVU', 'Banco']);
    expect(pagoDetailLines(pagoInfoFromEnv({}))).toEqual([]);
  });
  it('configurado: pide el comprobante; sin configurar: manda los datos por WhatsApp', () => {
    expect(pagoSteps(pagoInfoFromEnv(full))[0]).toContain('cuenta de abajo');
    expect(pagoSteps(pagoInfoFromEnv({}))[0]).toContain('por WhatsApp');
  });
  it('el plazo de reserva se lee del entorno; sin plazo, la frase genérica', () => {
    expect(pagoSteps(pagoInfoFromEnv(full))[2]).toContain('más de 3 días');
    expect(pagoSteps(pagoInfoFromEnv({ ...full, MAYORISTA_PAGO_PLAZO_RESERVA_DIAS: '1' }))[2]).toContain('más de 1 día.');
    expect(pagoSteps(pagoInfoFromEnv({}))[2]).toContain('por más de unos días');
  });
});

describe('pagoHtml', () => {
  it('lleva el número de pedido, los pasos, los datos y el link de WhatsApp', () => {
    const html = pagoHtml(pagoInfoFromEnv(full), '5001');
    expect(html).toContain('Cómo pagar el pedido #5001');
    expect(html).toContain('hype.mayoristas');
    expect(html).toContain('0000003100012345678901');
    expect(html).toContain('wa.me/5491178292430');
  });
  it('escapa HTML en los valores del entorno', () => {
    const html = pagoHtml(pagoInfoFromEnv({ MAYORISTA_PAGO_ALIAS: 'a<script>b' }), '<1>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('a&lt;script&gt;b');
    expect(html).toContain('#&lt;1&gt;');
  });
});
