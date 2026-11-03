'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/types/order';
import type { SellerProduct } from '@/types/product';
import { getCollection } from '@/services/firestore';
import { 
    Loader2, DollarSign, TrendingUp, TrendingDown, 
    BarChart3, Calendar as CalendarIcon, Download, 
    Package, ArrowRight, Percent, PieChart, ShieldCheck
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subMonths, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

type ProductProfitData = {
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    cogs: number; // Cost of Goods Sold
    commission: number;
    netProfit: number;
};

export default function SellerEarningsPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [myProducts, setMyProducts] = useState<SellerProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 1),
        to: new Date()
    });

    useEffect(() => {
        async function loadData() {
            if (!user) return;
            setLoading(true);
            try {
                const [allOrders, allSellerProducts] = await Promise.all([
                    getCollection<EditableOrder>('orders'),
                    getCollection<SellerProduct>('seller_products')
                ]);

                setOrders(allOrders.filter(o => o.sellerId === user.uid && o.paymentStatus === 'Paid'));
                setMyProducts(allSellerProducts.filter(p => p.sellerId === user.uid));
            } catch (error) {
                console.error("Error loading P&L data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user]);

    const filteredData = useMemo(() => {
        if (!dateRange?.from) return { 
            displayOrders: [], 
            totalRevenue: 0, 
            totalCommission: 0, 
            totalCogs: 0, 
            netProfit: 0, 
            productProfitMap: [] 
        };

        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);

        const displayOrders = orders.filter(o => {
            try {
                const oDate = parseISO(o.date);
                return isWithinInterval(oDate, { start, end });
            } catch (e) { return false; }
        });

        const profitMap = new Map<string, ProductProfitData>();

        let totalRevenue = 0;
        let totalCommission = 0;
        let totalCogs = 0;

        displayOrders.forEach(o => {
            const rev = parseFloat(o.price || '0');
            const comm = rev * 0.05; // 5% platform commission
            const productRef = myProducts.find(p => p.id === o.productId);
            const cost = productRef ? (productRef as any).costPrice || 0 : 0;
            const itemCogs = cost * o.quantity;

            totalRevenue += rev;
            totalCommission += comm;
            totalCogs += itemCogs;

            const existing = profitMap.get(o.productId || 'unknown') || {
                productId: o.productId || 'unknown',
                name: o.productOrdered,
                unitsSold: 0,
                revenue: 0,
                cogs: 0,
                commission: 0,
                netProfit: 0
            };

            existing.unitsSold += o.quantity;
            existing.revenue += rev;
            existing.cogs += itemCogs;
            existing.commission += comm;
            existing.netProfit += (rev - itemCogs - comm);

            profitMap.set(o.productId || 'unknown', existing);
        });

        return {
            displayOrders,
            totalRevenue,
            totalCommission,
            totalCogs,
            netProfit: totalRevenue - totalCogs - totalCommission,
            productProfitMap: Array.from(profitMap.values()).sort((a, b) => b.netProfit - a.netProfit)
        };
    }, [orders, myProducts, dateRange]);

    const handleExportPL = () => {
        if (filteredData.productProfitMap.length === 0) return;
        
        const data = filteredData.productProfitMap.map(p => ({
            'Product Name': p.name,
            'Units Sold': p.unitsSold,
            'Gross Revenue (₹)': p.revenue.toFixed(2),
            'COGS (₹)': p.cogs.toFixed(2),
            'Platform Fee (₹)': p.commission.toFixed(2),
            'Net Profit (₹)': p.netProfit.toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ProfitLoss");
        XLSX.writeFile(wb, `PL_Statement_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    if (loading) {
        return (
            <AppShell title="P&L Dashboard">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="Profit & Loss Statement">
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[24px] shadow-sm border">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">Business Intelligence</h2>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Financial Performance & Analytics</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-12 px-6 rounded-xl font-bold justify-start min-w-[240px]">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button variant="default" className="h-12 px-6 rounded-xl font-black uppercase italic" onClick={handleExportPL}>
                            <Download className="mr-2 h-4 w-4" /> Export P&L
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-[24px] border-none shadow-lg bg-blue-600 text-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-blue-100 tracking-widest">Gross Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black italic">₹{filteredData.totalRevenue.toLocaleString()}</div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-200 mt-1 uppercase">
                                <Package className="h-3 w-3" /> {filteredData.displayOrders.length} Paid Orders
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[24px] border-none shadow-lg bg-slate-900 text-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Platform Fee (5%)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black italic text-red-400">-₹{filteredData.totalCommission.toLocaleString()}</div>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Snazzify Service Fee</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[24px] border-none shadow-lg bg-white overflow-hidden border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Direct Costs (COGS)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black italic text-slate-900">₹{filteredData.totalCogs.toLocaleString()}</div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Stock Purchase Value</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[24px] border-none shadow-xl bg-green-600 text-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-green-100 tracking-widest">Total Net Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black italic">₹{filteredData.netProfit.toLocaleString()}</div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-green-200 mt-1 uppercase">
                                <TrendingUp className="h-3 w-3" /> {((filteredData.netProfit / filteredData.totalRevenue) * 100 || 0).toFixed(1)}% Margin
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-black italic uppercase">Product-Wise Profit Ledger</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Item breakdown for selected range</CardDescription>
                            </div>
                            <PieChart className="h-5 w-5 text-slate-300" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-8">Product Name</TableHead>
                                        <TableHead className="text-center">Units</TableHead>
                                        <TableHead>Revenue</TableHead>
                                        <TableHead>Costs</TableHead>
                                        <TableHead className="text-right pr-8">Net Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.productProfitMap.map((p) => (
                                        <TableRow key={p.productId} className="group hover:bg-slate-50 transition-colors">
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black uppercase text-xs italic text-slate-800">{p.name}</span>
                                                    <span className="text-[9px] font-mono text-muted-foreground">SKU: {p.productId.substring(0,8)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-slate-600">{p.unitsSold}</TableCell>
                                            <TableCell className="font-bold text-xs text-blue-600">₹{p.revenue.toLocaleString()}</TableCell>
                                            <TableCell className="font-bold text-xs text-slate-400">₹{(p.cogs + p.commission).toLocaleString()}</TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Badge className={cn(
                                                    "font-black italic text-xs px-3",
                                                    p.netProfit >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                                )}>
                                                    ₹{p.netProfit.toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredData.productProfitMap.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic font-medium">
                                                No sales recorded in this date range.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b">
                                <CardTitle className="text-base font-black italic uppercase">Profit Velocity</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={filteredData.productProfitMap.slice(0, 5)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} hide />
                                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                cursor={{fill: 'transparent'}}
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="netProfit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest mt-4">Top 5 Profitable Products</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[32px] border-none shadow-lg bg-indigo-900 text-white overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-lg font-black italic uppercase text-indigo-200">Financial Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center border-b border-indigo-800 pb-3">
                                    <span className="text-xs font-bold text-indigo-300">Net Profit Margin</span>
                                    <span className="text-xl font-black italic">{((filteredData.netProfit / filteredData.totalRevenue) * 100 || 0).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-indigo-800 pb-3">
                                    <span className="text-xs font-bold text-indigo-300">Avg. Profit Per Item</span>
                                    <span className="text-xl font-black italic">₹{(filteredData.netProfit / filteredData.displayOrders.length || 0).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-300">Fee to Revenue Ratio</span>
                                    <span className="text-xl font-black italic">5.0%</span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-indigo-950 p-4">
                                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-indigo-400">
                                    <ShieldCheck className="h-3 w-3" /> Audited by Snazzify AI Financial
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
