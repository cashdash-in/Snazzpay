'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { CancellationForm } from '@/components/cancellation-form';

// Use dynamic import with ssr: false to prevent the component from rendering on the server.
// This is the standard and most robust way to fix hydration errors caused by client-side APIs like useSearchParams.
const SecureCodPaymentForm = dynamic(
  () => import('@/components/secure-cod-payment-form').then((mod) => mod.SecureCodPaymentForm),
  { 
    ssr: false,
    loading: () => <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
);


function Page() {
    return (
       <div className="relative min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <SecureCodPaymentForm />
            </Suspense>
            <Suspense>
                 <CancellationForm />
            </Suspense>
        </div>
    );
}

export default Page;
