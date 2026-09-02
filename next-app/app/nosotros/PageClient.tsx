'use client';

import { useEffect, useRef, useState } from 'react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useReveal } from '@/hooks/useReveal';
import { Instagram } from 'lucide-react';
import AnimatedSignature from './AnimatedSignature';
import FramedPhoto from './FramedPhoto';
import { SIGNATURE_POZZI, SIGNATURE_CORONA } from './signatures';

// Cómo pensamos: cuatro ideas en palabras de la marca (Hypestyle OS + TP USAL).
const IDEAS = [
  {
    k: 'Inspiración',
    t: 'Miramos para afuera, no para adentro.',
    p: 'Nos inspira la escena internacional. Tratamos de crear nuestras propias tendencias antes que copiar lo que ya funciona.',
  },
  {
    k: 'Comunidad',
    t: 'Ustedes opinan antes de que produzcamos.',
    p: 'Muchas veces mostramos los diseños en Mejores Amigos antes de lanzarlos. Más de una vez esa reacción fue lo que llevó una idea a producción.',
  },
  {
    k: 'Identidad',
    t: 'Cada drop tiene su propia historia.',
    p: 'Un lanzamiento es un evento, no ropa de temporada. Cada colección tiene su concepto, su estética y su momento.',
  },
  {
    k: 'Compromiso',
    t: 'Nos hacemos cargo.',
    p: 'Todas las marcas tienen problemas: un envío demorado, un talle mandado mal. Lo importante es cómo lo resolvés. Siempre de frente y de la forma más práctica para vos.',
  },
];

// El equipo, como en la tarjeta que va en cada pedido: apodo, nombre y rol.
const TEAM = [
  { nick: 'La Griega', name: 'Micaela Deligiannis', role: 'Content Manager' },
  { nick: 'NotAgus', name: 'Agustín Petersen', role: 'Graphic Designer' },
  { nick: 'Eli', name: 'Elias Gamero', role: 'Fotografía & Film' },
  { nick: 'Pablo', name: 'Pablo Yukich', role: 'Editor' },
];

const SERIF = { fontFamily: "'Times New Roman', Times, Georgia, serif" };

