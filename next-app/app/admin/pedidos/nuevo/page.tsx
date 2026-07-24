'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

type CustomerHit = {
  id: number; name: string; email: string; isMayorista: boolean; dni: string;
  billing: { first_name: string; last_name: string; phone: string; company: string; address_1: string; address_2: string; city: string; state: string; postcode: string };
};

type ProductHit = { id: number; name: string; image: string };
type Variation = { id: number | null; size: string; price: number; manageStock: boolean; stock: number | null };

type CartItem = {
  key: string; productId: number; variationId: number | null; name: string; size: string;
  quantity: number; regularPrice: number; retailPrice: number;
};

const EMPTY_BILLING = {
  first_name: '', last_name: '', email: '', phone: '', company: '',
  address_1: '', address_2: '', city: '', state: '', postcode: '',
};

export default function NuevoPedidoPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [isMayorista, setIsMayorista] = useState(false);
  const [status, setStatus] = useState<'processing' | 'on-hold'>('processing');

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([]);
  const [billing, setBilling] = useState({ ...EMPTY_BILLING });
  const [dni, setDni] = useState('');
  const [viaCargoSucursal, setViaCargoSucursal] = useState('');
  const [instagram, setInstagram] = useState('');

  const [productCatalog, setProductCatalog] = useState<ProductHit[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductHit | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null | 'none'>('none');
  const [addQty, setAddQty] = useState(1);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingTotal, setShippingTotal] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<{ orderId: number; orderNumber: string; total: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey) return;
    fetch('/api/admin/product-costs', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProductCatalog(data.products || []); })
      .catch(() => {});
  }, [authed, adminKey]);

  useEffect(() => {
    if (!authed || !adminKey || customerQuery.length < 2 || customerId) { setCustomerHits([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerQuery)}`, { headers: { 'x-admin-key': adminKey } })
        .then(r => r.json())
        .then(data => setCustomerHits(data.customers || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [authed, adminKey, customerQuery, customerId]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  function selectCustomer(c: CustomerHit) {
    setCustomerId(c.id);
    setCustomerQuery(c.name);
    setCustomerHits([]);
    setBilling({ ...c.billing, email: c.email });
    setDni(c.dni);
    setIsMayorista(c.isMayorista);
  }

  function clearCustomer() {
    setCustomerId(null);
    setCustomerQuery('');
    setBilling({ ...EMPTY_BILLING });
    setDni('');
  }

  function selectProduct(p: ProductHit) {
    setSelectedProduct(p);
    setProductQuery(p.name);
    setVariations([]);
    setSelectedVariationId('none');
    fetch(`/api/admin/products/${p.id}/variations`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(data => {
        const vs: Variation[] = data.variations || [];
        setVariations(vs);
        if (vs.length === 1 && !vs[0].size) setSelectedVariationId(vs[0].id);
      });
  }

  function addToCart() {
    if (!selectedProduct || selectedVariationId === 'none' || addQty < 1) return;
    const v = variations.find(v => v.id === selectedVariationId) || variations[0];
    if (!v) return;
    const key = `${selectedProduct.id}-${selectedVariationId ?? 'simple'}`;
    setCart(prev => {
      const existing = prev.find(c => c.key === key);
      if (existing) {
        return prev.map(c => c.key === key ? { ...c, quantity: c.quantity + addQty } : c);
      }
      return [...prev, {
        key, productId: selectedProduct.id, variationId: selectedVariationId,
        name: selectedProduct.name, size: v.size, quantity: addQty,
        regularPrice: v.price, retailPrice: v.price,
      }];
    });
    setSelectedProduct(null); setProductQuery(''); setVariations([]); setSelectedVariationId('none'); setAddQty(1);
  }

  function removeFromCart(key: string) {
    setCart(prev => prev.filter(c => c.key !== key));
  }

  function unitPriceFor(item: CartItem) {
    return isMayorista ? Math.round(item.regularPrice * 0.5) : item.retailPrice;
  }

  const filteredProducts = productQuery.length > 1 && !selectedProduct
    ? productCatalog.filter(p => p.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 8)
    : [];

  const subtotal = cart.reduce((s, i) => s + unitPriceFor(i) * i.quantity, 0);
  const shippingNum = Number(shippingTotal) || 0;
  const total = subtotal + shippingNum;

  async function submit() {
    if (!billing.first_name || !billing.last_name || cart.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          isMayorista,
          customerId: customerId || undefined,
          billing,
          dni: dni || undefined,
          viaCargoSucursal: viaCargoSucursal || undefined,
          instagram: instagram || undefined,
          items: cart.map(c => ({ productId: c.productId, variationId: c.variationId, quantity: c.quantity })),
          shippingTotal: shippingNum,
          status,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || 'No se pudo crear el pedido'); return; }
      setCreated({ orderId: data.orderId, orderNumber: data.orderNumber, total: data.total });
    } catch {
      setSubmitError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 text-center mb-4">Clave de administrador</p>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button onClick={login} className="w-full bg-black text-white rounded-md py-2 text-[13px] font-semibold hover:bg-gray-900">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (created) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
          <div className="text-[13px] text-gray-400 uppercase tracking-wide">Pedido creado</div>
          <div className="text-2xl font-bold mt-1">#{created.orderNumber}</div>
          <div className="text-[14px] text-gray-600 mt-2">{fmt(parseFloat(created.total))}</div>
          <div className="flex flex-col gap-2 mt-6">
            <Link href={`/admin/pedidos/${created.orderId}`} className="bg-black text-white rounded-lg py-2.5 text-[13px] font-semibold hover:bg-gray-800">
              Ver pedido
            </Link>
            <Link href={`/admin/pedidos/${created.orderId}/rotulo`} className="border border-gray-200 rounded-lg py-2.5 text-[13px] font-semibold hover:border-gray-400">
              Imprimir rótulo
            </Link>
            <button
              onClick={() => {
                setCreated(null); setCart([]); clearCustomer(); setNote(''); setShippingTotal('');
              }}
              className="text-[12px] text-gray-500 hover:text-black mt-2"
            >
              Cargar otro pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin/pedidos" className="text-gray-400 hover:text-black transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
        <span className="text-gray-300">|</span>
        <span className="text-[14px] font-semibold text-gray-900">Cargar pedido manual</span>
      </div>

      <div className="max-w-[720px] mx-auto px-4 py-6 space-y-4">
        {/* Tipo de pedido */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Tipo de pedido</h2>
          <div className="flex gap-2">
            {[{ v: false, label: 'Minorista' }, { v: true, label: 'Mayorista' }].map(opt => (
              <button
                key={String(opt.v)}
                onClick={() => setIsMayorista(opt.v)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
                  isMayorista === opt.v ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {isMayorista && <p className="text-[11px] text-gray-400 mt-2">Los productos se cargan al 50% del precio de lista.</p>}
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Cliente</h2>
          <div className="relative mb-3">
            <input
              type="text"
              value={customerQuery}
              onChange={e => { setCustomerQuery(e.target.value); if (customerId) setCustomerId(null); }}
              placeholder="Buscar cliente existente por nombre o email…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400"
            />
            {customerHits.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {customerHits.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-400"> · {c.email}</span>
                    </span>
                    {c.isMayorista && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">Mayorista</span>}
                  </button>
                ))}
              </div>
            )}
            {customerId && (
              <button onClick={clearCustomer} className="text-[11px] text-gray-400 hover:text-red-500 mt-1">
                ✕ Quitar cliente seleccionado, cargar a mano
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Nombre" value={billing.first_name} onChange={e => setBilling(b => ({ ...b, first_name: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Apellido" value={billing.last_name} onChange={e => setBilling(b => ({ ...b, last_name: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Email" value={billing.email} onChange={e => setBilling(b => ({ ...b, email: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Teléfono" value={billing.phone} onChange={e => setBilling(b => ({ ...b, phone: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="DNI" value={dni} onChange={e => setDni(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Instagram (opcional)" value={instagram} onChange={e => setInstagram(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Dirección" value={billing.address_1} onChange={e => setBilling(b => ({ ...b, address_1: e.target.value }))} className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Ciudad" value={billing.city} onChange={e => setBilling(b => ({ ...b, city: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Provincia" value={billing.state} onChange={e => setBilling(b => ({ ...b, state: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="CP" value={billing.postcode} onChange={e => setBilling(b => ({ ...b, postcode: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
            <input placeholder="Sucursal Via Cargo (opcional)" value={viaCargoSucursal} onChange={e => setViaCargoSucursal(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Productos</h2>
          <div className="relative">
            <input
              type="text"
              value={productQuery}
              onChange={e => { setProductQuery(e.target.value); setSelectedProduct(null); }}
              placeholder="Buscar producto por nombre…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400"
            />
            {filteredProducts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => selectProduct(p)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-gray-50">
                    {p.image && <img src={p.image} alt="" className="w-6 h-6 rounded object-cover flex-none" />}
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-2 mt-2">
              {variations.length > 1 || (variations.length === 1 && variations[0].size) ? (
                <select
                  value={selectedVariationId === 'none' ? '' : String(selectedVariationId)}
                  onChange={e => setSelectedVariationId(e.target.value ? Number(e.target.value) : 'none')}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-gray-400"
                >
                  <option value="">Talle...</option>
                  {variations.map(v => (
                    <option key={v.id} value={v.id ?? ''}>{v.size} — {fmt(v.price)}{v.manageStock ? ` (stock: ${v.stock})` : ''}</option>
                  ))}
                </select>
              ) : null}
              <input type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, Number(e.target.value)))} className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-gray-400" />
              <button
                onClick={addToCart}
                disabled={selectedVariationId === 'none'}
                className="px-3 py-1.5 bg-black text-white rounded-lg text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-40 whitespace-nowrap"
              >
                Agregar
              </button>
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-4 divide-y divide-gray-50 border-t border-gray-100">
              {cart.map(item => (
                <div key={item.key} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{item.name}</div>
                    <div className="text-[11px] text-gray-400">{item.size ? `Talle ${item.size} · ` : ''}{fmt(unitPriceFor(item))} × {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    <span className="text-[13px] font-semibold">{fmt(unitPriceFor(item) * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.key)} className="text-gray-300 hover:text-red-500 text-[13px]">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Envío / estado / nota */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-[12px] text-gray-500 w-24">Envío</label>
            <input type="number" min={0} value={shippingTotal} onChange={e => setShippingTotal(e.target.value)} placeholder="0" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[12px] text-gray-500 w-24">Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'processing' | 'on-hold')} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400">
              <option value="processing">Procesando (pagado)</option>
              <option value="on-hold">En espera</option>
            </select>
          </div>
          <div className="flex items-start gap-3">
            <label className="text-[12px] text-gray-500 w-24 pt-2">Nota</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ej: Canje talle L por M" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400 resize-y" />
          </div>
        </div>

        {/* Total + submit */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="flex justify-between text-[12px] text-gray-500 mb-1">
            <span>Subtotal</span><span>{fmt(subtotal)}</span>
          </div>
          {shippingNum > 0 && (
            <div className="flex justify-between text-[12px] text-gray-500 mb-1">
              <span>Envío</span><span>{fmt(shippingNum)}</span>
            </div>
          )}
          <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-gray-100">
            <span>Total</span><span>{fmt(total)}</span>
          </div>

          {submitError && <p className="text-[12px] text-red-500 mt-3">{submitError}</p>}

          <button
            onClick={submit}
            disabled={submitting || !billing.first_name || !billing.last_name || cart.length === 0}
            className="w-full mt-4 bg-black text-white rounded-lg py-3 text-[13px] font-semibold hover:bg-gray-800 disabled:opacity-40"
          >
            {submitting ? 'Creando pedido...' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
