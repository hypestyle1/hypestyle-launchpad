import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { MayoristaCartProvider } from '@/context/MayoristaCartContext';
import { MayoristaDivisaProvider } from '@/context/MayoristaDivisaContext';
import { MayoristaPerfilProvider } from '@/context/MayoristaPerfilContext';
import MayoristaFooter from '@/components/mayorista/MayoristaFooter';
import { consignacionDeSesion, MAYORISTA_COOKIE } from '@/lib/mayorista-consignacion-server';

export const metadata: Metadata = {
  title: 'Mayoristas — Hype.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function MayoristasLayout({ children }: { children: React.ReactNode }) {
  // Si la cuenta trabaja a consignación, el catálogo tiene que salir YA con
  // precios de lista: si llega con el perfil, el precio se duplica a la vista.
  const consignacion = await consignacionDeSesion(cookies().get(MAYORISTA_COOKIE)?.value);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* La divisa envuelve también al alta y al login: el link con ?divisa=USD
          que recibe un local de afuera la deja guardada desde la primera
          pantalla, antes de que tenga cuenta. */}
      <MayoristaDivisaProvider>
        <MayoristaPerfilProvider consignacionInicial={consignacion}>
          <MayoristaCartProvider>
            {children}
            <MayoristaFooter />
          </MayoristaCartProvider>
        </MayoristaPerfilProvider>
      </MayoristaDivisaProvider>
    </div>
  );
}