export default function Nosotros() {
  const heroRef = useReveal();
  const originRef = useReveal();
  const photoRef = useReveal();
  const ideasRef = useReveal();
  const letterRef = useReveal();
  const ctaRef = useReveal();
  const labelRef = useReveal();

  // Las firmas arrancan cuando el bloque entra en pantalla; `run` las repite.
  const sigsRef = useRef<HTMLDivElement>(null);
  const [sigsVisible, setSigsVisible] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = sigsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSigsVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        {/* Hero */}
        <section
          ref={heroRef}
          className="bg-bg-dark flex items-center justify-center text-center px-6 py-[120px] md:py-[128px]"
        >
          <div className="max-w-[820px] flex flex-col items-center gap-7">
            <p className="reveal rd1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground/50">
              Buenos Aires — Est. 2018
            </p>
            <h1 className="reveal rd2 text-[32px] md:text-[56px] font-semibold leading-[1.1] tracking-[-0.02em] text-primary-foreground text-balance">
              De apuesta personal a construir nuestro propio camino.
            </h1>
            <p className="reveal rd3 max-w-[520px] text-[16px] leading-[1.7] text-primary-foreground/60">
              Streetwear con identidad, cultura y concepto, hecho en Buenos Aires desde 2018.
            </p>
            <p className="reveal rd4 flex items-center gap-4 text-[11px] tracking-[0.2em] text-primary-foreground/50">
              <span className="block h-px w-8 bg-primary-foreground/25" aria-hidden />
              STYLE&amp;CULTURE
              <span className="block h-px w-8 bg-primary-foreground/25" aria-hidden />
            </p>
          </div>
        </section>

        {/* Origen */}
        <section ref={originRef} className="py-20 md:py-28 px-6">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr] md:gap-20">
            <div className="md:sticky md:top-24 self-start flex flex-col gap-3.5">
              <p className="reveal rd1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-light">
                Origen
              </p>
              <h2 className="reveal rd2 text-[26px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground text-balance">
                Empezamos en 2018 como una apuesta personal.
              </h2>
            </div>
            <div className="max-w-[640px] flex flex-col gap-7">
              <p className="reveal rd1 text-[22px] font-medium leading-[1.5] tracking-[-0.01em] text-foreground">
                Hype nació en 2018, en pleno furor de la cultura hypebeast, cuando en Argentina
                casi no había marcas de streetwear. Arrancamos vendiendo online desde el primer
                día, sin local y sin estructura: con ganas de traer nuevos estilos al país.
              </p>
              <p className="reveal rd2 text-[17px] leading-[1.8] text-foreground">
                Los primeros dos años fueron a pulmón: contenido, boca a boca y presencia en la
                escena. En 2020 llegó el salto, gracias a colaboraciones con artistas y
                referentes de la cultura. Lo que era un proyecto personal pasó a ser un equipo.
              </p>
              <p className="reveal rd3 text-[17px] leading-[1.8] text-foreground">
                Hoy seguimos con la misma idea: hacer producto con identidad, contarlo con
                contenido propio y cuidar a la comunidad que se armó alrededor.{' '}
                <strong className="font-semibold">Producto, contenido, comunidad.</strong> Y
                ustedes son la razón por la que seguimos acá.
              </p>
            </div>
          </div>
        </section>

        {/* Foto del equipo */}
        <section ref={photoRef} className="px-6 pb-20 md:pb-28">
          <div className="reveal max-w-[1040px] mx-auto">
            <FramedPhoto
              src="/team-photo.webp"
              alt="El equipo de Hype en Buenos Aires"
              caption="El equipo de Hype. Buenos Aires, 2026."
              tag="EST. 2018"
            />
          </div>
        </section>

        {/* Cómo pensamos */}
        <section ref={ideasRef} className="px-6 pb-20 md:pb-28">
          <div className="max-w-[1400px] mx-auto">
            <div className="max-w-[640px] flex flex-col gap-3.5 mb-14">
              <p className="reveal rd1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-light">
                Cómo pensamos
              </p>
              <h2 className="reveal rd2 text-[28px] md:text-[40px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground text-balance">
                La ropa es solo una excusa.
              </h2>
              <p className="reveal rd3 text-[16px] leading-[1.7] text-muted-foreground">
                Con cada pieza tratamos de dejar un mensaje. A veces más explícito, a veces
                menos. Por eso STYLE&amp;CULTURE: el estilo y la cultura.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-border-mid">
              {IDEAS.map((idea, i) => (
                <div
                  key={idea.k}
                  className={`reveal rd${i + 1} border-r border-b border-border-mid px-8 pt-10 pb-11 flex flex-col gap-4`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-light">
                    {idea.k}
                  </p>
                  <h3 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-foreground text-balance">
                    {idea.t}
                  </h3>
                  <p className="max-w-[46ch] text-[15px] leading-[1.75] text-muted-foreground">
                    {idea.p}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Carta + firmas */}
        <section ref={letterRef} className="bg-bg-alt px-6 pt-20 pb-24 md:pt-28">
          <div className="max-w-[680px] mx-auto flex flex-col gap-10">
            <p className="reveal rd1 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-text-light">
              La misma carta que va en cada pedido
            </p>
            <h2 className="reveal rd2 text-center text-[30px] md:text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
              Gracias por ser parte.
            </h2>
            <div className="flex flex-col gap-5">
              <p className="reveal rd2 text-center text-[19px] leading-[1.7] text-foreground">
                Cada prenda que creamos acá tiene historia, trabajo y sueños detrás. Gracias por
                confiar y ser parte de esta cultura que seguimos construyendo.
              </p>
              <p className="reveal rd3 text-center text-[19px] leading-[1.7] text-foreground">
                Nos motiva verlos usar Hypestyle, leer sus mensajes, y sentir que estamos
                creciendo junto a ustedes.
              </p>
            </div>

            <div
              ref={sigsRef}
              className="mt-2 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-6 justify-items-center"
            >
              <div className="flex flex-col items-center gap-2.5 text-center">
                <AnimatedSignature
                  signature={SIGNATURE_POZZI}
                  label="Firma de Valentín Pozzi"
                  delay={0.2}
                  visible={sigsVisible}
                  run={run}
                />
                <div className="h-px w-24 bg-border-mid" />
                <span className="text-[13px] font-semibold text-foreground">Valentín Pozzi</span>
                <span className="text-[12px] text-muted-foreground">Founder &amp; Creative</span>
              </div>
              <div className="flex flex-col items-center gap-2.5 text-center">
                <AnimatedSignature
                  signature={SIGNATURE_CORONA}
                  label="Firma de Juan Corona"
                  delay={1.6}
                  visible={sigsVisible}
                  run={run}
                />
                <div className="h-px w-24 bg-border-mid" />
                <span className="text-[13px] font-semibold text-foreground">Juan Corona</span>
                <span className="text-[12px] text-muted-foreground">Logistics Supervisor</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="self-center border border-border-mid px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:border-foreground focus-visible:text-foreground"
            >
              Volver a firmar
            </button>
          </div>

          {/* Equipo */}
          <div className="reveal rd2 max-w-[680px] mx-auto mt-14 border-t border-border-mid pt-8">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
              {TEAM.map((m) => (
                <li key={m.name} className="flex flex-col gap-1">
                  <span
                    className="mb-1.5 border-b border-border-mid pb-2 text-[22px] italic leading-[1.2] text-foreground"
                    style={SERIF}
                  >
                    {m.nick}
                  </span>
                  <span className="text-[13px] text-foreground">{m.name}</span>
                  <span className="text-[12px] text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA Close Friends */}
        <section ref={ctaRef} className="bg-bg-dark text-primary-foreground py-20 md:py-24 px-6 text-center">
          <div className="max-w-[560px] mx-auto">
            <p className="reveal rd1 text-[20px] md:text-[22px] font-normal leading-[1.5] mb-4">
              Subí tu historia con la prenda y etiquetanos{' '}
              <span className="font-semibold">@hypestylearg</span>
            </p>
            <p className="reveal rd2 text-[14px] font-normal leading-[1.7] text-primary-foreground/60 mb-8">
              Vas directo a Close Friends, donde te mostramos antes que nadie lo que viene,
              beneficios exclusivos y todo lo que pasa detrás.
            </p>
            <a
              href="https://instagram.com/hypestylearg"
              target="_blank"
              rel="noopener noreferrer"
              className="reveal rd3 inline-flex items-center gap-2 border border-primary-foreground text-primary-foreground bg-transparent px-6 py-3 text-[13px] font-normal tracking-[0.04em] hover:bg-primary-foreground hover:text-foreground transition-all duration-200"
            >
              <Instagram className="w-4 h-4" strokeWidth={1.2} />
              Seguirnos en Instagram
            </a>
          </div>
        </section>

        {/* Brand label */}
        <section ref={labelRef} className="py-16 px-6 text-center">
          <p className="reveal text-[11px] tracking-[0.22em] text-text-light">STYLE&amp;CULTURE</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
