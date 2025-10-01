
'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function VendorEarningsPage() {
  return (
    <AppShell title="My Earnings">
        <Card>
            <CardHeader>
                <CardTitle>My Earnings</CardTitle>
                <CardDescription>
                    This is where you will track your revenue from products sold by your sellers and manage payouts. This page is currently a placeholder.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Earnings and payout features for vendors will be added here soon.</p>
            </CardContent>
        </Card>
    </AppShell>
  );
}
