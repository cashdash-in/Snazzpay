
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

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
        <input type="hidden" name="sellerName" id="snazzpay-p-sellerName" />
        <input type="hidden" name="sellerId" id="snazzpay-p-sellerId" />

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

<!-- Data script to safely pass Liquid variables to JavaScript -->
<script id="snazzpay-product-data" type="application/json">
{
  "vendor": {{ product.vendor | json }},
  "title": {{ product.title | json }},
  "featuredImage": {{ product.featured_image | img_url: 'large' | json }},
  "initialVariant": {{ product.selected_or_first_available_variant | json }}
}
<\/script>


<script>
document.addEventListener('DOMContentLoaded', function() {
    try {
        const container = document.getElementById('snazzpay-secure-cod-container');
        if (!container) return;

        const dataScript = document.getElementById('snazzpay-product-data');
        if (!dataScript || !dataScript.textContent) {
          console.error("SnazzPay Error: Data script not found or empty.");
          container.style.display = 'none';
          return;
        }

        const productData = JSON.parse(dataScript.textContent);
        const vendor = productData.vendor;

        // --- Vendor Visibility Logic ---
        // Only show the button if the vendor is in this list OR if the vendor field is empty/null.
        const allowedVendors = [
            'Ashish', 'Deep Sarees', 'Elite', 'Haryana Garments', 'Indie Glam', 
            'Lace Collections', 'Luv Kush creations', 'Sakshi Indiedrop', 'Shipera', 
            'Snazzify AI', 'Snazzify RC', 'snazzify.co.in', 'Snazzify.co.in', 
            'sneaker room', 'SR', 'Taufiq Khan', 'Wukusy'
        ];
        
        // Show if vendor is null/empty OR is in the allowed list. Hide for all others.
        if (vendor && !allowedVendors.includes(vendor)) {
            container.style.display = 'none';
            return; 
        }
        // --- End of Vendor Logic ---

        const form = document.getElementById('snazzpay-secure-cod-form');
        const nameInput = document.getElementById('snazzpay-p-name');
        const amountInput = document.getElementById('snazzpay-p-amount');
        const imageInput = document.getElementById('snazzpay-p-image');
        const orderIdInput = document.getElementById('snazzpay-p-order-id');
        const sellerNameInput = document.getElementById('snazzpay-p-sellerName');
        const sellerIdInput = document.getElementById('snazzpay-p-sellerId');


        function updateForm(variant) {
            const currentVariant = variant || productData.initialVariant;
            
            if (!currentVariant) {
                console.error("SnazzPay Error: Could not determine product variant.");
                return;
            }

            nameInput.value = productData.title;
            amountInput.value = (currentVariant.price / 100).toFixed(2);
            imageInput.value = currentVariant.featured_image ? currentVariant.featured_image.src : productData.featuredImage;
            orderIdInput.value = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
            
            // Pass along vendor info
            sellerNameInput.value = productData.vendor || '';
            sellerIdInput.value = productData.vendor || '';
        }

        // Initial update on page load
        updateForm();

        // Listen for Shopify's variant change event.
        document.addEventListener('variant:change', function(event) {
            if (event.detail.variant) {
                updateForm(event.detail.variant);
            }
        });

    } catch (e) {
        console.error("SnazzPay Script Error:", e);
        const container = document.getElementById('snazzpay-secure-cod-container');
        if (container) container.style.display = 'none';
    }
});
<\/script>
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
