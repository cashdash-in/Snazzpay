
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';

export default function CodInstructionsPage() {
    const [iframeUrl, setIframeUrl] = useState('');
    const [embedCode, setEmbedCode] = useState('');

    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/secure-cod?amount={{ product.price | money_without_currency | url_encode }}&name={{ product.title | url_encode }}`;
        setIframeUrl(url);

        const code = `<div id="snazzpay-secure-cod-container" style="margin-top: 20px;">
  <a href="${url}" target="_blank" style="text-decoration: none;">
    <button 
      type="button" 
      class="shopify-payment-button__button shopify-payment-button__button--unbranded"
    >
      Secure with Razorpay eMandate
    </button>
  </a>
</div>
<style>
  #snazzpay-secure-cod-container button {
    width: 100%;
    margin-top: 10px;
    min-height: 44px;
    font-size: 16px;
  }
</style>`;
        setEmbedCode(code);
    }, []);
    

  return (
    <AppShell title="Embedding Instructions">
      <Card>
        <CardHeader>
          <CardTitle>Embed Secure COD on Product Page</CardTitle>
          <CardDescription>
            Follow these steps to add the Secure COD button to your Shopify store's product page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 1: Go to your Shopify Theme Editor</h3>
            <p className="text-muted-foreground">
              In your Shopify admin, go to <span className="font-mono bg-muted p-1 rounded-md">Online Store</span> &gt; <span className="font-mono bg-muted p-1 rounded-md">Themes</span>. Find your current theme and click on <span className="font-mono bg-muted p-1 rounded-md">Customize</span>, then click <span className="font-mono bg-muted p-1 rounded-md">Edit code</span> from the dropdown menu.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 2: Edit your Product Template</h3>
            <p className="text-muted-foreground">
              In the theme editor, find the file that controls your product page. This is usually called <span className="font-mono bg-muted p-1 rounded-md">product.liquid</span> or is inside a file in the <span className="font-mono bg-muted p-1 rounded-md">Sections</span> folder called <span className="font-mono bg-muted p-1 rounded-md">main-product.liquid</span> or similar. Paste the code below where you want the button to appear (e.g., near the 'Add to Cart' button).
            </p>
            <CodeBlock code={embedCode} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">How it works</h3>
            <p className="text-muted-foreground">
              This code adds a "Secure with Razorpay eMandate" button to your product pages. When a customer clicks it, they will be taken to a new page to authorize a mandate for the product's price. This helps confirm their intent for Cash on Delivery orders before they even go to checkout.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
