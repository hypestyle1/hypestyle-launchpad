import { NextRequest, NextResponse } from 'next/server';
import { normalizeCpAr } from '@/lib/postal-code';

// Credencial ID del plugin Andreani de WooCommerce (campo hash_andreani).
// Sirve tanto para el header x-andreani-session de la API vieja como para
// el Authorization del Login de la API nueva.
const ANDREANI_HASH =
  process.env.ANDREANI_SESSION_TOKEN ||
  'UHltZXx6cE13TnJReG1DWkVMTDhWRjFwNGljdmVXaXRpd1lqcDlJalRBakUxYjFNPQ==';

const API_BASE = 'https://woocommerce-api-acom.andreani.com';

interface AndreaniBranch {
  Codigo: string;
  Numero: number;
  Descripcion: string;
  Direccion: {
    CodigoPostal: number;
    Provincia: string;
    Calle: string;
    Numero: string;
    Localidad: string;
  };
}

// El accessToken dura bastante, así que se cachea en memoria para no pegarle
// al Login en cada búsqueda. Si vence, el flujo de abajo reintenta una vez.
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_TTL_MS = 45 * 60 * 1000;

async function login(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/v1/Login`, {
    method: 'POST',
    headers: { Authorization: ANDREANI_HASH, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('[andreani-branches] login error', res.status);
    return null;
  }

  const data = await res.json();
  const token: string | undefined = data?.response?.accessToken;
  if (!token) {
    console.error('[andreani-branches] login sin accessToken');
    return null;
  }

  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

async function getToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  return login();
}

async function fetchBranches(cp: string, token: string) {
  return fetch(`${API_BASE}/api/v1/Branch?postalCode=${encodeURIComponent(cp)}`, {
    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
}

export async function GET(req: NextRequest) {
  // El CPA completo ("C1414DNV") hace que Andreani responda 400: pide los 4 dígitos.
  const cp = normalizeCpAr(new URL(req.url).searchParams.get('cp'));
  if (!cp) return NextResponse.json({ branches: [], error: 'cp requerido' }, { status: 400 });

  try {
    let token = await getToken();
    if (!token) {
      return NextResponse.json({ branches: [], error: 'Andreani auth' }, { status: 502 });
    }

    let res = await fetchBranches(cp, token);

    // Token vencido: reintentar una vez con uno nuevo.
    if (res.status === 401 || res.status === 403) {
      token = await getToken(true);
      if (!token) {
        return NextResponse.json({ branches: [], error: 'Andreani auth' }, { status: 502 });
      }
      res = await fetchBranches(cp, token);
    }

    if (!res.ok) {
      console.error('[andreani-branches] API error', res.status);
      return NextResponse.json({ branches: [], error: `Andreani ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const raw: AndreaniBranch[] = data?.response?.data ?? [];

    const branches = raw
      .filter((b) => b?.Codigo)
      .map((b) => {
        const calle = `${b.Direccion?.Calle ?? ''} ${b.Direccion?.Numero ?? ''}`.trim();
        const localidad = b.Direccion?.Localidad ?? '';
        return {
          id: String(b.Codigo),
          label: b.Descripcion,
          direccion: [calle, localidad].filter(Boolean).join(', '),
          horario: '',
        };
      });

    return NextResponse.json({ branches });
  } catch (err) {
    console.error('[andreani-branches]', err);
    return NextResponse.json({ branches: [], error: 'Error al obtener sucursales' }, { status: 500 });
  }
}
