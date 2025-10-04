

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
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://<your-app-url>';
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
    <a href="${origin}/secure-cod-info" target="_blank" style="color: #5a31f4; text-decoration: underline;">What is this?</a>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var secureCodLink = document.getElementById('secure-cod-link');
    
    if (!secureCodLink) {
        console.error('Secure COD: Could not find link element.');
        return;
    }

    try {
        // These are standard Shopify liquid variables. 
        // They should work on most Shopify themes out-of-the-box.
        var productName = '{{ product.title | url_encode }}';
        var productPrice = {{ product.price | money_without_currency | replace: ',', '' }};
        var productImage = '{{ product.featured_image | img_url: "large" }}';
        
        // Generate a new, unique Order ID on the client-side for every transaction.
        var uniqueId = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        var baseUrl = '${origin}/secure-cod';

        var finalUrl = baseUrl + '?amount=' + encodeURIComponent(productPrice) + '&name=' + productName + '&order_id=' + uniqueId + '&image=' + encodeURIComponent(productImage);
        
        // Directly set the href on the anchor tag.
        secureCodLink.href = finalUrl;

    } catch (e) {
        console.error("Secure COD Liquid Error: ", e);
        // Fallback URL if liquid variables are not available
        secureCodLink.href = '${origin}/secure-cod';
    }
});
</script>`;
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
            <AlertTitle>Important: Server Environment Variable</AlertTitle>
            <AlertDescription>
                <p>For server-side features like sending email links to work correctly, you must set your live application URL as an environment variable.</p>
                <p className="mt-2">In your hosting provider's settings (e.g., Vercel), add a variable named <span className="font-mono bg-muted p-1 rounded-md">NEXT_PUBLIC_APP_URL</span> and set its value to <strong className="font-mono">{appUrl || 'your-live-app-url.com'}</strong>.</p>
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
              Paste the code below where you want the button to appear (e.g., near your 'Add to Cart' button). The URLs will be automatically configured to your app's domain.
            </p>
            <CodeBlock code={embedCode} />
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
