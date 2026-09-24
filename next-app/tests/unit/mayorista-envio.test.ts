import { describe, it, expect } from 'vitest';
import { validarEnvio, envioResumen, envioDeOrden, envioOrderMeta } from '@/lib/mayorista-envio';

const metaFn = (m: Record<string, string>) => (k: string) => m[k] ?? '';

describe('validarEnvio', () => {
  it('exige sucursal en Via Cargo y Andreani sucursal', () => {
    expect(validarEnvio('via_cargo', '')).toMatch(/sucursal de via cargo/);
    expect(validarEnvio('andreani_sucursal', '  ')).toMatch(/sucursal de andreani/);
    expect(validarEnvio('via_cargo', 'Olavarría')).toBeNull();
  });
  it('Andreani a domicilio y expreso no piden destino', () => {
    expect(validarEnvio('andreani_domicilio', '')).toBeNull();
    expect(validarEnvio('expreso', '')).toBeNull();
  });
  it('rechaza un método desconocido', () => {
    expect(validarEnvio('moto', 'x')).not.toBeNull();
    expect(validarEnvio(undefined, 'x')).not.toBeNull();
  });
});

describe('envioResumen', () => {
  it('arma la línea corta', () => {
    expect(envioResumen('via_cargo', 'Olavarría centro')).toBe('Via Cargo — a sucursal · Olavarría centro');
    expect(envioResumen('andreani_domicilio', 'ignorado')).toBe('Andreani — a domicilio');
    expect(envioResumen('expreso', 'TAS')).toBe('Expreso a coordinar · TAS');
    expect(envioResumen('expreso', '')).toBe('Expreso a coordinar (a definir)');
  });
});

describe('envioDeOrden', () => {
  it('lee las órdenes nuevas', () => {
    expect(envioDeOrden(metaFn({ _envio_metodo: 'expreso', _envio_destino: 'TAS' })).resumen).toBe('Expreso a coordinar · TAS');
  });
  it('las viejas con solo _via_cargo_sucursal son Via Cargo', () => {
    const r = envioDeOrden(metaFn({ _via_cargo_sucursal: 'Tandil' }));
    expect(r.metodo).toBe('via_cargo');
    expect(r.destino).toBe('Tandil');
  });
  it('sin nada, vacío', () => {
    expect(envioDeOrden(metaFn({})).metodo).toBeNull();
    expect(envioDeOrden(metaFn({})).resumen).toBe('');
  });
});

describe('envioOrderMeta', () => {
  it('Via Cargo sigue escribiendo la meta vieja', () => {
    expect(envioOrderMeta('via_cargo', ' X ').map(m => m.key)).toContain('_via_cargo_sucursal');
    expect(envioOrderMeta('andreani_domicilio', '').map(m => m.key)).not.toContain('_via_cargo_sucursal');
  });
});
