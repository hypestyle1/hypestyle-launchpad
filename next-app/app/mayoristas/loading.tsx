// Esqueleto del portal mientras el servidor trae el catálogo de WordPress
// (hasta 20 páginas de WPGraphQL: varios segundos). Antes la pantalla quedaba
// en blanco. Misma grilla que el catálogo para que no salte al cargar.
export default function MayoristasLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando el catálogo">
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-border/60">
        <div className="h-5 w-24 rounded bg-bg-alt animate-pulse" />
        <div className="flex gap-5">
          <div className="h-3 w-16 rounded bg-bg-alt animate-pulse" />
          <div className="h-3 w-14 rounded bg-bg-alt animate-pulse" />
          <div className="h-3 w-10 rounded bg-bg-alt animate-pulse" />
        </div>
      </div>
      <div className="px-5 sm:px-8 py-6">
        <div className="rounded-[16px] border border-border p-6 sm:p-8 mb-8">
          <div className="h-3 w-28 rounded bg-bg-alt animate-pulse" />
          <div className="h-7 w-72 max-w-full rounded bg-bg-alt animate-pulse mt-3" />
          <div className="h-3 w-96 max-w-full rounded bg-bg-alt animate-pulse mt-3" />
        </div>
        <div className="h-5 w-32 rounded bg-bg-alt animate-pulse mb-3" />
        <div className="h-9 w-full rounded bg-bg-alt/60 animate-pulse mb-4" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-7 w-20 rounded-full bg-bg-alt animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="aspect-square rounded-[8px] bg-bg-alt animate-pulse" />
              <div className="h-2.5 w-14 rounded bg-bg-alt animate-pulse mt-3" />
              <div className="h-3.5 w-3/4 rounded bg-bg-alt animate-pulse mt-2" />
              <div className="h-3.5 w-1/3 rounded bg-bg-alt animate-pulse mt-2" />
              <div className="flex gap-1.5 mt-3">
                {Array.from({ length: 4 }, (_, j) => <div key={j} className="h-9 w-9 rounded-[6px] bg-bg-alt animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
