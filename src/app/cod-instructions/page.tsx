
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function CodInstructionsPage() {
    const [embedCode, setEmbedCode] = useState('');

    useEffect(() => {
        const code = `<!-- SnazzPay Secure COD Button Start -->
<form id="secure-cod-form" action="https://snazzpay.netlify.app/secure-cod" method="GET" target="_blank" style="margin-top: 15px; width: 100%;">
  <!-- Hidden fields to carry product data -->
  <input type="hidden" id="cod-p-name" name="name" value="" />
  <input type="hidden" id="cod-p-amount" name="amount" value="" />
  <input type="hidden" id="cod-p-image" name="image" value="" />
  <input type="hidden" id="cod-p-order-id" name="order_id" value="" />
  <!-- New fields for size and color -->
  <input type="hidden" id="cod-p-size" name="sizes" value="" />
  <input type="hidden" id="cod-p-color" name="colors" value="" />

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
                // Get the currently selected variant
                var currentVariant = {{ product.selected_or_first_available_variant | json }};

                var productName = {{ product.title | json }};
                var productPrice = currentVariant.price / 100;
                var productImage = currentVariant.featured_image ? currentVariant.featured_image.src : {{ product.featured_image | img_url: "large" | json }};
                var uniqueId = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
                
                // Get size and color from the variant's options
                var selectedSize = currentVariant.option1 || '';
                var selectedColor = currentVariant.option2 || '';
                
                // Set the values of the hidden input fields just before submitting
                document.getElementById('cod-p-name').value = productName + (currentVariant.title !== 'Default Title' ? ' - ' + currentVariant.title : '');
                document.getElementById('cod-p-amount').value = productPrice;
                document.getElementById('cod-p-image').value = productImage;
                document.getElementById('cod-p-order-id').value = uniqueId;
                document.getElementById('cod-p-size').value = selectedSize;
                document.getElementById('cod-p-color').value = selectedColor;

            } catch (e) {
                console.error("Secure COD Liquid Error: ", e);
                // Prevent form submission if there is an error
                event.preventDefault();
                alert("Could not process product details. Please try again.");
            }
        });
    }
});
</script>
<!-- SnazzPay Secure COD Button End -->`;
        setEmbedCode(code);
    }, []);

  return (
    <AppShell title="Embedding Instructions">
      <Card>
        <CardHeader>
          <CardTitle>Embed Secure COD on Your Shopify Store</CardTitle>
          <CardDescription>
            Follow these steps to add the Secure COD button to your Shopify product page theme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>For Shopify Themes Only</AlertTitle>
            <AlertDescription>
                <p>This code is specifically designed for Shopify and uses its Liquid templating language (`{{...}}`). It will not work on other platforms.</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 1: Go to your Theme Editor</h3>
            <p className="text-muted-foreground">
              In your Shopify admin, go to **Online Store > Themes**. Find your current theme, click the "..." button, and select **"Edit code"**. In the file browser on the left, find the template file that controls your product page. This is often called <span className="font-mono bg-muted p-1 rounded-md">product.liquid</span>, <span className="font-mono bg-muted p-1 rounded-md">main-product.liquid</span>, or similar.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 2: Copy and Paste the Code</h3>
            <p className="text-muted-foreground">
              Copy the code below and paste it where you want the button to appear, usually near the "Add to Cart" button.
            </p>
            <CodeBlock code={embedCode} />
          </div>

        </CardContent>
      </Card>
    </AppShell>
  );
}
