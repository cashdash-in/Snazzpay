'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Gem, CheckCircle, 
    TrendingUp, UserPlus, 
    Search, MoreVertical, Zap,
    Share2, Trash2, Ban, Clock,
    Lock, MessageSquare
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Dialog, DialogContent, 
    DialogHeader, DialogTitle, DialogTrigger, 
    DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, 
    DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { addDays } from 'date-fns';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ZiptallyPartner = {
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    password?: string;
    plan: 'Basic' | 'Ziptally Pro' | 'Enterprise';
    status: 'Active' | 'Trial' | 'Expired';
    snapUsage: number;
    revenueGenerated: number;
    joinedAt: string;
    trialExpiresAt?: string;
};

export default function ZiptallyLicensesPage() {
    const { toast } = useToast();
    const [partners, setPartners] = useState<ZiptallyPartner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [newPartner, setNewPartner] = useState({
        storeName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        plan: 'Ziptally Pro' as ZiptallyPartner['plan']
    });

    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, 'snapstock_partners'), orderBy('joinedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() } as ZiptallyPartner));
            setPartners(data);
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const stats = useMemo(() => {
        return {
            totalPartners: partners.length,
            monthlyRevenue: partners.reduce((sum, p) => {
                const val = typeof p.revenueGenerated === 'number' ? p.revenueGenerated : 0;
                return sum + val;
            }, 0),
            totalSnaps: partners.reduce((sum, p) => {
                const val = typeof p.snapUsage === 'number' ? p.snapUsage : 0;
                return sum + val;
            }, 0),
        };
    }, [partners]);

    const filteredPartners = partners.filter(p => 
        (p.storeName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreatePartner = async () => {
        if (!newPartner.storeName || !newPartner.ownerName || !newPartner.email || !newPartner.password) {
            toast({ variant: 'destructive', title: "Details Required", description: "Store name, owner name, email, and password are required." });
            return;
        }

        setIsSaving(true);
        const id = `ZIP-${uuidv4().substring(0, 4).toUpperCase()}`;
        const trialExpiry = addDays(new Date(), 10).toISOString();
        
        const partnerData: ZiptallyPartner = {
            id,
            ...newPartner,
            status: 'Active',
            snapUsage: 0,
            revenueGenerated: 0,
            joinedAt: new Date().toISOString(),
            trialExpiresAt: trialExpiry
        };

        try {
            await saveDocument('snapstock_partners', partnerData, id);
            toast({ title: "Partner Registered & Activated" });
            setNewPartner({ storeName: '', ownerName: '', email: '', phone: '', address: '', password: '', plan: 'Ziptally Pro' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = async (partnerId: string, action: 'activate' | 'deactivate' | 'delete' | 'reset-trial' | 'whatsapp-access') => {
        const partner = partners.find(p => p.id === partnerId);
        if (!partner) return;

        try {
            if (action === 'delete') {
                await deleteDocument('snapstock_partners', partnerId);
                toast({ title: "Partner Removed" });
            } else if (action === 'whatsapp-access') {
                const msg = `Hi ${partner.ownerName}, your Ziptally AI dashboard is ready!\n\nStore: ${partner.storeName}\nLogin: ${partner.email}\nPassword: ${partner.password || 'Contact Admin'}\n\nAccess here: ${window.location.origin}/ziptally/login\n\nZip your Stock with AI! ✨`;
                window.open(`https://wa.me/${sanitizePhoneNumber(partner.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
                toast({ title: "Opening WhatsApp..." });
            } else {
                let updates: Partial<ZiptallyPartner> = {};
                if (action === 'activate') updates = { status: 'Active' };
                if (action === 'deactivate') updates = { status: 'Expired' };
                if (action === 'reset-trial') updates = { status: 'Trial', trialExpiresAt: addDays(new Date(), 10).toISOString() };

                await saveDocument('snapstock_partners', updates, partnerId);
                toast({ title: "License Updated" });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Action Failed" });
        }
    };

    return (
        <AppShell title="Ziptally License Hub">
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-900 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active SaaS Partners</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">{stats.totalPartners}</div>
                            <Gem className="h-10 w-10 text-primary opacity-50" />
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-600 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-blue-100 tracking-widest">SaaS Payouts</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">₹{stats.monthlyRevenue.toLocaleString()}</div>
                            <TrendingUp className="h-10 w-10 text-white opacity-30" />
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-lg border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Network Snap Usage</CardTitle>
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
                            <CardTitle className="font-black italic uppercase tracking-tighter">Licensed Network</CardTitle>
                            <CardDescription className="text-xs uppercase font-bold tracking-widest">Managing Ziptally AI Partners</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search Partners..." className="pl-9 h-11 w-full md:w-64 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl h-11 font-bold uppercase italic bg-blue-600 hover:bg-blue-700">
                                        <UserPlus className="mr-2 h-4 w-4"/> New Partner
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[32px] max-w-2xl">
                                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Register Ziptally Partner</DialogTitle></DialogHeader>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
                                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Store Name</Label><Input value={newPartner.storeName} onChange={e => setNewPartner({...newPartner, storeName: e.target.value})} className="h-12 rounded-xl bg-slate-50" /></div>
                                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Owner Name</Label><Input value={newPartner.ownerName} onChange={e => setNewPartner({...newPartner, ownerName: e.target.value})} className="h-12 rounded-xl bg-slate-50" /></div>
                                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Email</Label><Input type="email" value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} className="h-12 rounded-xl bg-slate-50" /></div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">Login Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                                <Input type="text" value={newPartner.password} onChange={e => setNewPartner({...newPartner, password: e.target.value})} className="h-12 rounded-xl bg-slate-50 pl-9" placeholder="Set a temporary password" />
                                            </div>
                                        </div>
                                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Phone</Label><Input type="tel" value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})} className="h-12 rounded-xl bg-slate-50" /></div>
                                        <div className="md:col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Shop Address</Label><Input value={newPartner.address} onChange={e => setNewPartner({...newPartner, address: e.target.value})} className="h-12 rounded-xl bg-slate-50" /></div>
                                    </div>
                                    <DialogFooter><DialogClose asChild><Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg" onClick={handleCreatePartner} disabled={isSaving}>Activate License</Button></DialogClose></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead className="pl-8">Store & Owner</TableHead><TableHead>Status</TableHead><TableHead>Snap Usage</TableHead><TableHead>Revenue</TableHead><TableHead className="text-right pr-8">Actions</TableHead></TableRow></TableHeader>
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
                                            <Badge className={cn("font-black uppercase text-[9px]", p.status === 'Active' ? "bg-green-50 text-green-700" : p.status === 'Trial' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600")}>{p.status}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-black text-blue-600">
                                            {p.snapUsage || 0} Snaps
                                        </TableCell>
                                        <TableCell className="font-black text-slate-700">
                                            ₹{p.revenueGenerated || 0}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'whatsapp-access')} className="rounded-xl font-bold uppercase text-[10px] gap-2"><MessageSquare className="h-4 w-4 text-green-500" /> WhatsApp Access</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'activate')} className="rounded-xl font-bold uppercase text-[10px] gap-2"><CheckCircle className="h-4 w-4 text-blue-500" /> Mark Active</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'reset-trial')} className="rounded-xl font-bold uppercase text-[10px] gap-2"><Clock className="h-4 w-4 text-purple-500" /> Reset Trial</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'deactivate')} className="rounded-xl font-bold uppercase text-[10px] gap-2"><Ban className="h-4 w-4 text-amber-500" /> Mark Expired</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction(p.id, 'delete')} className="rounded-xl font-bold uppercase text-[10px] gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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