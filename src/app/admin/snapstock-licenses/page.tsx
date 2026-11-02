'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Gem, CheckCircle, XCircle, 
    TrendingUp, DollarSign, UserPlus, 
    Search, Calendar, MoreVertical, Zap
} from 'lucide-react';
import { getCollection, saveDocument } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type SnapStockPartner = {
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    plan: 'Basic' | 'SnapStock Pro' | 'Enterprise';
    status: 'Active' | 'Trial' | 'Expired';
    snapUsage: number;
    revenueGenerated: number;
    joinedAt: string;
};

export default function SnapStockLicensesPage() {
    const { toast } = useToast();
    const [partners, setPartners] = useState<SnapStockPartner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadPartners() {
            try {
                const data = await getCollection<SnapStockPartner>('snapstock_partners');
                if (data.length === 0) {
                    // Initial Mock Data for SaaS demo
                    const mockPartners: SnapStockPartner[] = [
                        { id: 'SSP-001', storeName: 'Komal Electronics', ownerName: 'Rajesh G.', email: 'komal@example.com', plan: 'SnapStock Pro', status: 'Active', snapUsage: 450, revenueGenerated: 1499, joinedAt: '2024-05-10' },
                        { id: 'SSP-002', storeName: 'Green Grocers', ownerName: 'Anita S.', email: 'green@example.com', plan: 'Basic', status: 'Trial', snapUsage: 12, revenueGenerated: 0, joinedAt: '2024-05-20' },
                    ];
                    setPartners(mockPartners);
                } else {
                    setPartners(data);
                }
            } catch (e) {
                toast({ variant: 'destructive', title: "Error loading partners" });
            } finally {
                setIsLoading(false);
            }
        }
        loadPartners();
    }, [toast]);

    const stats = useMemo(() => {
        return {
            totalPartners: partners.length,
            monthlyRevenue: partners.reduce((sum, p) => sum + p.revenueGenerated, 0),
            totalSnaps: partners.reduce((sum, p) => sum + p.snapUsage, 0),
        };
    }, [partners]);

    const filteredPartners = partners.filter(p => 
        p.storeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppShell title="SnapStock License Hub">
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-900 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SaaS Partner Count</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">{stats.totalPartners}</div>
                            <Gem className="h-10 w-10 text-primary opacity-50" />
                        </CardContent>
                    </Card>
                    <Card className="bg-green-600 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-green-100 tracking-widest">Total SaaS Revenue</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">₹{stats.monthlyRevenue.toLocaleString()}</div>
                            <TrendingUp className="h-10 w-10 text-white opacity-30" />
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-lg border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Snap Usage</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic text-slate-900">{stats.totalSnaps}</div>
                            <Zap className="h-10 w-10 text-primary opacity-20" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-[32px] shadow-sm border-none bg-white overflow-hidden">
                    <CardHeader className="flex flex-row justify-between items-center bg-slate-50 border-b py-6 px-8">
                        <div>
                            <CardTitle className="font-black italic uppercase tracking-tighter">Licensed Shopkeepers</CardTitle>
                            <CardDescription className="text-xs uppercase font-bold tracking-widest">Managing SnapStock AI Partners</CardDescription>
                        </div>
                        <div className="flex gap-4">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search Partners..." 
                                    className="pl-9 h-10 w-64 rounded-xl"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button className="rounded-xl font-bold uppercase italic"><UserPlus className="mr-2 h-4 w-4"/> New Partner</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-8">Store & Owner</TableHead>
                                    <TableHead>Plan Tier</TableHead>
                                    <TableHead>Snap Usage</TableHead>
                                    <TableHead>License Status</TableHead>
                                    <TableHead>Total Paid</TableHead>
                                    <TableHead className="text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                                ) : filteredPartners.map(p => (
                                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell className="pl-8 py-4">
                                            <div className="font-black uppercase italic text-sm">{p.storeName}</div>
                                            <div className="text-[10px] text-muted-foreground font-bold">{p.ownerName} • {p.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black",
                                                p.plan === 'SnapStock Pro' && "bg-purple-50 text-purple-700 border-purple-200"
                                            )}>{p.plan}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-3 w-3 text-amber-500" />
                                                <span className="font-mono text-xs font-black">{p.snapUsage}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "font-black uppercase text-[9px]",
                                                p.status === 'Active' ? "bg-green-500" : "bg-amber-500"
                                            )}>{p.status}</Badge>
                                        </TableCell>
                                        <TableCell className="font-black text-slate-700">₹{p.revenueGenerated}</TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
