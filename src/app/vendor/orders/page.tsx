'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function VendorOrdersPage() {
  return (
    <AppShell title="My Orders">
        <Card>
            <CardHeader>
                <CardTitle>My Orders</CardTitle>
                <CardDescription>
                    This is where you will manage your orders from sellers. This page is currently a placeholder.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Order management features will be added here soon.</p>
            </CardContent>
        </Card>
    </AppShell>
  );
}
