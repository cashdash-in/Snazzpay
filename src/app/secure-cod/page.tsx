

import { getRazorpayKeyId } from '@/app/actions';
import { SecureCodForm } from '@/components/secure-cod-form';
import { CancellationForm } from '@/components/cancellation-form';
import { Suspense } from 'react';

function SecureCodContent() {
    const razorpayKeyId = getRazorpayKeyId();

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PageContent razorpayKeyIdPromise={razorpayKeyId} />
        </Suspense>
    );
}

async function PageContent({ razorpayKeyIdPromise }: { razorpayKeyIdPromise: Promise<string | null> }) {
    const razorpayKeyId = await razorpayKeyIdPromise;

    return (
        <>
            <SecureCodForm razorpayKeyId={razorpayKeyId} />
            <CancellationForm />
        </>
    )
}

export default SecureCodContent;
