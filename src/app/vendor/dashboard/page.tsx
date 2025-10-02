
'use client';
import { AppShell } from "@/components/layout/app-shell";
import { VendorDashboard } from "@/components/dashboard/vendor-dashboard";

export default function VendorDashboardPage() {
  return (
    <AppShell title="Vendor Dashboard">
        <VendorDashboard />
    </AppShell>
  );
}
