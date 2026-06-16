// Lee las cookies de Meta (_fbp / _fbc) para enviarlas al CAPI server-side.
// _fbc = click-ID; sin él Meta no puede atar la compra al click del anuncio.
// El pixel setea _fbc a partir del fbclid de la URL de aterrizaje; acá lo
// reconstruimos como fallback si la cookie aún no existe pero hay fbclid.
export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {};
  const read = (name: string): string | undefined => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  const fbp = read('_fbp');
  let fbc = read('_fbc');
  if (!fbc && typeof window !== 'undefined') {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbp, fbc };
}
