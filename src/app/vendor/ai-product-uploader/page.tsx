
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorAiProductUploaderPage() {
  return (
    <AppShell title="AI Product Uploader">
      <Card>
        <CardHeader>
          <CardTitle>AI Product Uploader</CardTitle>
          <CardDescription>
            This feature is for sellers to generate product listings from vendor data. As a vendor, your primary tool is the 'Product Drops' page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Use the 'Product Drops' page to send new product information to your sellers. They will then use their AI Product Uploader to create listings.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
