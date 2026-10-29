import { describe, it, expect } from 'vitest';
import { MOLDES, moldeDe, moldePorId } from '@/lib/talle/moldes';
import {
  medidasCuerpo, recomendar, cmAPiesPulgadas, piesPulgadasACm, kgALb, lbAKg,
  type Cuerpo,
} from '@/lib/talle/recomendador';

const cuerpo = (p: Partial<Cuerpo> & Pick<Cuerpo, 'alturaCm' | 'pesoKg' | 'genero'>): Cuerpo => ({
  pecho: 'promedio', panza: 'promedio', cadera: 'promedio', ...p,
});

const hombre = (alturaCm: number, pesoKg: number, extra: Partial<Cuerpo> = {}) =>
  cuerpo({ alturaCm, pesoKg, genero: 'hombre', ...extra });
const mujer = (alturaCm: number, pesoKg: number, extra: Partial<Cuerpo> = {}) =>
  cuerpo({ alturaCm, pesoKg, genero: 'mujer', ...extra });

const talle = (moldeId: string, c: Cuerpo) => recomendar(moldePorId(moldeId)!, c)!.talle;

describe('medidasCuerpo', () => {
  it('clava los cuerpos de referencia con los que se calibró', () => {
    const h = medidasCuerpo(hombre(175, 72));
    expect(Math.round(h.pecho)).toBe(97);
    expect(Math.round(h.cintura)).toBe(84);
    expect(Math.round(h.cadera)).toBe(98);

    const m = medidasCuerpo(mujer(165, 60));
    expect(Math.round(m.pecho)).toBe(92);
    expect(Math.round(m.cintura)).toBe(74);
    expect(Math.round(m.cadera)).toBe(99);
  });

  it('crece con el peso y afina con la altura', () => {
    expect(medidasCuerpo(hombre(175, 90)).pecho).toBeGreaterThan(medidasCuerpo(hombre(175, 72)).pecho);
    expect(medidasCuerpo(hombre(190, 72)).pecho).toBeLessThan(medidasCuerpo(hombre(175, 72)).pecho);
  });

  it('la silueta mueve cada contorno 4 cm', () => {
    const base = medidasCuerpo(hombre(175, 72));
    expect(medidasCuerpo(hombre(175, 72, { pecho: 'ancha' })).pecho - base.pecho).toBeCloseTo(4);
    expect(medidasCuerpo(hombre(175, 72, { panza: 'angosta' })).cintura - base.cintura).toBeCloseTo(-4);
  });

  it('no se va de escala con valores absurdos', () => {
    const chico = medidasCuerpo(hombre(10, 1));
    const grande = medidasCuerpo(hombre(999, 999));
    for (const v of [chico.pecho, chico.cintura, grande.pecho, grande.cintura]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(30);
      expect(v).toBeLessThan(200);
    }
  });
});

describe('recomendar — comportamiento', () => {
  it('nunca baja de talle cuando la persona es más grande', () => {
    for (const molde of MOLDES) {
      if (molde.filas.length < 2) continue;
      const orden = molde.filas.map(f => f.talle);
      let previo = -1;
      for (const peso of [50, 60, 70, 80, 90, 100, 115, 130]) {
        const t = recomendar(molde, hombre(178, peso))!.talle;
        const i = orden.indexOf(t);
        expect(i, `${molde.id} @ ${peso}kg devolvió "${t}"`).toBeGreaterThanOrEqual(previo);
        previo = i;
      }
    }
  });

  it('siempre devuelve un talle que existe en la tabla', () => {
    for (const molde of MOLDES) {
      for (const c of [hombre(160, 55), hombre(185, 95), mujer(155, 48), mujer(175, 85)]) {
        const r = recomendar(molde, c)!;
        expect(molde.filas.map(f => f.talle)).toContain(r.talle);
        expect(r.escala).toEqual(molde.filas.map(f => f.talle));
      }
    }
  });

  it('ante la duda elige el más grande', () => {
    // La regla escrita de la marca. Un cuerpo clavado en el medio entre dos
    // talles de la remera regular: la S da 92 cm de contorno y la M 98, el
    // molde busca 2 cm de holgura, así que el punto medio exacto es un pecho
    // de 93 — que es el de alguien de 1,72 m y 65 kg. Tiene que salir M.
    const entreDos = medidasCuerpo(hombre(172, 65)).pecho;
    expect(Math.round(entreDos)).toBe(93);
    expect(talle('remera-regular', hombre(172, 65))).toBe('M');
  });

  it('respeta la holgura de diseño: el mismo cuerpo no pide un talle más en una prenda boxy', () => {
    // Una boxy ya viene cortada con 27 cm de holgura y una oversize con 19: no
    // hace falta pedir un talle más grande para que caigan sueltas. La regular,
    // que busca apenas 6, sí necesita subir.
    const c = hombre(178, 80);
    expect(talle('remera-regular', c)).toBe('L');
    expect(talle('remera-oversize', c)).toBe('M');
    expect(talle('remera-boxy', c)).toBe('M');
  });

  it('la silueta cambia el resultado', () => {
    const base = hombre(175, 72);
    const ancho = hombre(175, 72, { pecho: 'ancha' });
    const orden = ['S', 'M', 'L', 'XL'];
    expect(orden.indexOf(talle('remera-oversize', ancho)))
      .toBeGreaterThanOrEqual(orden.indexOf(talle('remera-oversize', base)));
  });

  it('explica el porqué con una lectura por eje', () => {
    const r = recomendar(moldePorId('longsleeve-oversize')!, hombre(175, 75))!;
    expect(r.lecturas.map(l => l.eje)).toEqual(['pecho', 'largo', 'manga']);
    for (const l of r.lecturas) {
      expect(l.texto.length).toBeGreaterThan(0);
      expect(['justo', 'holgado', 'ajustado']).toContain(l.estado);
    }
    expect(r.posicionPecho).toBeGreaterThanOrEqual(-1);
    expect(r.posicionPecho).toBeLessThanOrEqual(1);
  });

  it('no inventa ejes que la tabla no trae', () => {
    const r = recomendar(moldePorId('remera-regular')!, hombre(175, 75))!;
    expect(r.lecturas.some(l => l.eje === 'manga')).toBe(false);
  });

  it('con talle único no elige, solo describe', () => {
    const r = recomendar(moldePorId('top')!, mujer(165, 60))!;
    expect(r.talle).toBe('Único');
    expect(r.escala).toEqual(['Único']);
  });

  it('avisa cuando el talle recomendado no tiene stock y ofrece el más cercano', () => {
    const molde = moldePorId('remera-regular')!;
    const c = hombre(178, 80);
    const r = recomendar(molde, c, ['S', 'M'])!;
    expect(r.talle).toBe('L');
    expect(r.sinStock?.recomendado).toBe('L');
    expect(r.sinStock?.enSuLugar).toBe('M');
  });

  it('no marca falta de stock cuando el recomendado está disponible', () => {
    const r = recomendar(moldePorId('remera-regular')!, hombre(178, 80), ['L', 'XL'])!;
    expect(r.sinStock).toBeUndefined();
  });

  it('pantalones: eligen por cintura y largo', () => {
    const orden = ['S', 'M', 'L', 'XL'];
    const flaco = talle('pantalon', hombre(175, 62));
    const gordo = talle('pantalon', hombre(175, 95));
    expect(orden.indexOf(gordo)).toBeGreaterThan(orden.indexOf(flaco));
  });
});

