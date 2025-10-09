
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { CodeBlock } from "@/components/code-block";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function CodInstructionsPage() {
    const embedCode = `<!-- SnazzPay Secure COD Button Start -->
<div id="snazzpay-secure-cod-container">
    <form id="snazzpay-secure-cod-form" action="/secure-cod" method="GET" target="_blank" style="margin-top: 15px; width: 100%;">
        <!-- Hidden fields for product data -->
        <input type="hidden" name="name" id="snazzpay-p-name" />
        <input type="hidden" name="amount" id="snazzpay-p-amount" />
        <input type="hidden" name="image" id="snazzpay-p-image" />
        <input type="hidden" name="order_id" id="snazzpay-p-order-id" />
        <input type="hidden" name="sellerName" id="snazzpay-p-sellerName" />
        <input type="hidden" name="sellerId" id="snazzpay-p-sellerId" />
        <input type="hidden" name="sizes" id="snazzpay-p-sizes" />
        <input type="hidden" name="colors" id="snazzpay-p-colors" />
        <input type="hidden" name="productId" id="snazzpay-p-productId" />
        <input type="hidden" name="vendor" id="snazzpay-p-vendor" />
        <input type="hidden" name="collection" id="snazzpay-p-collection" />

        <button 
            type="submit" 
            style="width: 100%; min-height: 45px; font-size: 16px; background-color: #5a31f4; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.2s;"
            onmouseover="this.style.backgroundColor='#4a28c7'"
            onmouseout="this.style.backgroundColor='#5a31f4'"
        >
            Buy with Secure COD
        </button>
        <div style="text-align: center; margin-top: 8px; font-size: 12px;">
            <a href="/secure-cod-info" target="_blank" style="color: #5a31f4; text-decoration: underline;" id="snazzpay-info-link">What is this?</a>
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
  "options_with_values": {{ product.options_with_values | json }}
}
<\/script>


<script id="snazzpay-logic-script" src="https://snazzpay-djsy0.web.app/snazzpay-shopify.js" async><\/script>
<!-- SnazzPay Secure COD Button End -->`;

    return (
        <AppShell title="Embedding Instructions">
          <Card>
            <CardHeader>
              <CardTitle>Embed Secure COD on Your Shopify Store</CardTitle>
              <CardDescription>
                Follow these steps to add the Secure COD button to your Shopify product page theme. This code has been updated to automatically detect your app's URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>For Shopify Themes Only</AlertTitle>
                <AlertDescription>
                    <p>This code is specifically designed for Shopify and uses its Liquid templating language ({`{{...}}`}). It will not work on other platforms.</p>
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
                  Copy the code below and paste it where you want the button to appear, usually near the "Add to Cart" button. **This new version requires no manual URL changes.**
                </p>
                <CodeBlock code={embedCode} />
              </div>
    
            </CardContent>
          </Card>
        </AppShell>
    );
}
