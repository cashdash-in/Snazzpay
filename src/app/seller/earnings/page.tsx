
'use client';
import { useState, useEffect, useMemo } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/app/orders/page';
import { getCollection } from '@/services/firestore';
import { Loader2, DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, subMonths } from 'date-fns';

type Transaction = EditableOrder & { commission: number };

export default function SellerEarningsPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadEarnings() {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const allOrders = await getCollection<EditableOrder>('orders');
                const sellerOrders = allOrders
                    .filter(o => o.sellerId === user.uid && o.paymentStatus === 'Paid')
                    .map(o => ({...o, commission: parseFloat(o.price) * 0.05})); // Assume 5% commission for the platform
                setTransactions(sellerOrders);
            } catch (error) {
                console.error("Error loading seller earnings:", error);
            } finally {
                setLoading(false);
            }
        }
        loadEarnings();
    }, [user]);

    const { totalRevenue, totalCommission, netPayout, monthlyData } = useMemo(() => {
        const totalRevenue = transactions.reduce((sum, tx) => sum + parseFloat(tx.price), 0);
        const totalCommission = transactions.reduce((sum, tx) => sum + tx.commission, 0);
        const netPayout = totalRevenue - totalCommission;

        const monthlyProfit: { [key: string]: number } = {};
        transactions.forEach(tx => {
            const month = format(new Date(tx.date), 'MMM yyyy');
            monthlyProfit[month] = (monthlyProfit[month] || 0) + (parseFloat(tx.price) - tx.commission);
        });

        for (let i = 5; i >= 0; i--) {
            const monthKey = format(subMonths(new Date(), i), 'MMM yyyy');
            if (!monthlyProfit[monthKey]) {
                monthlyProfit[monthKey] = 0;
            }
        }
        
        const monthlyData = Object.entries(monthlyProfit)
            .map(([name, total]) => ({ name: name.split(' ')[0], total }))
            .slice(-6);

        return { totalRevenue, totalCommission, netPayout, monthlyData };
    }, [transactions]);

    if (loading) {
        return <AppShell title="My Earnings"><div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div></AppShell>;
    }
    
  return (
    <AppShell title="My Earnings">
        <Card>
            <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>
                    Summary of your sales performance and payouts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                     <div className="p-4 bg-blue-50 rounded-lg">
                        <dt className="text-sm font-medium text-blue-700 flex items-center justify-center gap-1"><DollarSign className="h-4 w-4"/>Total Revenue</dt>
                        <dd className="text-2xl font-bold text-blue-800">₹{totalRevenue.toFixed(2)}</dd>
                    </div>
                     <div className="p-4 bg-red-50 rounded-lg">
                        <dt className="text-sm font-medium text-red-700 flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4"/>Platform Commission</dt>
                        <dd className="text-2xl font-bold text-red-800">₹{totalCommission.toFixed(2)}</dd>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <dt className="text-sm font-medium text-green-700 flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4"/>Net Payout</dt>
                        <dd className="text-2xl font-bold text-green-800">₹{netPayout.toFixed(2)}</dd>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><BarChart3/>Monthly Payout</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={monthlyData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    </AppShell>
  );
}
