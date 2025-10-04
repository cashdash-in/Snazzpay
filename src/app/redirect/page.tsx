
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const params = new URLSearchParams();

    // Safely append each parameter
    Object.entries(searchParams).forEach(([key, value]) => {
        if (value) {
            params.append(key, Array.isArray(value) ? value[0] : value);
        }
    });

    // Redirect to the secure-cod page with all the received parameters
    redirect(`/secure-cod?${params.toString()}`);

    // This part will not be rendered due to the redirect
    return null;
}

export default function RedirectPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Redirector searchParams={searchParams} />
        </Suspense>
    );
}
