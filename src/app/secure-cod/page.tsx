
import { SecureCodForm } from '../secure-cod-form';
import { CancellationForm } from '@/components/cancellation-form';
import { Suspense } from 'react';
import { getRazorpayKeyId } from '../actions';


async function PageContent() {
    const razorpayKeyId = await getRazorpayKeyId();

    return (
       <div className="relative min-h-screen w-full">
            <SecureCodForm razorpayKeyId={razorpayKeyId} />
            <CancellationForm />
        </div>
    )
}

export default function SecureCodPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
        <PageContent />
    </Suspense>
  );
}
