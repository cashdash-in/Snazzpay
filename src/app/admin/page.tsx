
'use client';
import { MainDashboard } from "@/app/dashboard/main-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminDashboardPage() {
  return (
    <AppShell title="SnazzPay Admin Dashboard">
        <MainDashboard />
    </AppShell>
  );
}
