
'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SellerProductsPage() {
  return (
    <AppShell title="My Products">
        <Card>
            <CardHeader>
                <CardTitle>My Products</CardTitle>
                <CardDescription>
                    This is where you will manage your product listings. This feature is not yet implemented.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Product management features will be added here soon.</p>
            </CardContent>
        </Card>
    </AppShell>
  );
}
