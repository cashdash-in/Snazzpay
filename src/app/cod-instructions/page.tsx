import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";

export default function CodInstructionsPage() {

    const iframeUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/secure-cod?order_id={{ order.name | url_encode }}&amount={{ order.total_price | money_without_currency | url_encode }}&name={{ customer.name | url_encode }}&email={{ customer.email | url_encode }}&phone={{ customer.phone | url_encode }}`
        : '';
    
    const embedCode = `<div id="snazzpay-secure-cod-container"></div>
<script>
  (function() {
    const container = document.getElementById('snazzpay-secure-cod-container');
    if (container) {
      const iframe = document.createElement('iframe');
      iframe.src = "${iframeUrl}";
      iframe.style.width = '100%';
      iframe.style.height = '500px';
      iframe.style.border = 'none';
      container.appendChild(iframe);
    }
  })();
</script>`;

  return (
    <AppShell title="Embedding Instructions">
      <Card>
        <CardHeader>
          <CardTitle>Embed Secure COD in Shopify</CardTitle>
          <CardDescription>
            Follow these steps to add the Secure COD button to your Shopify store's thank you page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 1: Go to Shopify Checkout Settings</h3>
            <p className="text-muted-foreground">
              In your Shopify admin, go to <span className="font-mono bg-muted p-1 rounded-md">Settings</span> &gt; <span className="font-mono bg-muted p-1 rounded-md">Checkout</span>.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Step 2: Add Script to Thank You Page</h3>
            <p className="text-muted-foreground">
              Scroll down to the <span className="font-mono bg-muted p-1 rounded-md">Order status page</span> section. In the <span className="font-mono bg-muted p-1 rounded-md">Additional scripts</span> box, paste the following code.
            </p>
            <CodeBlock code={embedCode} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">How it works</h3>
            <p className="text-muted-foreground">
              This script will only display the Secure COD authorization flow if the selected shipping method for the order is Cash on Delivery (COD). It dynamically passes the order details from Shopify to your app.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
