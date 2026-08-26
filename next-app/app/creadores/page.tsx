'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, LANGUAGES } from '@/context/LocaleContext';

// "Crea contenido con Hype" — reemplaza al Google Form.
//
// Las preguntas salen de analizar las 130 respuestas del form viejo: el campo
// de seguidores era inservible (91 de 130 llegaron en formatos imposibles de
// comparar: "3600 - 600", "26k en ig y 15k en tiktok") y el talle en texto
// libre tampoco servía. En cambio "por qué querés crear contenido" sí
// discrimina: 168 caracteres de promedio, solo 4 de 130 por debajo de 40.
// Así que se va el alcance y entran compromiso, criterio y trabajo mostrado.

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

const EMPTY = {
  nombre: '', email: '', telefono: '', ciudad: '', edad: '',
  instagram: '', tiktok: '', links: '', porque: '', prenda: '',
  marcas: '', tutor_nombre: '', tutor_contacto: '',
};

// Los chips guardan SIEMPRE el valor canónico en español y muestran su
// traducción. Así una postulación hecha en inglés llega con "Dos o tres por
// mes" y no hay que pasar por una IA un dato que ya es estructurado.
const TALLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const FRECUENCIAS = ['Una pieza por mes', 'Dos o tres por mes', 'Todas las semanas'];
const EQUIPOS = ['Celular, edito yo', 'Celular, me edita alguien', 'Cámara, edito yo', 'Cámara, trabajo con un editor'];

