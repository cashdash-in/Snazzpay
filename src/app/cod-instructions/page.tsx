
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
        const appUrl = 'https://snazzpay.netlify.app/';
        const code = `
<div id="snazzpay-secure-cod-button-container"></div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    // --- START: Find Shopify Product Data ---
    // This script tries to find the product data Shopify makes available.
    let productData = null;
    try {
      const productJsonScript = document.querySelector('script[type="application/json"][data-product-json]');
      if (productJsonScript) {
        productData = JSON.parse(productJsonScript.textContent);
      } else {
        // Fallback for some themes
        const variantJsonScript = document.querySelector('script[type="application/json"][data-variant-json]');
        if (variantJsonScript) {
            const variantData = JSON.parse(variantJsonScript.textContent);
            productData = {
                title: variantData.product?.title || 'Product',
                price: variantData.price,
                vendor: variantData.product?.vendor || 'Default Vendor',
                featured_image: variantData.featured_image ? { path: variantData.featured_image.src } : null
            };
        }
      }
    } catch(e) {
      console.error("SnazzPay Error: Could not find Shopify product data.", e);
    }
    // --- END: Find Shopify Product Data ---

    if (productData) {
      /*
      // --- HOW TO HIDE BUTTON FOR SPECIFIC VENDORS (OPTIONAL) ---
      // To hide the button for certain vendors, uncomment the code below and add your vendor names to the list.
      
      const deniedVendors = ['Dropdash', 'itzjqv-uw']; 
      const productVendor = productData.vendor || 'snazzify_default_vendor';

      if (deniedVendors.includes(productVendor)) {
          return; // This will stop the script and hide the button for this vendor.
      }
      */
      
      const container = document.getElementById('snazzpay-secure-cod-button-container');
      
      const appUrl = '${appUrl}';
      const orderId = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7).toUpperCase();

      const params = new URLSearchParams({
        name: productData.title,
        amount: (productData.price / 100).toString(), // Convert from paise to rupees
        image: productData.featured_image ? \`https:\${productData.featured_image.path}\` : '',
        order_id: orderId,
      });

      const secureCodUrl = \`\${appUrl}secure-cod?\${params.toString()}\`;

      // --- Button Styling (can be customized) ---
      container.innerHTML = \`
        <a href="\${secureCodUrl}" target="_blank" style="display: block; width: 100%; text-decoration: none;">
          <button 
            type="button" 
            style="width: 100%; min-height: 45px; font-size: 16px; background-color: #5a31f4; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.2s;"
            onmouseover="this.style.backgroundColor='#4a28c7'"
            onmouseout="this.style.backgroundColor='#5a31f4'"
          >
            Buy with Secure COD
          </button>
        </a>
        <div style="text-align: center; margin-top: 8px; font-size: 12px;">
          <a href="\${appUrl}secure-cod-info" target="_blank" style="color: #5a31f4; text-decoration: underline;">What is this?</a>
        </div>
      \`;
    }
  });
<\/script>`;
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
            <AlertTitle>Important Note for Shopify</AlertTitle>
            <AlertDescription>
                <p>Due to how different Shopify themes are built, the script's ability to automatically detect product details (like vendor) may vary. If the button isn't showing/hiding correctly, the theme's structure may be non-standard. Please let me know if you encounter issues.</p>
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
              Copy the code below and paste it directly underneath your existing "Add to Cart" or "Buy Now" button code in the theme editor. This code will now show the button for all vendors by default.
            </p>
            <CodeBlock code={embedCode} />
          </div>

        </CardContent>
      </Card>
    </AppShell>
  );
}
