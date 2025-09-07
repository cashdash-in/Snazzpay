
'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SellerEarningsPage() {
  return (
    <AppShell title="My Earnings">
        <Card>
            <CardHeader>
                <CardTitle>My Earnings</CardTitle>
                <CardDescription>
                    This is where you will track your sales revenue and manage payouts. This page is currently a placeholder.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Earnings and payout features will be added here soon.</p>
            </CardContent>
        </Card>
    </AppShell>
  );
}
