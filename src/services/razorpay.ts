
'use server';

// This file is intentionally left empty.
// The Razorpay integration has been moved to a dedicated API route (/src/app/api/create-subscription/route.ts)
// that uses the official 'razorpay-node' SDK.
// This is a more robust and reliable approach that avoids the server-to-server
// networking issues that were causing errors with manual `fetch` calls.
// All client-side logic is now in `/src/app/secure-cod/page.tsx`.
