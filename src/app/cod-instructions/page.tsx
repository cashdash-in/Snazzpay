
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function CodInstructionsPage() {
    const [embedCode, setEmbedCode] = useState('');
    const [appUrl, setAppUrl] = useState('');

    useEffect(() => {
        // Use the application's current origin dynamically on the client.
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/secure-cod`;
        const secureCodInfoUrl = `${origin}/secure-cod-info`;

        setAppUrl(origin);

        const code = `<div style="margin-top: 15px; width: 100%;">
  <a id="secure-cod-link" href="#" target="_blank" style="text-decoration: none; display: block; width: 100%;">
    <button 
      type="button" 
      style="width: 100%; min-height: 45px; font-size: 16px; background-color: #5a31f4; color: white; border: none; border-radius: 5px; cursor: pointer;"
      onmouseover="this.style.backgroundColor='#4a28c7'"
      onmouseout="this.style.backgroundColor='#5a31f4'"
    >
      Buy now with Secure COD
    </button>
  </a>
  <div style="text-align: center; margin-top: 8px; font-size: 12px;">
    <a href="${secureCodInfoUrl}" target="_blank" style="color: #5a31f4; text-decoration: underline;">What is this?</a>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const secureCodLink = document.getElementById('secure-cod-link');
    
    if (!secureCodLink) {
        console.error('Secure COD: Could not find link element.');
        return;
    }

    try {
      // Sellers: Replace these with your platform's actual liquid/template variables.
      const productName = \`{{ product.title | url_encode }}\`;
      const productPrice = {{ product.price | money_without_currency | replace: ',', '' }};
      const orderId = \`{{ order.name | default: product.id | url_encode }}\`;
      
      // Your unique Seller ID and Name provided by SnazzPay
      const sellerId = 'YOUR_UNIQUE_SELLER_ID'; // <-- REPLACE THIS
      const sellerName = 'YOUR_SELLER_NAME'; // <-- REPLACE THIS
      
      const baseUrl = '${url}';

      const finalUrl = baseUrl + '?amount=' + encodeURIComponent(productPrice) + '&name=' + productName + '&order_id=' + orderId + '&seller_id=' + encodeURIComponent(sellerId) + '&seller_name=' + encodeURIComponent(sellerName);
      secureCodLink.href = finalUrl;
    } catch (e) {
        console.error("Secure COD Liquid Error: ", e);
        // Fallback URL if liquid variables are not available
        secureCodLink.href = '${url}';
    }
});
</script>
`;
        setEmbedCode(code);
    }, []);
    

  return (
    <AppShell title="Embedding Instructions">
      <Card>
        <CardHeader>
          <CardTitle>Embed Secure COD on Your Website</CardTitle>
          <CardDescription>
            Follow these steps to add the Secure COD button to your store's product page (e.g., Shopify, WooCommerce, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Important: Set Your App URL</AlertTitle>
            <AlertDescription>
                <p>For server-side features like sending email links to work correctly, you must set your live application URL as an environment variable.</p>
                <p className="mt-2">In your hosting provider's settings (e.g., Netlify, Vercel), add a variable named <span className="font-mono bg-muted p-1 rounded-md">NEXT_PUBLIC_APP_URL</span> and set its value to <strong className="font-mono">{appUrl || 'your-live-app-url.com'}</strong>.</p>
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 1: Go to your Theme Editor</h3>
            <p className="text-muted-foreground">
              In your e-commerce platform's admin panel (e.g., Shopify), go to the theme editor for your live theme. You'll want to find the template file that controls your product page. This is often called <span className="font-mono bg-muted p-1 rounded-md">product.liquid</span>, <span className="font-mono bg-muted p-1 rounded-md">main-product.liquid</span>, or similar.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 2: Copy and Paste the Code</h3>
            <p className="text-muted-foreground">
              Paste the code below where you want the button to appear (e.g., near your 'Add to Cart' button).
            </p>
            <CodeBlock code={embedCode} />
          </div>
          
           <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 3: Update Seller Details</h3>
            <p className="text-muted-foreground">
              In the code you just pasted, you MUST replace <span className="font-mono bg-muted p-1 rounded-md">'YOUR_UNIQUE_SELLER_ID'</span> and <span className="font-mono bg-muted p-1 rounded-md">'YOUR_SELLER_NAME'</span> with the actual ID and name provided to you by the SnazzPay admin. This is critical for tracking your orders correctly.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">How it works</h3>
            <p className="text-muted-foreground">
              This universal HTML and JavaScript snippet adds the "Buy now with Secure COD" button. It's designed to automatically detect the product name and price using common template variables from platforms like Shopify. When a customer clicks it, they are taken to the secure payment page with all your order details and seller information pre-filled.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
