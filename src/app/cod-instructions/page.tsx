
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { CodeBlock } from "@/components/code-block";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function CodInstructionsPage() {
    const embedCode = `<!-- SnazzPay Secure COD Button Start -->
<div id="snazzpay-secure-cod-container">
    <form id="snazzpay-secure-cod-form" action="https://snazzpay.netlify.app/secure-cod" method="GET" target="_blank" style="margin-top: 15px; width: 100%;">
        <!-- Hidden fields for product data -->
        <input type="hidden" name="name" id="snazzpay-p-name" />
        <input type="hidden" name="amount" id="snazzpay-p-amount" />
        <input type="hidden" name="image" id="snazzpay-p-image" />
        <input type="hidden" name="order_id" id="snazzpay-p-order-id" />
        <input type="hidden" name="sellerName" id="snazzpay-p-sellerName" />
        <input type="hidden" name="sellerId" id="snazzpay-p-sellerId" />
        <input type="hidden" name="productId" id="snazzpay-p-productId" />
        <input type="hidden" name="vendor" id="snazzpay-p-vendor" />
        <input type="hidden" name="collection" id="snazzpay-p-collection" />
        <input type="hidden" name="sizes" id="snazzpay-p-sizes" />
        <input type="hidden" name="colors" id="snazzpay-p-colors" />

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
  "id": {{ product.id | json }},
  "vendor": {{ product.vendor | json }},
  "type": {{ product.type | json }},
  "title": {{ product.title | json }},
  "featuredImage": {{ product.featured_image | img_url: 'large' | json }},
  "initialVariant": {{ product.selected_or_first_available_variant | json }},
  "options_with_values": {{ product.options_with_values | json }},
  "collectionId": {{ collection.id | json }}
}
</script>


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
        const allowedVendors = [
            'Ashish', 'Deep Sarees', 'Elite', 'Haryana Garments', 'Indie Glam', 
            'Lace Collections', 'Luv Kush creations', 'Sakshi Indiedrop', 'Shipera', 
            'Snazzify AI', 'Snazzify RC', 'snazzify.co.in', 'Snazzify.co.in', 
            'Sneaker room', 'SR', 'Taufiq Khan', 'Wukusy'
        ];
        
        if (vendor && !allowedVendors.includes(vendor)) {
            container.style.display = 'none';
            return; 
        }
        // --- End of Vendor Logic ---

        const form = document.getElementById('snazzpay-secure-cod-form');

        function updateForm(variant) {
            const currentVariant = variant || productData.initialVariant;
            
            if (!currentVariant) {
                console.error("SnazzPay Error: Could not determine product variant.");
                return;
            }

            document.getElementById('snazzpay-p-name').value = productData.title;
            document.getElementById('snazzpay-p-amount').value = (currentVariant.price / 100).toFixed(2);
            let imageUrl = currentVariant.featured_image ? currentVariant.featured_image.src : productData.featuredImage;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https:' + imageUrl;
            }
            document.getElementById('snazzpay-p-image').value = imageUrl || '';

            document.getElementById('snazzpay-p-order-id').value = 'SNZ-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
            
            document.getElementById('snazzpay-p-sellerName').value = productData.vendor || '';
            document.getElementById('snazzpay-p-sellerId').value = productData.vendor || '';
            document.getElementById('snazzpay-p-productId').value = productData.id;
            document.getElementById('snazzpay-p-vendor').value = productData.vendor;
            document.getElementById('snazzpay-p-collection').value = productData.collectionId || '';

            const allSizes = productData.options_with_values.find(o => o.name.toLowerCase() === 'size')?.values || [];
            document.getElementById('snazzpay-p-sizes').value = allSizes.join(',');

            const allColors = productData.options_with_values.find(o => o.name.toLowerCase() === 'color')?.values || [];
            document.getElementById('snazzpay-p-colors').value = allColors.join(',');

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
</script>
<!-- SnazzPay Secure COD Button End -->`;

    return (
        <AppShell title="Embedding Instructions">
          <Card>
            <CardHeader>
              <CardTitle>Embed Secure COD on Your Shopify Store</CardTitle>
              <CardDescription>
                Follow these steps to add the Secure COD button to your Shopify product page theme. This code is now fully automatic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="default" className="bg-green-50 border-green-200">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>No Manual Edits Needed!</AlertTitle>
                    <AlertDescription>
                        <p>This script now automatically detects your app's URL. Simply copy the entire block and paste it into your Shopify theme. There are no placeholders to replace.</p>
                    </AlertDescription>
                </Alert>
    
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Step 1: Go to your Theme Editor</h3>
                <p className="text-muted-foreground">
                  In your Shopify admin, go to **Online Store &gt; Themes**. Find your current theme, click the "..." button, and select **"Edit code"**. In the file browser on the left, find the template file that controls your product page. This is often called <span className="font-mono bg-muted p-1 rounded-md">product.liquid</span>, <span className="font-mono bg-muted p-1 rounded-md">main-product.liquid</span>, or similar.
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

    
