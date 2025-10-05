
'use client';

import { SecureCodPaymentForm } from '@/components/secure-cod-payment-form';

function Page() {
    return (
       <div className="relative min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            <SecureCodPaymentForm />
        </div>
    );
}

export default Page;
