import { AppShell } from "@/components/layout/app-shell";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentOrders } from "@/components/dashboard/recent-orders";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <div className="grid gap-8">
        <StatsCards />
        <RecentOrders />
      </div>
    </AppShell>
  );
}
