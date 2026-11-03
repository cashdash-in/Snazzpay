'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Gem, CheckCircle, 
    TrendingUp, UserPlus, 
    Search, MoreVertical, Zap,
    Trash2, Ban, Clock,
    Lock, MessageSquare, MapPin, ExternalLink,
    MousePointer2, Info, Users, Phone, Mail
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Dialog, DialogContent, 
    DialogHeader, DialogTitle, 
    DialogFooter, DialogClose,
    DialogTrigger
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, 
    DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { addDays, format } from 'date-fns';
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
    plan: string;
    status: 'Active' | 'Trial' | 'Expired';
    snapUsage: number;
    revenueGenerated: number;
    joinedAt: string;
    trialExpiresAt?: string;
    featureStats?: {
        scanToSell?: number;
        bulkSnap?: number;
        billAi?: number;
        shelfAudit?: number;
        voiceSync?: number;
    };
};

export default function ZiptallyLicensesPage() {
    const { toast } = useToast();
    const [partners, setPartners] = useState<ZiptallyPartner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedPartnerForDetail, setSelectedPartnerForDetail] = useState<ZiptallyPartner | null>(null);

    const [newPartner, setNewPartner] = useState({
        storeName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        plan: 'Standard Pro'
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
        const featureTotals = {
            scanToSell: 0,
            bulkSnap: 0,
            billAi: 0,
            shelfAudit: 0,
            voiceSync: 0
        };

        partners.forEach(p => {
            if (p.featureStats) {
                featureTotals.scanToSell += (p.featureStats.scanToSell || 0);
                featureTotals.bulkSnap += (p.featureStats.bulkSnap || 0);
                featureTotals.billAi += (p.featureStats.billAi || 0);
                featureTotals.shelfAudit += (p.featureStats.shelfAudit || 0);
                featureTotals.voiceSync += (p.featureStats.voiceSync || 0);
            }
        });

        const sortedFeatures = Object.entries(featureTotals).sort((a, b) => b[1] - a[1]);

        return {
            totalPartners: partners.length,
            monthlyRevenue: partners.reduce((sum, p) => sum + (p.revenueGenerated || 0), 0),
            totalSnaps: partners.reduce((sum, p) => sum + (p.snapUsage || 0), 0),
            topFeature: sortedFeatures[0]
        };
    }, [partners]);

    const filteredPartners = partners.filter(p => 
        (p.storeName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreatePartner = async () => {
        if (!newPartner.storeName || !newPartner.ownerName || !newPartner.email || !newPartner.password) {
            toast({ variant: 'destructive', title: "Details Required" });
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
            trialExpiresAt: trialExpiry,
            featureStats: { scanToSell: 0, bulkSnap: 0, billAi: 0, shelfAudit: 0, voiceSync: 0 }
        };

        try {
            await saveDocument('snapstock_partners', partnerData, id);
            toast({ title: "Partner Activated" });
            setNewPartner({ storeName: '', ownerName: '', email: '', phone: '', address: '', password: '', plan: 'Standard Pro' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = async (pId: string, action: 'activate' | 'deactivate' | 'delete' | 'reset-trial' | 'whatsapp-access') => {
        const partner = partners.find(p => p.id === pId);
        if (!partner) return;

        try {
            if (action === 'delete') {
                await deleteDocument('snapstock_partners', pId);
                toast({ title: "Partner Removed" });
            } else if (action === 'whatsapp-access') {
                const msg = `Hi ${partner.ownerName}, your Ziptally AI dashboard is ready!\n\nStore: ${partner.storeName}\nLogin: ${partner.email}\nPassword: ${partner.password || 'Contact Admin'}\n\nAccess here: ${window.location.origin}/ziptally/login\n\nZip your Stock with AI! ✨`;
                window.open(`https://wa.me/${sanitizePhoneNumber(partner.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
            } else {
                let updates: Partial<ZiptallyPartner> = {};
                if (action === 'activate') updates = { status: 'Active' };
                if (action === 'deactivate') updates = { status: 'Expired' };
                if (action === 'reset-trial') updates = { status: 'Trial', trialExpiresAt: addDays(new Date(), 10).toISOString() };

                await saveDocument('snapstock_partners', updates, pId);
                toast({ title: "License Updated" });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Action Failed" });
        }
    };

    return (
        <AppShell title="Ziptally Admin Central">
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-900 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active SaaS Partners</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">{stats.totalPartners}</div>
                            <Users className="h-10 w-10 text-blue-500 opacity-50" />
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-600 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-blue-100 tracking-widest">Global Snap Usage</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">{stats.totalSnaps}</div>
                            <Zap className="h-10 w-10 text-white opacity-30" />
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-600 text-white border-none shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Subscription Revenue</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-4xl font-black italic">₹{stats.monthlyRevenue.toLocaleString()}</div>
                            <TrendingUp className="h-10 w-10 text-white opacity-30" />
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-lg border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Most Used Feature</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-xl font-black uppercase italic truncate">{stats.topFeature ? stats.topFeature[0].replace(/([A-Z])/g, ' $1') : 'N/A'}</div>
                            <MousePointer2 className="h-8 w-8 text-blue-500 opacity-20" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-[32px] shadow-sm border-none bg-white overflow-hidden">
                    <CardHeader className="flex flex-col md:flex-row justify-between items-center bg-slate-50 border-b py-6 px-8 gap-4">
                        <div>
                            <CardTitle className="font-black italic uppercase tracking-tighter">Licensed Network</CardTitle>
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
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black italic uppercase text-slate-800">Register Ziptally Partner</DialogTitle>
                                    </DialogHeader>
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
                            <TableHeader><TableRow><TableHead className="pl-8">Store & Owner</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Usage</TableHead><TableHead>Revenue</TableHead><TableHead className="text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
                                ) : filteredPartners.map(p => (
                                    <TableRow key={p.id} className="group hover:bg-slate-50 transition-colors">
                                        <TableCell className="pl-8 py-5">
                                            <button 
                                                onClick={() => setSelectedPartnerForDetail(p)}
                                                className="text-left group/btn"
                                            >
                                                <div className="font-black uppercase italic text-sm group-hover/btn:text-blue-600 transition-colors flex items-center gap-2">
                                                    {p.storeName}
                                                    <Info className="h-3 w-3 opacity-0 group-hover/btn:opacity-100" />
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-bold">{p.ownerName} • {p.email}</div>
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-[9px] font-black">{p.plan || 'Standard Pro'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("font-black uppercase text-[9px]", p.status === 'Active' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-600")}>{p.status}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-black text-blue-600">{p.snapUsage || 0} Snaps</TableCell>
                                        <TableCell className="font-bold text-sm text-green-600">₹{(p.revenueGenerated || 0).toLocaleString()}</TableCell>
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

            <Dialog open={!!selectedPartnerForDetail} onOpenChange={(open) => !open && setSelectedPartnerForDetail(null)}>
                <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Partner Information - {selectedPartnerForDetail?.storeName}</DialogTitle>
                    </DialogHeader>
                    {selectedPartnerForDetail && (
                        <div className="flex flex-col">
                            <div className="bg-slate-900 p-8 text-white">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Badge className="bg-blue-600 mb-2 uppercase text-[9px] font-black italic">Partner Profile</Badge>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter">{selectedPartnerForDetail.storeName}</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedPartnerForDetail.ownerName}</p>
                                    </div>
                                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 font-black italic">{selectedPartnerForDetail.plan}</Badge>
                                </div>
                            </div>
                            <div className="p-8 space-y-8 bg-white">
                                <div className="grid grid-cols-2 gap-6 text-slate-800">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Identity</p>
                                        <p className="text-sm font-bold flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {selectedPartnerForDetail.phone}</p>
                                        <p className="text-sm font-bold flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {selectedPartnerForDetail.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Usage Data</p>
                                        <p className="text-sm font-bold flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Joined {format(new Date(selectedPartnerForDetail.joinedAt), 'PP')}</p>
                                        <p className="text-sm font-bold flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-blue-500" /> {selectedPartnerForDetail.snapUsage} Total Snaps</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-6 border-t">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Business Location</p>
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-blue-600 gap-1 hover:bg-blue-50" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPartnerForDetail.address)}`, '_blank')}>
                                            <ExternalLink className="h-3 w-3" /> Map View
                                        </Button>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                        <p className="text-sm font-bold text-slate-800 leading-relaxed italic uppercase">{selectedPartnerForDetail.address}</p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-6 bg-slate-50 border-t">
                                <DialogClose asChild><Button className="w-full h-12 rounded-xl font-black uppercase italic">Close Intelligence Profile</Button></DialogClose>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
