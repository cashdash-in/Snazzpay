
'use client';

import { useState, useEffect } from "react";
import { getCollection, getDocument } from "@/services/firestore";
import type { EditableOrder } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, WalletCards, CheckCircle2, AlertTriangle, Users, CircleDollarSign, Eye, MousePointerClick, Calendar as CalendarIcon, Sparkles, Search, ShoppingBag } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

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
        tryOnAttempts: 0,
        tryOnSuccesses: 0,
        geneeOpens: 0,
        geneeSearches: 0,
        geneeCartAdds: 0
    });
    const [salesData, setSalesData] = useState<{ name: string, total: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
        setSelectedDate(new Date());
    }, []);

    useEffect(() => {
        if (!selectedDate) return;
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const liveStatsDocRef = doc(db, 'analytics', dateString);

        const unsubscribe = onSnapshot(liveStatsDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setLiveStats({
                    secureCodClicks: data.secureCodClicks || 0,
                    magazineVisits: data.magazineVisits || 0,
                    secureCodActiveSessions: data.secureCodActiveSessions || 0,
                    magazineActiveSessions: data.magazineActiveSessions || 0,
                    tryOnAttempts: data.tryOnAttempts || 0,
                    tryOnSuccesses: data.tryOnSuccesses || 0,
                    geneeOpens: data.geneeOpens || 0,
                    geneeSearches: data.geneeSearches || 0,
                    geneeCartAdds: data.geneeCartAdds || 0
                });
            } else {
                 setLiveStats({
                    secureCodClicks: 0,
                    magazineVisits: 0,
                    secureCodActiveSessions: 0,
                    magazineActiveSessions: 0,
                    tryOnAttempts: 0,
                    tryOnSuccesses: 0,
                    geneeOpens: 0,
                    geneeSearches: 0,
                    geneeCartAdds: 0
                });
            }
        }, (error) => {
            console.error("Error fetching live stats:", error);
        });

        return () => unsubscribe();
    }, [selectedDate]);

    useEffect(() => {
        async function loadDashboardData() {
            setLoading(true);
            try {
                const [orders, leads] = await Promise.all([
                    getCollection<EditableOrder>('orders'),
                    getCollection<EditableOrder>('leads')
                ]);
                
                const allOrders = orders;

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
                        } catch(e){}
                    });
                
                setSalesData(Object.entries(salesByDay).map(([name, total]) => ({ name, total })));

            } catch (error: any) {
                toast({ variant: 'destructive', title: "Dashboard Error" });
            } finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, [toast]);

    const isToday = selectedDate ? format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;

    return (
        <div className="grid gap-8">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-black uppercase tracking-tighter italic">Operational Intelligence</h3>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[240px] pl-3 text-left font-normal rounded-xl">
                            <span>{selectedDate ? format(selectedDate, "PPP") : "Select a date"}</span>
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => setSelectedDate(date || new Date())}
                            disabled={(date) => date > new Date()}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* AI Intelligence Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                 <Card className="border-purple-100 bg-purple-50/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Try-On Success</CardTitle>
                        <Sparkles className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{liveStats.tryOnSuccesses}</div>
                        <p className="text-[10px] text-muted-foreground">Fitting room conversions.</p>
                    </CardContent>
                </Card>
                <Card className="border-blue-100 bg-blue-50/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Genee Search</CardTitle>
                        <Search className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{liveStats.geneeSearches}</div>
                        <p className="text-[10px] text-muted-foreground">AI discovery queries.</p>
                    </CardContent>
                </Card>
                <Card className="border-green-100 bg-green-50/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-green-600 tracking-widest">Genee Sales</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{liveStats.geneeCartAdds}</div>
                        <p className="text-[10px] text-muted-foreground">Added from AI Terminal.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">COD Clicks</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{liveStats.secureCodClicks}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Mag. Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{liveStats.magazineVisits}</div>
                    </CardContent>
                </Card>
            </div>

             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card className="bg-primary text-primary-foreground border-none shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 opacity-70">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Trust Wallet Value</CardTitle>
                        <DollarSign className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black italic">₹{stats.totalSecuredValue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{stats.activeLeads}</div>
                    </CardContent>
                </Card>
                 <Card className="bg-green-600 text-white border-none shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 opacity-70">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Settled Revenue</CardTitle>
                        <CheckCircle2 className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black italic">₹{stats.successfulCharges.toFixed(2)}</div>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Refunds</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">₹{stats.totalRefunds.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
                <Card className="lg:col-span-4 rounded-[24px] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-black uppercase italic tracking-tight">Sales Velocity (7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                       <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={salesData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-3 rounded-[24px] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-black uppercase italic tracking-tight">Recent Orders</CardTitle>
                        <CardDescription>Last 5 transactions from all channels.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <RecentOrders />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
