
'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function VendorReportsPage() {
  return (
    <AppShell title="My Reports">
        <Card>
            <CardHeader>
                <CardTitle>My Reports</CardTitle>
                <CardDescription>
                    This is where you will be able to generate reports for product performance and seller activity. This page is currently a placeholder.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Reporting features for vendors will be added here soon.</p>
            </CardContent>
        </Card>
    </AppShell>
  );
}
