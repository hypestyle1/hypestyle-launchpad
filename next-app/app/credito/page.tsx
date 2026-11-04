import { Suspense } from 'react';
import type { Metadata } from 'next';
import CreditoClient from './CreditoClient';

export const metadata: Metadata = {
  title: 'Tu crédito Hype',
  robots: { index: false, follow: false },
};

export default function CreditoPage() {
  return (
    <Suspense>
      <CreditoClient />
    </Suspense>
  );
}
