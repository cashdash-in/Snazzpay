import { AppShell } from "@/components/layout/app-shell";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <Suspense fallback={
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <MainDashboard />
      </Suspense>
    </AppShell>
  );
}
