
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { useEffect, useState } from 'react';

export default function CodInstructionsPage() {
    const [iframeUrl, setIframeUrl] = useState('');
    const [embedCode, setEmbedCode] = useState('');
    const [infoUrl, setInfoUrl] = useState('');

    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/secure-cod`;
        const secureCodInfoUrl = `${origin}/secure-cod-info`;
        setInfoUrl(secureCodInfoUrl);

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
    const productForm = document.querySelector('form[action^="/cart/add"]');

    if (!productForm || !secureCodLink) {
        console.error('Secure COD: Could not find product form or link element.');
        return;
    }

    const productName = \`{{ product.title | url_encode }}\`;
    const baseUrl = '${url}';

    function getProductPrice() {
        // Find the price element. Shopify themes have many different structures.
        // This selector tries to find common patterns for the product price.
        const priceElement = productForm.querySelector('.price__container .price-item--regular, .product-price, [data-product-price]');
        let priceText = '{{ product.price | money_without_currency }}'; // Fallback to initial price

        if (priceElement) {
           priceText = priceElement.textContent;
        }
        
        return parseFloat(priceText.replace(/[^\\d.-]/g, ''));
    }

    function updateCodLink() {
        const quantityInput = productForm.querySelector('input[name="quantity"], select[name="quantity"]');
        const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;
        const productPrice = getProductPrice();

        if (isNaN(productPrice)) {
            console.error('Secure COD: Could not determine product price.');
            return;
        }

        const totalAmount = (productPrice * quantity).toFixed(2);
        const finalUrl = baseUrl + '?amount=' + encodeURIComponent(totalAmount) + '&name=' + productName;
        secureCodLink.href = finalUrl;
    }

    // Initial update
    updateCodLink();

    // Listen for changes on quantity and variant selectors
    productForm.addEventListener('change', function(event) {
        if (event.target.name === 'quantity' || event.target.name === 'id') {
            updateCodLink();
        }
    });
    productForm.addEventListener('keyup', function(event) {
        if (event.target.name === 'quantity') {
            updateCodLink();
        }
    });

    // Use a MutationObserver to watch for price changes when variants are updated,
    // as some themes replace the price element dynamically.
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // Check if nodes were added or character data changed, which can indicate a price update.
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                // A small delay can help ensure all DOM changes are complete.
                setTimeout(updateCodLink, 50);
            }
        });
    });

    observer.observe(productForm, {
        childList: true,
        subtree: true,
        characterData: true
    });
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
            Follow these steps to add the Secure COD button to your Shopify store's product page. This code will now handle quantity changes.
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
              This code adds a "Secure COD" button to your product pages. A small script is included to detect changes in the product quantity selector. It automatically calculates the total price and updates the authorization link, ensuring the correct amount is used for the eMandate.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
