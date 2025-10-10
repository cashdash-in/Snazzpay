
'use client';

import { useState, useEffect } from "react";
import { getCollection, getDocument } from "@/services/firestore";
import type { EditableOrder } from "@/app/orders/page";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, WalletCards, CheckCircle2, AlertTriangle, Users, CircleDollarSign, Eye, MousePointerClick } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function MainDashboard() {
    const [stats, setStats] = useState({
        totalSecuredValue: 0,
        activeLeads: 0,
        successfulCharges: 0,
        totalRefunds: 0,
    });
    const [liveStats, setLiveStats] = useState({
        secureCodClicks: 0,
        magazineVisits: 0,
        secureCodActiveSessions: 0,
        magazineActiveSessions: 0,
    });
    const [salesData, setSalesData] = useState<{ name: string, total: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const liveStatsDocRef = doc(db, 'analytics', today);

        const unsubscribe = onSnapshot(liveStatsDocRef, (doc) => {
            if (doc.exists()) {
                setLiveStats(doc.data() as any);
            }
        }, (error) => {
            console.error("Error fetching live stats:", error);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        async function loadDashboardData() {
            setLoading(true);
            try {
                const [orders, leads] = await Promise.all([
                    getCollection<EditableOrder>('orders'),
                    getCollection<EditableOrder>('leads')
                ]);
                
                const allOrders = orders;

                // Calculate Stats
                const totalSecuredValue = allOrders
                    .filter(o => o.paymentStatus === 'Authorized')
                    .reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);

                const successfulCharges = allOrders
                    .filter(o => o.paymentStatus === 'Paid' || o.paymentStatus === 'Fee Charged')
                    .reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);

                const totalRefunds = allOrders
                    .filter(o => ['Refunded', 'Voided'].includes(o.paymentStatus))
                    .reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
                
                const activeLeads = leads.filter(l => l.paymentStatus !== 'Converted');

                setStats({
                    totalSecuredValue,
                    activeLeads: activeLeads.length,
                    successfulCharges,
                    totalRefunds,
                });
                
                // Prepare Sales Chart Data for last 7 days
                const salesByDay: { [key: string]: number } = {};
                for (let i = 6; i >= 0; i--) {
                    const date = subDays(new Date(), i);
                    const formattedDate = format(date, 'MMM d');
                    salesByDay[formattedDate] = 0;
                }

                allOrders
                    .filter(o => o.paymentStatus === 'Paid' || o.paymentStatus === 'Fee Charged')
                    .forEach(o => {
                        try {
                             const orderDate = new Date(o.date);
                             const today = new Date();
                            if (subDays(today, 7) <= orderDate && orderDate <= today) {
                                const formattedDate = format(orderDate, 'MMM d');
                                salesByDay[formattedDate] = (salesByDay[formattedDate] || 0) + parseFloat(o.price);
                            }
                        } catch(e){
                            // ignore invalid date formats
                        }
                    });
                
                setSalesData(Object.entries(salesByDay).map(([name, total]) => ({ name, total })));


            } catch (error: any) {
                toast({ variant: 'destructive', title: "Dashboard Error", description: "Could not retrieve order data from Firestore." });
            } finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, [toast]);

    return (
        <div className="grid gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Secure COD Clicks (Today)</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{liveStats.secureCodClicks}</div>
                        <p className="text-xs text-muted-foreground">Clicks on the main Secure COD button.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Magazine Visits (Today)</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{liveStats.magazineVisits}</div>
                         <p className="text-xs text-muted-foreground">Total views across all Smart Magazines.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Secure COD Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{liveStats.secureCodActiveSessions}</div>
                        <p className="text-xs text-muted-foreground">Users currently on the payment page.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Magazine Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{liveStats.magazineActiveSessions}</div>
                        <p className="text-xs text-muted-foreground">Users on a magazine order page.</p>
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Secured Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalSecuredValue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Value held in customer Trust Wallets.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeLeads}</div>
                        <p className="text-xs text-muted-foreground">Customers who submitted order requests.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Successful Charges</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.successfulCharges.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total value of finalized payments.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Refunded / Cancelled</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalRefunds.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total value of refunded orders.</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Overview (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                       <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={salesData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₹{value}`}
                                />
                                <Tooltip 
                                     cursor={{fill: 'hsl(var(--muted))'}}
                                     content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                        Day
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                        {payload[0].payload.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                        Sales
                                                        </span>
                                                        <span className="font-bold">
                                                        ₹{payload[0].value?.toLocaleString() ?? 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            )
                                        }
                                        return null
                                     }}
                                />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Your 5 most recent orders from all sources.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <RecentOrders />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
