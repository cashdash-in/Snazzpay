'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function VendorDashboardPage() {
  return (
    <AppShell title="Vendor Dashboard">
        <Card>
            <CardHeader>
                <CardTitle>Welcome, Vendor!</CardTitle>
                <CardDescription>
                    This is your dedicated dashboard to manage products and orders.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Features for product and order management will be available here soon.</p>
            </CardContent>
        </Card>
    </AppShell>
  );
}
