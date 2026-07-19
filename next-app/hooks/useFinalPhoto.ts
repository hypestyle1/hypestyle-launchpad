'use client';

import { useQuery } from '@tanstack/react-query';

const FALLBACK = '/final/messi-final.jpg';

// Foto de FinalSection/ChampionTakeover, actualizable sin deploy (ver app/subir-foto-final
// y app/api/final-photo). Devuelve la última subida a WordPress, o la foto de fallback
// (la que ya está bundleada en el repo) si todavía no subieron ninguna.
export function useFinalPhoto() {
  const { data } = useQuery<{ url: string | null }>({
    queryKey: ['final-photo'],
    queryFn: async () => {
      const res = await fetch('/api/final-photo');
      if (!res.ok) throw new Error('final-photo failed');
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  return data?.url || FALLBACK;
}
