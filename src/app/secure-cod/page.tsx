'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SecureCodPaymentForm = dynamic(
  () => import('@/components/secure-cod-payment-form').then(mod => mod.SecureCodPaymentForm),
  { 
    ssr: false,
    loading: () => <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
);

function Page() {
    useEffect(() => {
        // Track session start
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'secureCodSessionStart' }),
            keepalive: true, // This is important!
        });

        const handleUnload = () => {
             fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'sessionEnd', type: 'secure' }),
                keepalive: true,
            });
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            // Also send on component unmount in case it's a client-side navigation
            handleUnload();
        };
    }, []);

    return (
       <div className="relative min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <SecureCodPaymentForm />
            </Suspense>
        </div>
    );
}

export default Page;
