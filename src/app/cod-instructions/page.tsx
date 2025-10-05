
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
<div id="snazzpay-secure-cod-container">
    <form id="snazzpay-secure-cod-form" action="https://snazzpay.netlify.app/secure-cod" method="GET" target="_blank" style="margin-top: 15px; width: 100%;">
        <!-- Hidden fields for product data -->
        <input type="hidden" name="name" id="snazzpay-p-name" />
        <input type="hidden" name="amount" id="snazzpay-p-amount" />
        <input type="hidden" name="image" id="snazzpay-p-image" />
        <input type="hidden" name="order_id" id="snazzpay-p-order-id" />
        <input type="hidden" name="sizes" id="snazzpay-p-size" />
        <input type="hidden" name="colors" id="snazzpay-p-color" />

        <button 
            type="submit" 
            style="width: 100%; min-height: 45px; font-size: 16px; background-color: #5a31f4; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.2s;"
            onmouseover="this.style.backgroundColor='#4a28c7'"
            onmouseout="this.style.backgroundColor='#5a31f4'"
        >
            Buy with Secure COD
        </button>
        <div style="text-align: center; margin-top: 8px; font-size: 12px;">
            <a href="https://snazzpay.netlify.app/secure-cod-info" target="_blank" style="color: #5a31f4; text-decoration: underline;">What is this?</a>
        </div>
    </form>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    try {
        const productVendor = {{ product.vendor | json }};
        const deniedVendors = ['Dropdash', 'itzjqv-uw'];

        if (deniedVendors.includes(productVendor)) {
            document.getElementById('snazzpay-secure-cod-container').style.display = 'none';
            return; // Stop the script if the vendor is denied
        }

        const form = document.getElementById('snazzpay-secure-cod-form');
        const nameInput = document.getElementById('snazzpay-p-name');
        const amountInput = document.getElementById('snazzpay-p-amount');
        const imageInput = document.getElementById('snazzpay-p-image');
        const orderIdInput = document.getElementById('snazzpay-p-order-id');
        const sizeInput = document.getElementById('snazzpay-p-size');
        const colorInput = document.getElementById('snazzpay-p-color');

        function updateForm() {
            // Use the currently selected variant or fall back to the main product.
            const currentVariant = {{ product.selected_or_first_available_variant | json }};
            const productTitle = {{ product.title | json }};
            const featuredImage = {{ product.featured_image | img_url: "large" | json }};

            nameInput.value = productTitle + (currentVariant.title !== 'Default Title' ? ' - ' + currentVariant.title : '');
            amountInput.value = (currentVariant.price / 100).toFixed(2);
            imageInput.value = currentVariant.featured_image ? currentVariant.featured_image.src : featuredImage;
            orderIdInput.value = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();

            // Capture all available sizes and colors for the product
            const allSizes = {{ product.options_by_name['Size']?.values | json }} || [];
            const allColors = {{ product.options_by_name['Color']?.values | json }} || [];
            
            sizeInput.value = allSizes.join(',');
            colorInput.value = allColors.join(',');
        }

        // Initial update on page load
        updateForm();

        // Listen for Shopify's variant change event
        document.addEventListener('variant:change', function(event) {
            const variant = event.detail.variant;
            if (variant) {
                amountInput.value = (variant.price / 100).toFixed(2);
                if (variant.featured_image) {
                  imageInput.value = variant.featured_image.src;
                }
            }
        });
        
        // Also add listeners to the form selectors as a fallback
        const selectors = document.querySelectorAll('form[action="/cart/add"] [name="id"], form[action="/cart/add"] input[type="radio"], form[action="/cart/add"] select');
        selectors.forEach(selector => {
            selector.addEventListener('change', function() {
                // Use a short timeout to allow Shopify's JS to update the variant data
                setTimeout(updateForm, 50);
            });
        });

    } catch (e) {
        console.error("SnazzPay Script Error:", e);
        // Hide the button if there is a script error to avoid confusion
        const container = document.getElementById('snazzpay-secure-cod-container');
        if (container) container.style.display = 'none';
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
            Follow these steps to add the Secure COD button to your Shopify product page theme. This code is more reliable and includes variant selection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>For Shopify Themes Only</AlertTitle>
            <AlertDescription>
                <p>This code is specifically designed for Shopify and uses its Liquid templating language (`{{...}}`). It will not work on other platforms like WooCommerce or custom websites.</p>
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
