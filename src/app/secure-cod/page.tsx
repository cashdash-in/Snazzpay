
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

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
        </div>
    );
}

export default Page;
