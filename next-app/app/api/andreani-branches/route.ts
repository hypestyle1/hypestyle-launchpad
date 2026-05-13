import { NextRequest, NextResponse } from 'next/server';

// hash_andreani from WooCommerce Andreani plugin settings (base64 of "Pyme|{sha256_pass}")
const ANDREANI_SESSION =
  process.env.ANDREANI_SESSION_TOKEN ||
  'UHltZXx6cE13TnJReG1DWkVMTDhWRjFwNGljdmVXaXRpd1lqcDlJalRBakUxYjFNPQ==';

interface AndreaniRawBranch {
  id: number;
  numero: string;
  descripcion: string;
  canal: string;
  direccion: {
    calle: string;
    numero: string;
    localidad: string;
    provincia: string;
    codigoPostal: string;
  };
  datosAdicionales: {
    seHaceAtencionAlCliente: boolean;
    admiteEnvios: boolean;
    tipo: string;
  };
  horarioDeAtencion: string;
}

export async function GET(req: NextRequest) {
  const cp = new URL(req.url).searchParams.get('cp') || '';
  if (!cp) return NextResponse.json({ branches: [], error: 'cp requerido' }, { status: 400 });

  try {
    const res = await fetch(
      `https://apis.andreani.com/v2/sucursales?codigoPostal=${encodeURIComponent(cp)}`,
      {
        headers: { 'x-andreani-session': ANDREANI_SESSION },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      console.error('[andreani-branches] API error', res.status);
      return NextResponse.json({ branches: [], error: `Andreani ${res.status}` }, { status: 502 });
    }

    const raw: AndreaniRawBranch[] = await res.json();

    const branches = raw
      .filter(
        (b) =>
          b.datosAdicionales?.seHaceAtencionAlCliente === true &&
          b.datosAdicionales?.admiteEnvios === true,
      )
      .map((b) => ({
        id: String(b.numero ?? b.id),
        label: b.descripcion,
        direccion: `${b.direccion?.calle ?? ''} ${b.direccion?.numero ?? ''}, ${b.direccion?.localidad ?? ''}`.trim(),
        horario: b.horarioDeAtencion || '',
      }));

    return NextResponse.json({ branches });
  } catch (err) {
    console.error('[andreani-branches]', err);
    return NextResponse.json({ branches: [], error: 'Error al obtener sucursales' }, { status: 500 });
  }
}