describe('moldeDe', () => {
  it('encuentra la tabla por la imagen de guía de talles de Woo', () => {
    const u = (f: string) => `https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/${f}`;
    expect(moldeDe({ sizeGuideImage: u('2026/08/tabla-talles-regular-2026.jpg') })?.id).toBe('remera-regular');
    expect(moldeDe({ sizeGuideImage: u('2026/04/hoodie-6ee7f834733a3d53f217703156212387-1024-1024.jpg') })?.id).toBe('buzo-boxy');
    expect(moldeDe({ sizeGuideImage: u('2026/05/TABLA-TALLES-ONLY-GOD.jpg') })?.id).toBe('remera-boxy');
    expect(moldeDe({ sizeGuideImage: u('2026/04/talles-jort-1bf83f7d29c7401c9e17704903182488-1024-1024.png') })?.id).toBe('bermuda');
  });

  it('cae en categoría y fit cuando el producto no tiene tabla cargada', () => {
    expect(moldeDe({ fit: 'OVERSIZE', category: 'Tee' })?.id).toBe('remera-oversize');
    expect(moldeDe({ fit: 'REGULAR', category: 'Tee' })?.id).toBe('remera-regular');
    expect(moldeDe({ fit: 'BOXY', category: 'Hoodie' })?.id).toBe('buzo-boxy');
    expect(moldeDe({ fit: 'Baggy', category: 'Pantalón' })?.id).toBe('pantalon');
  });

  it('devuelve null cuando no hay con qué (accesorios)', () => {
    expect(moldeDe({ fit: '', category: 'Accesorio' })).toBeNull();
    expect(moldeDe({})).toBeNull();
  });

  it('todas las tablas son coherentes consigo mismas', () => {
    for (const m of MOLDES) {
      expect(m.filas.length, m.id).toBeGreaterThan(0);
      for (const f of m.filas) {
        if (m.tipo === 'arriba') expect(f.ancho, `${m.id}/${f.talle}`).toBeGreaterThan(0);
        else expect(f.cintura, `${m.id}/${f.talle}`).toBeGreaterThan(0);
        expect(f.largo, `${m.id}/${f.talle}`).toBeGreaterThan(0);
      }
      // El largo nunca baja al subir de talle.
      const largos = m.filas.map(f => f.largo!);
      expect([...largos].sort((a, b) => a - b), m.id).toEqual(largos);
    }
  });

  it('no hay dos moldes peleándose por la misma imagen', () => {
    const vistas = MOLDES.flatMap(m => m.guias);
    expect(new Set(vistas).size).toBe(vistas.length);
  });
});

describe('unidades', () => {
  it('convierte altura ida y vuelta sin derivar', () => {
    for (let cm = 150; cm <= 200; cm++) {
      const { pies, pulgadas } = cmAPiesPulgadas(cm);
      expect(pulgadas).toBeGreaterThanOrEqual(0);
      expect(pulgadas).toBeLessThan(12);
      expect(Math.abs(piesPulgadasACm(pies, pulgadas) - cm)).toBeLessThanOrEqual(2);
    }
    expect(cmAPiesPulgadas(178)).toEqual({ pies: 5, pulgadas: 10 });
  });

  it('convierte peso ida y vuelta sin derivar', () => {
    for (let kg = 45; kg <= 150; kg++) {
      expect(Math.abs(lbAKg(kgALb(kg)) - kg)).toBeLessThanOrEqual(1);
    }
    expect(kgALb(72)).toBe(159);
  });
});
