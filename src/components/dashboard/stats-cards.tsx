import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, WalletCards, CheckCircle2, AlertTriangle } from "lucide-react";

const stats = [
    { title: "Total Secured Value", value: "₹45,231.89", icon: DollarSign, change: "+20.1% from last month" },
    { title: "Active Mandates", value: "+2350", icon: WalletCards, change: "+180.1% from last month" },
    { title: "Successful Charges", value: "+12,234", icon: CheckCircle2, change: "+19% from last month" },
    { title: "Failed Charges", value: "32", icon: AlertTriangle, change: "+2 since last hour" },
];

export function StatsCards() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
