
'use client';
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell title="Dashboard">
        <MainDashboard />
    </AppShell>
  );
}
