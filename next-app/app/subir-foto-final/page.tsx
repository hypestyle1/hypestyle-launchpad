'use client';

import { useState, useRef } from 'react';

// Páginita mobile-friendly para cambiar la foto de FinalSection/ChampionTakeover sin
// tocar código ni depender de un deploy. Protegida con el mismo secret que ya se usa
// para ?test= en los banners de partido (PROMO_TEST_SECRET). Sube directo a la
// Biblioteca de medios de WordPress vía /api/final-photo.
export default function SubirFotoFinal() {
  const [secret, setSecret] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!file || !secret) return;
    setStatus('loading');
    setMessage('');
    try {
      const form = new FormData();
      form.append('secret', secret);
      form.append('file', file);
      const res = await fetch('/api/final-photo', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al subir');
      setStatus('ok');
      setMessage('Foto actualizada. Ya se ve en el sitio (puede tardar un minuto en cachés).');
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message || 'Algo salió mal');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1b3d] flex flex-col items-center px-5 py-10 text-white">
      <h1 className="font-black uppercase text-[22px] tracking-tight mb-1">Cambiar foto</h1>
      <p className="text-white/50 text-[13px] mb-8 text-center">
        Actualiza la foto del banner y la pantalla de campeón en hypestyle.com.ar
      </p>

      <div className="w-full max-w-[380px] flex flex-col gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1.5">
            Clave
          </label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/15 rounded-[10px] px-4 py-3 text-[15px] outline-none focus:border-[#D4AF37]"
            placeholder="Clave de acceso"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1.5">
            Foto
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border border-white/15 rounded-[10px] py-3 text-[13px] font-bold uppercase tracking-wider text-white/80 hover:border-[#D4AF37] transition-colors"
          >
            {file ? 'Elegir otra foto' : 'Elegir foto de la galería'}
          </button>
        </div>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="w-full rounded-[10px] object-cover max-h-[400px]" />
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!file || !secret || status === 'loading'}
          className="w-full py-4 rounded-[10px] font-black uppercase text-[13px] tracking-wider transition-colors disabled:opacity-40"
          style={{ background: '#D4AF37', color: '#0d1b3d' }}
        >
          {status === 'loading' ? 'Subiendo...' : 'Subir y actualizar sitio'}
        </button>

        {message && (
          <p className={`text-[13px] text-center ${status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
