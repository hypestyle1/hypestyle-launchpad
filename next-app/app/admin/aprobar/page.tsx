'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Pantalla a la que lleva el botón "Revisar y aprobar" del mail. Muestra la
// solicitud completa y recién ahí, con un botón, se decide. Abrir el link no
// activa nada: ver la nota en app/api/admin/aprobar/route.ts.

type Solicitud = {
  id: number; email: string; status: 'pending' | 'active' | 'revoked';
  razonSocial: string; contacto: string; telefono: string; ciudad: string; provincia: string;
  cuit: string; instagram: string; localFisico: boolean; modalidad: string; fecha: string;
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-[12px] text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-[13px] text-gray-900 font-medium break-words">{value}</span>
    </div>
  );
}

function Aprobacion() {
  const token = useSearchParams().get('token') || '';
  const [loading, setLoading] = useState(true);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState<'aprobar' | 'rechazar' | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!token) { setError('Falta el link de la solicitud'); setLoading(false); return; }
    fetch(`/api/admin/aprobar?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.solicitud) setSolicitud(data.solicitud);
        else setError(data.message || 'No pudimos abrir la solicitud');
      })
      .catch(() => setError('No pudimos abrir la solicitud'))
      .finally(() => setLoading(false));
  }, [token]);

  async function decidir(decision: 'aprobar' | 'rechazar') {
    if (decision === 'rechazar' && !confirm('Rechazar esta solicitud? La cuenta queda sin acceso.')) return;
    setSaving(true);
    const res = await fetch('/api/admin/aprobar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, decision }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setResultado(decision);
      setEmailSent(!!data.emailSent);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'No pudimos guardar la decisión');
    }
  }

  if (loading) return <p className="text-[13px] text-gray-500 py-8 text-center">Cargando la solicitud...</p>;

  if (error && !solicitud) {
    return (
      <div className="text-center py-6">
        <p className="text-[14px] font-semibold text-gray-900 mb-2">{error}</p>
        <Link href="/admin/mayoristas" className="text-[12px] text-gray-500 hover:text-black underline">
          Ver todas las solicitudes en el panel
        </Link>
      </div>
    );
  }

  if (!solicitud) return null;

  if (resultado) {
    return (
      <div className="text-center py-6">
        <p className="text-[15px] font-semibold text-gray-900 mb-2">
          {resultado === 'aprobar' ? 'Solicitud aprobada' : 'Solicitud rechazada'}
        </p>
        <p className="text-[13px] text-gray-500 leading-relaxed">
          {resultado === 'aprobar'
            ? emailSent
              ? `${solicitud.razonSocial} ya puede entrar. Le avisamos por mail a ${solicitud.email}.`
              : `${solicitud.razonSocial} ya puede entrar, pero el mail de aviso no salió. Escribile vos a ${solicitud.email}.`
            : 'La cuenta queda sin acceso al catálogo.'}
        </p>
        <Link href="/admin/mayoristas" className="inline-block mt-6 text-[12px] text-gray-500 hover:text-black underline">
          Ir al panel de mayoristas
        </Link>
      </div>
    );
  }

  const yaDecidida = solicitud.status !== 'pending';

  return (
    <>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Solicitud de acceso</p>
        <h1 className="text-[20px] font-bold text-gray-900 mt-1">{solicitud.razonSocial}</h1>
      </div>

      {yaDecidida && (
        <div className={`rounded-lg px-4 py-3 mb-5 text-[12px] ${solicitud.status === 'active' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
          {solicitud.status === 'active'
            ? 'Esta solicitud ya está aprobada y el cliente tiene acceso.'
            : 'Esta solicitud ya fue rechazada. Podés aprobarla igual si cambiaste de idea.'}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 px-5 py-2">
        <Row label="CUIT" value={solicitud.cuit} />
        <Row label="Contacto" value={solicitud.contacto} />
        <Row label="Mail" value={solicitud.email} />
        <Row label="Teléfono" value={solicitud.telefono} />
        <Row label="Instagram" value={solicitud.instagram ? `@${solicitud.instagram}` : ''} />
        <Row label="Local físico" value={solicitud.localFisico ? 'Sí' : 'No'} />
        <Row label="Cómo vende" value={solicitud.modalidad} />
        <Row label="Ubicación" value={[solicitud.ciudad, solicitud.provincia].filter(Boolean).join(', ')} />
      </div>

      {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => decidir('aprobar')}
          disabled={saving}
          className="flex-1 bg-black text-white py-3 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          {saving ? '...' : 'Aprobar acceso'}
        </button>
        <button
          onClick={() => decidir('rechazar')}
          disabled={saving}
          className="px-5 text-[12px] font-semibold text-gray-500 border border-gray-300 rounded-full hover:text-black hover:border-gray-400 transition-colors disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>

      <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
        Al aprobar, le llega un mail avisándole que ya puede entrar con la contraseña que eligió al registrarse.
      </p>
    </>
  );
}

export default function AprobarPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-start justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-[440px]">
        <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto mx-auto mb-8" />
        <Suspense fallback={<p className="text-[13px] text-gray-500 py-8 text-center">Cargando...</p>}>
          <Aprobacion />
        </Suspense>
      </div>
    </div>
  );
}
