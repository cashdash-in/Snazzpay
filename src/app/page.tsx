'use client';
import { MainDashboard } from "@/app/dashboard/main-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell title="Admin Dashboard">
        <MainDashboard />
    </AppShell>
  );
}
