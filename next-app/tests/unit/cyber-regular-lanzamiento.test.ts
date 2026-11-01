import { describe, expect, it } from 'vitest';
import { computePackRegularDiscount, packRegularUnidades, packRegularUnidadesAlCobrar, packRegularFaltan } from '@/lib/promo-pack-regular';
import { descuentos, preciosDeLineas } from '@/lib/precio-servidor';

const colors = ['black', 'white', 'navy', 'melange', 'red'];
const scenarios = [
  { label: '18:59:59', time: '2026-11-01T18:59:59-03:00', unit: 28900, pack: 66300, totals: [28900,57800,66300,95200,124100] },
  { label: '19:00:00', time: '2026-11-01T19:00:00-03:00', unit: 25900, pack: 59900, totals: [25900,51800,59900,66300,92200] },
];
describe('Regular Cyber: carrito, checkout y cálculo servidor', () => {
  for (const s of scenarios) for (const shape of ['una linea', 'colores y talles', 'cantidades mixtas', 'mismo color distintos talles']) for (let n=1;n<=5;n++) {
    it(`${s.label}: ${n} unidades, ${shape}`, () => {
      const items = shape === 'una linea'
        ? [{ id: 'regular-tee-black', quantity: n, price: s.unit, size: 'S' }]
        : shape === 'cantidades mixtas' && n>1
          ? [{id:'regular-tee-red',quantity:n-1,price:s.unit,size:'XL'},{id:'regular-tee-black',quantity:1,price:s.unit,size:'M'}]
          : Array.from({length:n},(_,i)=>({id:`regular-tee-${shape === 'mismo color distintos talles' ? 'black' : colors[i]}`,quantity:1,price:s.unit,size:['S','M','L','XL'][i%4]}));
      const time=Date.parse(s.time);
      const subtotal=n*s.unit;
      const discount=computePackRegularDiscount(items,s.pack,packRegularUnidades(time));
      const catalog=new Map(colors.map(c=>[`regular-tee-${c}`,s.unit]));
      // El servidor reconstruye importes del catálogo, no confía en el cliente.
      const lines=preciosDeLineas(items.map(x=>({...x,price:1})),catalog);
      const server=descuentos(lines,{metodo:'mercadopago',internacional:false,campeonActivo:false,tresPorDosActivo:false,precioPackRegular:s.pack,unidadesPackRegular:packRegularUnidadesAlCobrar(time)});
      expect(subtotal-discount).toBe(s.totals[n-1]);
      expect(subtotal-server.monto).toBe(s.totals[n-1]);
      expect(server.monto).toBe(discount);
      if(n===4 && s.unit===25900) {
        expect(discount).toBe(37300);
        expect(server.etiqueta).toBe('Pack Regular x4');
        expect(packRegularFaltan(items,4)).toBe(0);
      }
    });
  }
  it('el x4 no depende de que cargue la referencia del x3',()=>{
    expect(4*25900-computePackRegularDiscount([{id:'regular-tee-red',quantity:4,price:25900}],null,4)).toBe(66300);
  });
  it('cuatro pagan 66300 incluso si el navegador conserva precios pre-Cyber',()=>{
    const lines=[{id:'regular-tee-black',quantity:4,price:28900}];
    expect(115600-computePackRegularDiscount(lines,66300,4)).toBe(66300);
  });
  it('reproduce el reporte antes de apertura: no es un conteo de dos unidades',()=>{
    const lines=[{id:'regular-tee-black',quantity:4,price:28900}];
    expect(computePackRegularDiscount(lines,66300,3)).toBe(20400);
    expect(packRegularFaltan(lines,3)).toBe(2);
  });
});
