
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
    <a href="https://<your-app-url>/secure-cod" target="_blank" style="text-decoration: none; display: block;">
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
        <a href="https://<your-app-url>/secure-cod-info" target="_blank" style="color: #5a31f4; text-decoration: underline;">What is this?</a>
    </div>
</div>`;
        setEmbedCode(code.replace(/<your-app-url>/g, origin));
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
            <AlertTitle>Important Update</AlertTitle>
            <AlertDescription>
                <p>Due to security restrictions on some platforms, the dynamic script has been replaced with a simpler, more reliable button. This version will take customers to the payment page where they will need to manually enter the product name and price.</p>
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
              This simplified code creates a direct link to the payment page. The customer will need to enter the product details manually. Make sure to replace both instances of {'`<your-app-url>`'} with your actual live application URL ({appUrl}).
            </p>
            <CodeBlock code={embedCode} />
          </div>

        </CardContent>
      </Card>
    </AppShell>
  );
}
