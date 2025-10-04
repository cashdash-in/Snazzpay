
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function CodInstructionsPage() {
    const [embedCode, setEmbedCode] = useState('');

    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://snazzpay.netlify.app';

        const code = `<form id="secure-cod-form" action="https://snazzpay.netlify.app/secure-cod" method="GET" target="_blank" style="margin-top: 15px; width: 100%;">
  <!-- Hidden fields to carry product data -->
  <input type="hidden" id="cod-p-name" name="name" value="" />
  <input type="hidden" id="cod-p-amount" name="amount" value="" />
  <input type="hidden" id="cod-p-image" name="image" value="" />
  <input type="hidden" id="cod-p-order-id" name="order_id" value="" />

  <button 
    type="submit" 
    style="width: 100%; min-height: 45px; font-size: 16px; background-color: #5a31f4; color: white; border: none; border-radius: 5px; cursor: pointer;"
    onmouseover="this.style.backgroundColor='#4a28c7'"
    onmouseout="this.style.backgroundColor='#5a31f4'"
  >
    Buy now with Secure COD
  </button>
  <div style="text-align: center; margin-top: 8px; font-size: 12px;">
    <a href="https://snazzpay.netlify.app/secure-cod-info" target="_blank" style="color: #5a31f4; text-decoration: underline;">What is this?</a>
  </div>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var secureCodForm = document.getElementById('secure-cod-form');
    if (secureCodForm) {
        secureCodForm.addEventListener('submit', function(event) {
            try {
                // These are standard Shopify liquid variables.
                var productName = '{{ product.title | url_encode }}';
                var productPrice = {{ product.price | money_without_currency | replace: ',', '' }};
                var productImage = '{{ product.featured_image | img_url: "large" }}';
                var uniqueId = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
                
                // Set the values of the hidden input fields just before submitting
                document.getElementById('cod-p-name').value = productName;
                document.getElementById('cod-p-amount').value = productPrice;
                document.getElementById('cod-p-image').value = productImage;
                document.getElementById('cod-p-order-id').value = uniqueId;

            } catch (e) {
                console.error("Secure COD Liquid Error: ", e);
                // If there's an error, we can prevent submission or allow it to go to a fallback.
                // For now, we'll let it submit with blank values, and the next page will handle it.
            }
        });
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
           <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Important Note</AlertTitle>
            <AlertDescription>
                <p>This dynamic script attempts to pass product details to the payment page automatically. However, some e-commerce platforms have strict security that may block this, causing a "popup blocked" error. If this happens, please let me know.</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 1: Go to your Theme Editor</h3>
            <p className="text-muted-foreground">
              In your e-commerce platform's admin panel (e.g., Shopify), go to the theme editor for your live theme. You'll want to find the template file that controls your product page. This is often called <span className="font-mono bg-muted p-1 rounded-md">product.liquid</span>, <span className="font-mono bg-muted p-1 rounded-md">main-product.liquid</span>, or similar. Find the section where the "Add to Cart" or "Buy Now" button is located.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 2: Copy and Paste the Code</h3>
            <p className="text-muted-foreground">
              Copy the code below and paste it directly underneath your existing "Add to Cart" or "Buy Now" button code in the theme editor. The script will automatically try to find your product's details and include them when the button is clicked.
            </p>
            <CodeBlock code={embedCode} />
          </div>

        </CardContent>
      </Card>
    </AppShell>
  );
}
