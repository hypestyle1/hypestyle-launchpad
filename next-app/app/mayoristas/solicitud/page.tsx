'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fbCompleteRegistration } from '@/lib/fbpixel';
import { captureAttribution, type Attribution } from '@/lib/attribution';
import { Button } from '@/components/ui/button';

// Alta de mayoristas hecha por el propio comercio. Mismo vestido de vidrio que
// /mayoristas/login, en una tarjeta más ancha porque son varios campos.

const glassCard = {
  background: 'rgba(245, 243, 237, 0.72)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.55)',
} as React.CSSProperties;

const glassInput = {
  background: 'rgba(255,255,255,0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
} as React.CSSProperties;

const MIN_PASSWORD = 8;

const EMPTY = {
  razonSocial: '', cuit: '', instagram: '', modalidad: '',
  contacto: '', telefono: '', email: '', ciudad: '', provincia: '',
  password: '', repeat: '',
};

const MODALIDADES = ['Local a la calle', 'Showroom', 'Solo online', 'Ferias y eventos'];

export default function SolicitudMayoristaPage() {
  const [form, setForm] = useState(EMPTY);
  const [localFisico, setLocalFisico] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Origen de la visita (utm, fbclid, referrer). Se captura al montar porque el
  // envío puede llegar minutos después, ya sin parámetros en la URL.
  const [attribution, setAttribution] = useState<Attribution>({});

  useEffect(() => {
    setAttribution(captureAttribution());
  }, []);

  const field =(name: keyof typeof EMPTY) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [name]: e.target.value })),
  });

  const inputClass = 'w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < MIN_PASSWORD) { setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres`); return; }
    if (form.password !== form.repeat) { setError('Las dos contraseñas tienen que coincidir'); return; }
    if (form.cuit.replace(/\D/g, '').length !== 11) { setError('El CUIT tiene que tener 11 números'); return; }

    setLoading(true);
    const res = await fetch('/api/mayorista/solicitud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, localFisico, attribution }),
    });
    setLoading(false);

    if (res.ok) {
      // Meta necesita el evento para poder optimizar la campaña de captación
      // mayorista por solicitud y no por visita a la página. Va con los datos
      // del comercio para que el evento se pueda atribuir al click del ad.
      const [fn, ...ln] = form.contacto.trim().split(' ');
      fbCompleteRegistration({
        em: form.email,
        ph: form.telefono,
        fn,
        ln: ln.join(' '),
        ct: form.ciudad,
        st: form.provincia,
        country: 'ar',
      });
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'No pudimos registrar la solicitud');
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div
        className="absolute -inset-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('/fw26-camo-editorial.webp')",
          filter: 'blur(18px) brightness(0.5) saturate(1.1)',
          transform: 'scale(1.08)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.10) 60%, rgba(0,0,0,.5) 100%)' }}
      />

      <div className="relative z-10 w-full max-w-[520px] rounded-[24px] overflow-hidden" style={glassCard}>
        <div className="px-7 sm:px-9 pt-9 pb-8">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto mx-auto" />
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-foreground/45 mt-4">
            Sumá Hype a tu local
          </p>

          {done ? (
            <div className="text-center mt-8">
              <p className="text-[15px] font-semibold mb-2">Recibimos tu solicitud</p>
              <p className="text-[13px] text-foreground/60 leading-relaxed">
                La revisamos y te escribimos a <span className="font-medium text-foreground">{form.email}</span> apenas esté aprobada.
                Cuando llegue ese mail, entrás con la contraseña que acabás de elegir.
              </p>
              <Link
                href="/"
                className="inline-block mt-7 text-[11px] uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors"
              >
                Volver al sitio
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-foreground/60 leading-relaxed mt-6">
                Completá tus datos y elegí tu contraseña. Revisamos la solicitud y te avisamos por mail cuando quede activa.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-2.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-1">Tu negocio</p>
                <input type="text" required placeholder="Razón social o nombre del local" {...field('razonSocial')} className={inputClass} style={glassInput} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" required inputMode="numeric" placeholder="CUIT" {...field('cuit')} className={inputClass} style={glassInput} />
                  <input type="text" placeholder="Instagram" {...field('instagram')} className={inputClass} style={glassInput} />
                </div>

                <div className="flex items-center gap-4 py-1.5 px-1">
                  <span className="text-[12px] text-foreground/60">¿Tenés local físico?</span>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setLocalFisico(v)}
                      className={`text-[11px] uppercase tracking-wide px-3 py-1 rounded-full border transition-colors ${
                        localFisico === v ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-foreground/20 text-foreground/50'
                      }`}
                    >
                      {v ? 'Sí' : 'No'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {MODALIDADES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, modalidad: m }))}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                        form.modalidad === m ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-foreground/20 text-foreground/55 hover:border-foreground/40'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-4">Contacto</p>
                <input type="text" required placeholder="Nombre y apellido" {...field('contacto')} className={inputClass} style={glassInput} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="email" required placeholder="Mail" {...field('email')} className={inputClass} style={glassInput} />
                  <input type="tel" required placeholder="Teléfono" {...field('telefono')} className={inputClass} style={glassInput} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" placeholder="Ciudad" {...field('ciudad')} className={inputClass} style={glassInput} />
                  <input type="text" placeholder="Provincia" {...field('provincia')} className={inputClass} style={glassInput} />
                </div>

                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-4">Tu contraseña</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="password" required minLength={MIN_PASSWORD} placeholder="Contraseña" autoComplete="new-password" {...field('password')} className={inputClass} style={glassInput} />
                  <input type="password" required minLength={MIN_PASSWORD} placeholder="Repetila" autoComplete="new-password" {...field('repeat')} className={inputClass} style={glassInput} />
                </div>
                <p className="text-[11px] text-foreground/40">Al menos {MIN_PASSWORD} caracteres. La elegís vos y no la comparte nadie.</p>

                {error && <p className="text-[12px] text-destructive pt-1">{error}</p>}

                <Button type="submit" variant="hype" size="ctaFull" disabled={loading} className="py-3 rounded-full !mt-7">
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </Button>

                <div className="text-center !mt-5">
                  <Link href="/mayoristas/login" className="text-[11px] uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors">
                    Ya tengo cuenta
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
