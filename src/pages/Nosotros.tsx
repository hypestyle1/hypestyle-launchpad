import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useReveal } from "@/hooks/useReveal";
import { Instagram } from "lucide-react";

export default function Nosotros() {
  const heroRef = useReveal();
  const originRef = useReveal();
  const photoRef = useReveal();
  const letterRef = useReveal();
  const ctaRef = useReveal();
  const labelRef = useReveal();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        {/* Hero */}
        <section
          ref={heroRef}
          className="bg-bg-dark flex items-center justify-center text-center"
          style={{ padding: "120px 24px" }}
        >
          <div className="max-w-[720px]">
            <p className="reveal rd1 text-[12px] tracking-[0.1em] text-primary-foreground/50 mb-6">
              Buenos Aires — Est. 2018
            </p>
            <h1 className="reveal rd2 text-[32px] md:text-[48px] font-semibold leading-[1.15] text-primary-foreground">
              De apuesta personal a construir nuestro propio camino.
            </h1>
          </div>
        </section>

        {/* Origin text */}
        <section ref={originRef} className="py-20 md:py-28 px-4">
          <div className="max-w-[1400px] mx-auto">
            <div className="w-full md:w-[60%]">
              <p className="reveal rd1 text-[16px] font-normal leading-[1.8] text-foreground mb-8">
                Hypestyle nace en 2018 con el objetivo de darles a los jóvenes una identidad propia
                a través de la ropa. Diseñamos para quienes buscan diferenciarse, para los que
                sienten afinidad con el streetwear y la cultura actual.
              </p>
              <p className="reveal rd2 text-[16px] font-normal leading-[1.8] text-foreground mb-8">
                Desde el principio entendimos que esto no se trataba solo de vender prendas, sino de
                formar una comunidad. Nos interesa acompañar a los que hacen, a los que empujan
                desde abajo, apasionadamente. A aquellas personas que día a día le ponen cuerpo y
                dedicación a su camino.
              </p>
              <p className="reveal rd3 text-[16px] font-normal leading-[1.8] text-foreground">
                Nuestra misión es crear piezas con diseño, calidad y propósito. Apostamos a un
                público que valora el detalle, la identidad y el servicio — leal a sí mismo, sin
                perder lo que nos representa: creatividad, evolución y visión constante.
              </p>
            </div>
          </div>
        </section>

        {/* Founders photo */}
        <section ref={photoRef} className="px-4">
          <div className="reveal max-w-[1400px] mx-auto">
            <div
              className="w-full bg-bg-alt flex items-center justify-center"
              style={{ maxHeight: "600px", overflow: "hidden" }}
            >
              <img
                src="/founders-photo.jpg"
                alt="Valentín Pozzi y Juan Corona, fundadores de Hypestyle"
                className="w-full h-auto object-cover object-top"
                style={{ maxHeight: "600px" }}
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  if (el.parentElement) {
                    el.parentElement.style.height = "400px";
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Letter / signature */}
        <section ref={letterRef} className="py-20 md:py-28 px-4 bg-background">
          <div className="max-w-[640px] mx-auto text-center">
            <p className="reveal rd1 text-[18px] font-normal leading-[1.9] text-foreground italic mb-8">
              "Cada prenda que creamos acá tiene historia, trabajo y sueños detrás.
              Gracias por confiar y formar parte de esta cultura que estamos construyendo."
            </p>
            <p className="reveal rd2 text-[18px] font-normal leading-[1.9] text-foreground italic mb-12">
              "Nos motiva verlos usar Hypestyle, leer sus mensajes, y sentir que estamos
              creciendo junto a ustedes."
            </p>

            {/* Signatures */}
            <div className="reveal rd3 flex justify-center gap-16 md:gap-24">
              <div className="flex flex-col items-center">
                <img
                  src="/firma-pozzi.png"
                  alt="Firma de Valentín Pozzi"
                  className="h-12 w-auto object-contain mb-3"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-[13px] font-semibold text-foreground">Valentín Pozzi</span>
                <span className="text-[12px] font-normal text-muted-foreground">
                  Founder & Creative
                </span>
              </div>
              <div className="flex flex-col items-center">
                <img
                  src="/firma-corona.png"
                  alt="Firma de Juan Corona"
                  className="h-12 w-auto object-contain mb-3"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-[13px] font-semibold text-foreground">Juan Corona</span>
                <span className="text-[12px] font-normal text-muted-foreground">
                  Co-Creative Director
                </span>
              </div>
            </div>

            <div className="mt-12 border-t border-border" />
          </div>
        </section>

        {/* CTA Close Friends */}
        <section ref={ctaRef} className="bg-bg-dark text-primary-foreground py-20 px-4 text-center">
          <div className="max-w-[560px] mx-auto">
            <p className="reveal rd1 text-[20px] font-normal leading-[1.6] mb-4">
              Subí tu historia con la prenda y etiquetanos{" "}
              <span className="font-semibold">@hypestylearg</span>
            </p>
            <p className="reveal rd2 text-[14px] font-normal leading-[1.7] text-primary-foreground/60 mb-8">
              Vas directo a Close Friends — donde te mostramos antes que nadie lo que viene,
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
        <section ref={labelRef} className="py-16 px-4 text-center">
          <p className="reveal text-[11px] tracking-[0.2em] text-text-light">STYLE&CULTURE</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