export default function CreadoresPage() {
  // Se reutiliza el i18n del sitio en vez de armar uno paralelo: el mismo t(),
  // el mismo diccionario y la misma preferencia guardada.
  const { language, setLanguage, t } = useLocale();
  const [form, setForm] = useState(EMPTY);
  const [talle, setTalle] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [equipo, setEquipo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState<{ actualizada: boolean } | null>(null);

  const field = (name: keyof typeof EMPTY) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [name]: e.target.value })),
  });

  const edadNum = parseInt(form.edad, 10);
  const esMenor = Number.isFinite(edadNum) && edadNum > 0 && edadNum < 18;

  const inputClass = 'w-full px-4 py-3 text-[13px] rounded-[12px] placeholder:text-foreground/40 focus:outline-none transition-shadow';
  const chip = (activo: boolean) =>
    `text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
      activo ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-foreground/20 text-foreground/55 hover:border-foreground/40'
    }`;

  const faltan = useMemo(() => {
    const f: string[] = [];
    if (!form.nombre.trim()) f.push(t('tu nombre'));
    if (!form.email.includes('@')) f.push(t('un mail válido'));
    if (!form.instagram.trim() && !form.tiktok.trim()) f.push(t('al menos una cuenta'));
    if (!form.porque.trim()) f.push(t('por qué querés crear con nosotros'));
    if (esMenor && !form.tutor_nombre.trim()) f.push(t('los datos de un adulto responsable'));
    return f;
  }, [form, esMenor, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (faltan.length) { setError(`${t('Nos falta')} ${faltan.join(', ')}.`); return; }

    setLoading(true);
    const res = await fetch('/api/creadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, talle, frecuencia, equipo,
        idioma: language,
        locale: typeof navigator !== 'undefined' ? navigator.language : '',
      }),
    });
    setLoading(false);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setListo({ actualizada: !!data.actualizada });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || t('No pudimos enviar tu postulación'));
    }
  }

  return (
    <div className="relative min-h-screen flex items-start justify-center px-4 py-10 sm:py-16 overflow-hidden">
      <div
        className="absolute -inset-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('/fw26-camo-editorial.webp')",
          filter: 'blur(18px) brightness(0.45) saturate(1.1)',
          transform: 'scale(1.08)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(0,0,0,.4) 0%, rgba(0,0,0,.12) 40%, rgba(0,0,0,.12) 60%, rgba(0,0,0,.55) 100%)' }}
      />

      <div className="relative z-10 w-full max-w-[560px] rounded-[24px] overflow-hidden" style={glassCard}>
        <div className="px-7 sm:px-10 pt-10 pb-9">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto mx-auto" />

          {/* Cambiar de idioma no pierde nada de lo ya escrito: solo cambian
              las etiquetas, los datos viven en el estado del formulario. */}
          <div className="flex items-center justify-center gap-1 mt-5">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                aria-label={`${t('Idioma')}: ${l}`}
                className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full transition-colors ${
                  language === l ? 'bg-bg-dark text-primary-foreground' : 'text-foreground/45 hover:text-foreground'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {listo ? (
            <div className="text-center mt-10">
              <p className="text-[16px] font-bold uppercase tracking-tight mb-3">
                {listo.actualizada ? t('Actualizamos tu postulación') : t('Recibimos tu postulación')}
              </p>
              <p className="text-[13px] text-foreground/60 leading-relaxed max-w-[380px] mx-auto">
                La lee nuestra content manager. Si vemos que hay match, te escribimos a{' '}
                <span className="font-medium text-foreground">{form.email}</span> para charlar.
              </p>
              <Link
                href="/"
                className="inline-block mt-8 text-[11px] uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors"
              >
                {t('Volver al sitio')}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-[26px] sm:text-[32px] font-bold uppercase leading-[1.05] tracking-tight text-center mt-6">
                {t('Crea contenido')}<br />{t('con Hype')}
              </h1>
              <p className="text-[13px] text-foreground/60 leading-relaxed text-center mt-4 max-w-[420px] mx-auto">
                {t('Buscamos gente que entienda la marca y quiera construir algo con nosotros. No nos importa cuánta gente te sigue: nos importa lo que hacés y cómo lo hacés.')}
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-2.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-1">{t('Quién sos')}</p>
                <input type="text" required placeholder={t('Nombre y apellido')} {...field('nombre')} className={inputClass} style={glassInput} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="email" required placeholder={t('Mail')} {...field('email')} className={inputClass} style={glassInput} />
                  <input type="tel" placeholder={t('WhatsApp')} {...field('telefono')} className={inputClass} style={glassInput} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" placeholder={t('Ciudad')} {...field('ciudad')} className={inputClass} style={glassInput} />
                  <input type="number" min={13} max={99} placeholder={t('Edad')} {...field('edad')} className={inputClass} style={glassInput} />
                </div>

                {esMenor && (
                  <div className="rounded-[12px] border border-amber-300/60 bg-amber-50/60 px-4 py-3 space-y-2.5 !mt-3">
                    <p className="text-[12px] text-amber-900 leading-relaxed">
                      {t('Como sos menor de 18, necesitamos los datos de un adulto responsable para poder trabajar juntos.')}
                    </p>
                    <input type="text" placeholder={t('Nombre del adulto responsable')} {...field('tutor_nombre')} className={inputClass} style={glassInput} />
                    <input type="text" placeholder={t('Su teléfono o mail')} {...field('tutor_contacto')} className={inputClass} style={glassInput} />
                  </div>
                )}

                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-5">{t('Dónde te encontramos')}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" placeholder={t('@ de Instagram')} {...field('instagram')} className={inputClass} style={glassInput} />
                  <input type="text" placeholder={t('@ de TikTok')} {...field('tiktok')} className={inputClass} style={glassInput} />
                </div>

                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-5">{t('Tu trabajo')}</p>
                <textarea
                  rows={3}
                  placeholder={t('Pegá dos o tres links a piezas tuyas de las que estés orgulloso')}
                  {...field('links')}
                  className={inputClass + ' resize-none'}
                  style={glassInput}
                />
                <p className="text-[11px] text-foreground/40">{t('Un reel, una foto, lo que sea que muestre cómo trabajás.')}</p>

                <div className="!mt-5">
                  <p className="text-[12px] text-foreground/60 mb-2">{t('¿Con qué frecuencia podés producir?')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FRECUENCIAS.map(f => (
                      <button key={f} type="button" onClick={() => setFrecuencia(f)} className={chip(frecuencia === f)}>{t(f)}</button>
                    ))}
                  </div>
                </div>

                <div className="!mt-4">
                  <p className="text-[12px] text-foreground/60 mb-2">{t('¿Con qué grabás y editás?')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPOS.map(f => (
                      <button key={f} type="button" onClick={() => setEquipo(f)} className={chip(equipo === f)}>{t(f)}</button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 pt-5">{t('Vos y la marca')}</p>
                <textarea
                  rows={4}
                  required
                  placeholder={t('¿Por qué querés crear con Hype?')}
                  {...field('porque')}
                  className={inputClass + ' resize-none'}
                  style={glassInput}
                />
                <textarea
                  rows={3}
                  placeholder={t('¿Qué prenda de Hype te pondrías mañana, y por qué esa?')}
                  {...field('prenda')}
                  className={inputClass + ' resize-none'}
                  style={glassInput}
                />

                <div className="!mt-5">
                  <p className="text-[12px] text-foreground/60 mb-2">{t('¿Qué talle usás?')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TALLES.map(t => (
                      <button key={t} type="button" onClick={() => setTalle(t)} className={chip(talle === t)}>{t}</button>
                    ))}
                  </div>
                </div>

                <input type="text" placeholder={t('¿Trabajaste con otras marcas? (opcional)')} {...field('marcas')} className={inputClass + ' !mt-5'} style={glassInput} />

                {error && <p className="text-[12px] text-destructive pt-1">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-bg-dark text-primary-foreground py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-bg-dark/85 transition-colors disabled:opacity-60 !mt-8"
                >
                  {loading ? '...' : t('Enviar postulación')}
                </button>

                <p className="text-[11px] text-foreground/40 text-center !mt-4">
                  {t('La revisa nuestra content manager. Si hay match, te escribimos.')}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
