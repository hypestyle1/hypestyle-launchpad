'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { CookieProvider } from '@/context/CookieContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

export default function Providers({ children }: { children: React.ReactNode }) {
  // retry 1 (React Query trae 3 por defecto). Las queries que pegan a
  // WordPress ya pasan por fetchWithRetry: 3 reintentos acá × los de
  // fetchWithRetry multiplicaban hasta ×16 una consulta fallida justo cuando
  // WP está lento (incidente MySQL/Hostinger 2–4/11/2026). Las queries que
  // definen su propio `retry` no cambian.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <CookieProvider>
        <LocaleProvider>
          <CartProvider>
            <WishlistProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {children}
              </TooltipProvider>
            </WishlistProvider>
          </CartProvider>
        </LocaleProvider>
      </CookieProvider>
    </QueryClientProvider>
  );
}
