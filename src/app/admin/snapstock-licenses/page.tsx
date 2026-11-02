'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Gem, CheckCircle, XCircle, 
    TrendingUp, UserPlus, 
    Search, Calendar, MoreVertical, Zap,
    Share2, Trash2, ShieldCheck, RefreshCw,
    Clock, Link as LinkIcon, DollarSign
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Dialog, DialogContent, DialogDescription, 
    DialogHeader, DialogTitle, DialogTrigger, 
    DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, 
    DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { addDays, format, parseISO } from 'date-fns';

type SnapStockPartner = {
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    phone: string;
    plan: 'Basic' | 'SnapStock Pro' | 'Enterprise';
    status: 'Active' | 'Trial' | 'Expired';
    snapUsage: number;
    revenueGenerated: number;
    joinedAt: string;
    trialExpiresAt?: string;
};

export default function SnapStockLicensesPage() {
    const { toast } = useToast();
    const [partners, setPartners] = useState<SnapStockPartner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [newPartner, setNewPartner] = useState({
        storeName: '',
        ownerName: '',
        email: '',
        phone: '',
        plan: 'SnapStock Pro' as SnapStockPartner['plan']
    });

    const loadPartners = async () => {
        setIsLoading(true);
        try {
            const data = await getCollection<SnapStockPartner>('snapstock_partners');
            setPartners(data || []);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error loading partners" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
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

    const handleCreatePartner = async () => {
        if (!newPartner.storeName || !newPartner.ownerName || !newPartner.email) {
            toast({ variant: 'destructive', title: "Details Required" });
            return;
        }

        setIsSaving(true);
        const id = `SSP-${uuidv4().substring(0, 4).toUpperCase()}`;
        const trialExpiry = addDays(new Date(), 10).toISOString();
        
        const partnerData: SnapStockPartner = {
            id,
            ...newPartner,
            status: 'Trial',
            snapUsage: 0,
            revenueGenerated: 0,
            joinedAt: new Date().toISOString(),
            trialExpiresAt: trialExpiry
        };

        try {
            await saveDocument('snapstock_partners', partnerData, id);
            setPartners(prev => [partnerData, ...prev]);
            toast({ title: "Partner Registered", description: `10-day trial activated for ${newPartner.storeName}.` });
            setNewPartner({ storeName: '', ownerName: '', email: '', phone: '', plan: 'SnapStock Pro' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to save partner" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopySignupLink = () => {
        const link = `${window.location.origin}/snapstock/register`;
        navigator.clipboard.writeText(link);
        toast({ title: "Registration Link Copied", description: "Send this to shopkeepers via WhatsApp." });
    };

    const handleAction = async (partnerId: string, action: 'activate' | 'deactivate' | 'delete' | 'reset-trial') => {
        try {
            if (action === 'delete') {
                await deleteDocument('snapstock_partners', partnerId);
                setPartners(prev => prev.filter(p => p.id !== partnerId));
                toast({ title: "Partner Removed" });
            } else {
                const partner = partners.find(p => p.id === partnerId);
                if (!partner) return;

                let updates: Partial<SnapStockPartner> = {};
                if (action === 'activate') updates = { status: 'Active' };
                if (action === 'deactivate') updates = { status: 'Expired' };
                if (action === 'reset-trial') updates = { status: 'Trial', trialExpiresAt: addDays(new Date(), 10).toISOString() };

                await saveDocument('snapstock_partners', updates, partnerId);
                setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, ...updates } : p));
                toast({ title: "License Updated" });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Action Failed" });
        }
    };

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
                    <Card className="bg-blue-600 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-blue-100 tracking-widest">Total SaaS Revenue</CardTitle>
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
                            <Zap className="h-10 w-10 text-blue-500 opacity-20" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-[32px] shadow-sm border-none bg-white overflow-hidden">
                    <CardHeader className="flex flex-col md:flex-row justify-between items-center bg-slate-50 border-b py-6 px-8 gap-4">
                        <div>
                            <CardTitle className="font-black italic uppercase tracking-tighter">Licensed Shopkeepers</CardTitle>
                            <CardDescription className="text-xs uppercase font-bold tracking-widest">Managing SnapStock AI Partners</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search Partners..." 
                                    className="pl-9 h-11 w-full md:w-64 rounded-xl bg-white"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="rounded-xl h-11 font-bold uppercase italic" onClick={handleCopySignupLink}>
                                <LinkIcon className="mr-2 h-4 w-4" /> Copy Signup Link
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl h-11 font-bold uppercase italic bg-blue-600 hover:bg-blue-700">
                                        <UserPlus className="mr-2 h-4 w-4"/> New Partner
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[32px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black italic uppercase">Register SnapStock Partner</DialogTitle>
                                        <DialogDescription>Manually add a shopkeeper to the SnapStock SaaS network.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Shop/Store Name</Label>
                                            <Input value={newPartner.storeName} onChange={e => setNewPartner({...newPartner, storeName: e.target.value})} className="h-12 rounded-xl bg-slate-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Owner Name</Label>
                                            <Input value={newPartner.ownerName} onChange={e => setNewPartner({...newPartner, ownerName: e.target.value})} className="h-12 rounded-xl bg-slate-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</Label>
                                            <Input type="email" value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} className="h-12 rounded-xl bg-slate-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp Phone</Label>
                                            <Input type="tel" value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})} className="h-12 rounded-xl bg-slate-50" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg" onClick={handleCreatePartner} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="animate-spin" /> : "Activate License"}
                                            </Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-8">Store & Owner</TableHead>
                                    <TableHead>License Status</TableHead>
                                    <TableHead>Snap Usage</TableHead>
                                    <TableHead>Joined At</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead className="text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                                ) : filteredPartners.map(p => (
                                    <TableRow key={p.id} className="group hover:bg-slate-50 transition-colors">
                                        <TableCell className="pl-8 py-5">
                                            <div className="font-black uppercase italic text-sm">{p.storeName}</div>
                                            <div className="text-[10px] text-muted-foreground font-bold">{p.ownerName} • {p.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge className={cn(
                                                    "font-black uppercase text-[9px] w-fit",
                                                    p.status === 'Active' ? "bg-green-500" : (p.status === 'Trial' ? "bg-blue-500" : "bg-red-500")
                                                )}>{p.status}</Badge>
                                                {p.status === 'Trial' && p.trialExpiresAt && (
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Expires: {format(parseISO(p.trialExpiresAt), 'PP')}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-3 w-3 text-blue-500" />
                                                <span className="font-mono text-xs font-black">{p.snapUsage} Snaps</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-slate-500">{format(parseISO(p.joinedAt), 'PP')}</TableCell>
                                        <TableCell className="font-black text-slate-700">₹{p.revenueGenerated}</TableCell>
                                        <TableCell className="text-right pr-8">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none">
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'activate')} className="rounded-xl font-bold uppercase text-[10px] gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-500" /> Activate License
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'reset-trial')} className="rounded-xl font-bold uppercase text-[10px] gap-2">
                                                        <Clock className="h-4 w-4 text-blue-500" /> Reset 10-Day Trial
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'deactivate')} className="rounded-xl font-bold uppercase text-[10px] gap-2">
                                                        <Ban className="h-4 w-4 text-amber-500" /> Mark as Expired
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const msg = `Hi ${p.ownerName}! Use SnapStock AI for your shop. Get 10 days free here: ${window.location.origin}/snapstock/register`;
                                                        window.open(`https://wa.me/${p.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                    }} className="rounded-xl font-bold uppercase text-[10px] gap-2">
                                                        <MessageSquare className="h-4 w-4 text-primary" /> Send Login Info
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'delete')} className="rounded-xl font-bold uppercase text-[10px] gap-2 text-destructive">
                                                        <Trash2 className="h-4 w-4" /> Delete Partner
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!isLoading && filteredPartners.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">No licensed partners match your search.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
