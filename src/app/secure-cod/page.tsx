
import { getRazorpayKeyId } from '@/app/actions';
import { SecureCodForm } from '@/components/secure-cod-form';

export default async function SecureCodPage() {
    const razorpayKeyId = await getRazorpayKeyId();

    return <SecureCodForm razorpayKeyId={razorpayKeyId} />;
}
