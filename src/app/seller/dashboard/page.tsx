'use client';
import { SellerDashboard } from "@/components/dashboard/seller-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function SellerDashboardPage() {
  return (
    <AppShell title="Seller Dashboard">
        <SellerDashboard />
    </AppShell>
  );
}
