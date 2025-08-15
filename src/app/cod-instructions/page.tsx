
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';

export default function CodInstructionsPage() {
    const [embedCode, setEmbedCode] = useState('');

    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/secure-cod`;
        const secureCodInfoUrl = `${origin}/secure-cod-info`;

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
      const productName = \`{{ product.title | url_encode }}\`;
      const productPrice = {{ product.price | money_without_currency | replace: ',', '' }};
      // Try to get the order name (e.g., #1001), fallback to product ID for unsaved orders
      const orderId = \`{{ order.name | default: product.id | url_encode }}\`; 
      const baseUrl = '${url}';

      const finalUrl = baseUrl + '?amount=' + encodeURIComponent(productPrice) + '&name=' + productName + '&order_id=' + orderId;
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
              This code adds a "Buy now with Secure COD" button to your product pages. When clicked, it takes the customer to a secure page where they can confirm the quantity and authorize the payment. It intelligently captures the order ID if available, or the product ID as a fallback.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

    