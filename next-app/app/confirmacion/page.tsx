import { Suspense } from 'react';
import ConfirmacionClient from './ConfirmacionClient';

export default function ConfirmacionPage() {
  return (
    <Suspense>
      <ConfirmacionClient />
    </Suspense>
  );
}
