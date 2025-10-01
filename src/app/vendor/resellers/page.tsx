
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorResellersPage() {
  return (
    <AppShell title="My Resellers">
      <Card>
        <CardHeader>
          <CardTitle>My Resellers</CardTitle>
          <CardDescription>
            This page is for sellers to manage their reseller network. As a vendor, you can manage your direct sellers under the 'My Sellers' tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please use the 'My Sellers' page to see which sellers are connected to you.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
