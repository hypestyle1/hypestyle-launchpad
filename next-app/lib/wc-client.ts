const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'http://hypestyle.local';

export interface OrderItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

export interface OrderCustomer {
  email: string;
  nombre: string;
  apellido: string;
  dni?: string;
  direccion: string;
  depto?: string;
  cp: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  instagram?: string;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  customer: OrderCustomer;
  shipping: number;
  discountAmount: number;
  paymentMethod: string;
}

export interface CreateOrderResponse {
  wcOrderId: number;
  wcOrderNumber: string;
  initPoint: string | null;
  error?: string;
}

export async function createOrderAndPreference(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}
