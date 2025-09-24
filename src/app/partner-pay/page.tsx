
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, Handshake, Info, PlusCircle, Printer, Download, Loader2, QrCode, Check, X, Eye, ShoppingBasket, BadgeCheck, Users, Settings, Gem, Percent, Calendar, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import type { ShaktiCardData } from "@/components/shakti-card";

export type PartnerData = {
    id: string; // This will be the login ID
    companyName: string;
    pan: string;
    aadhaar: string;
    address: string;
    phone: string;
    status: 'pending' | 'approved' | 'rejected';
    balance: number;
    totalCollected: number;
};

export type SellerUser = {
    id: string;
    companyName: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
};

export type TopUpRequest = {
    id: string;
    partnerId: string;
    partnerName: string;
    coinsRequested: number;
    amountPaid: number;
    paymentId: string;
    status: 'Pending Approval' | 'Approved';
    requestDate: string;
};

type RewardRules = {
    pointsPerRupee: number;
    cashbackPercentage: number;
    discountPercentage: number;
};

const initialMockCodes = [
    { id: 'SNC-A1B2-C3D4', value: '499.00', date: '2024-05-23', partner: 'Gupta General Store', status: 'Used' },
    { id: 'SNC-E5F6-G7H8', value: '1250.00', date: '2024-05-23', partner: 'Pooja Mobile Recharge', status: 'Used' },
    { id: 'SNC-J9K0-L1M2', value: '100.00', date: '2024-05-22', partner: 'Gupta General Store', status: 'Unused' },
];


export default function PartnerHubPage() {
    const { toast } = useToast();
    const [codes, setCodes] = useState(initialMockCodes);
    const [payPartners, setPayPartners] = useState<PartnerData[]>([]);
    const [payPartnerRequests, setPayPartnerRequests] = useState<PartnerData[]>([]);
    const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
    const [newCodeValue, setNewCodeValue] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');
    const [shaktiCards, setShaktiCards] = useState<ShaktiCardData[]>([]);
    const [rewardRules, setRewardRules] = useState<Record<string, RewardRules>>({});
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);
    const [selectedSellerForRules, setSelectedSellerForRules] = useState<string>('');
    const [currentSellerRules, setCurrentSellerRules] = useState<RewardRules>({ pointsPerRupee: 0.01, cashbackPercentage: 1, discountPercentage: 10 });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        function loadData() {
            const allPayPartnersJSON = localStorage.getItem('payPartners');
            const allPayPartners: PartnerData[] = allPayPartnersJSON ? JSON.parse(allPayPartnersJSON) : [];
            setPayPartners(allPayPartners.filter(p => p.status === 'approved'));
            setPayPartnerRequests(allPayPartners.filter(p => p.status === 'pending'));

            const allTopUpsJSON = localStorage.getItem('topUpRequests');
            const allTopUps: TopUpRequest[] = allTopUpsJSON ? JSON.parse(allTopUpsJSON) : [];
            setTopUpRequests(allTopUps);
            
            const allShaktiCardsJSON = localStorage.getItem('shakti_cards_db');
            const allShaktiCards: ShaktiCardData[] = allShaktiCardsJSON ? JSON.parse(allShaktiCardsJSON) : [];
            setShaktiCards(allShaktiCards);
            
            const storedRules = localStorage.getItem('shakti_card_rules_db');
            if (storedRules) {
                setRewardRules(JSON.parse(storedRules));
            }

            const approvedSellersJSON = localStorage.getItem('approved_sellers');
            const approvedSellersList: SellerUser[] = approvedSellersJSON ? JSON.parse(approvedSellersJSON) : [];
            setApprovedSellers(approvedSellersList);
        }
        loadData();
    }, []);
    
     useEffect(() => {
        if(selectedSellerForRules && rewardRules[selectedSellerForRules]) {
            setCurrentSellerRules(rewardRules[selectedSellerForRules]);
        } else {
             setCurrentSellerRules({ pointsPerRupee: 0.01, cashbackPercentage: 1, discountPercentage: 10 });
        }
    }, [selectedSellerForRules, rewardRules]);
    
    const filteredShaktiCards = useMemo(() => {
        if (!searchQuery) return shaktiCards;
        return shaktiCards.filter(card =>
            card.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.customerPhone.includes(searchQuery) ||
            card.cardNumber.includes(searchQuery)
        );
    }, [searchQuery, shaktiCards]);

    const handleGenerateCode = () => {
        if (!newCodeValue || !selectedPartner) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please select a partner and enter a value for the code.",
            });
            return;
        }

        const newCode = {
            id: `SNC-${uuidv4().substring(0, 4).toUpperCase()}-${uuidv4().substring(4, 8).toUpperCase()}`,
            value: parseFloat(newCodeValue).toFixed(2),
            date: format(new Date(), 'yyyy-MM-dd'),
            partner: payPartners.find(p => p.id === selectedPartner)?.companyName || 'Unknown Partner',
            status: 'Unused'
        };

        setCodes(prevCodes => [newCode, ...prevCodes]);

        toast({
            title: "Digital Code Generated!",
            description: `Successfully created code ${newCode.id} for ₹${newCode.value}.`,
        });

        setNewCodeValue('');
        setSelectedPartner('');
    };
    
    const handleExport = () => {
         toast({
            title: "Export Started",
            description: `Your full transaction code export will be downloaded shortly.`,
        });
    };

    const handlePayPartnerRequest = (partnerId: string, newStatus: 'approved' | 'rejected') => {
        let allPayPartnersJSON = localStorage.getItem('payPartners');
        let allPayPartners: PartnerData[] = allPayPartnersJSON ? JSON.parse(allPayPartnersJSON) : [];
        allPayPartners = allPayPartners.map(p => p.id === partnerId ? { ...p, status: newStatus } : p);
        localStorage.setItem('payPartners', JSON.stringify(allPayPartners));

        setPayPartners(allPayPartners.filter(p => p.status === 'approved'));
        setPayPartnerRequests(allPayPartners.filter(p => p.status === 'pending'));

        toast({
            title: `Request ${newStatus}`,
            description: `The Partner Pay request has been ${newStatus}.`,
        });
    };

    
    const handleApproveTopUp = async (requestId: string) => {
        const request = topUpRequests.find(r => r.id === requestId);
        if(!request || request.status === 'Approved') return;

        const updatedRequest = { ...request, status: 'Approved' as const };
        
        let allPayPartnersJSON = localStorage.getItem('payPartners');
        let allPayPartners: PartnerData[] = allPayPartnersJSON ? JSON.parse(allPayPartnersJSON) : [];
        let partner = allPayPartners.find(p => p.id === request.partnerId);

        if (partner) {
            const updatedPartner = { ...partner, balance: partner.balance + request.coinsRequested };
            allPayPartners = allPayPartners.map(p => p.id === partner!.id ? updatedPartner : p);
            localStorage.setItem('payPartners', JSON.stringify(allPayPartners));
            setPayPartners(allPayPartners.filter(p => p.status === 'approved'));
        }

        const updatedTopUps = topUpRequests.map(r => r.id === requestId ? updatedRequest : r);
        setTopUpRequests(updatedTopUps);
        localStorage.setItem('topUpRequests', JSON.stringify(updatedTopUps));

        toast({
            title: "Top-up Approved!",
            description: `${request.coinsRequested.toLocaleString()} coins added to ${request.partnerName}'s balance.`
        });
    };

    const handleSaveRules = () => {
        if (!selectedSellerForRules) {
            toast({ variant: 'destructive', title: 'No Seller Selected', description: 'Please select a seller to configure their reward rules.' });
            return;
        }
        const updatedRules = { ...rewardRules, [selectedSellerForRules]: currentSellerRules };
        setRewardRules(updatedRules);
        localStorage.setItem('shakti_card_rules_db', JSON.stringify(updatedRules));
        toast({ title: "Reward Rules Saved", description: `The new rules for ${approvedSellers.find(s => s.id === selectedSellerForRules)?.companyName} have been applied.` });
    };

    return (
        <AppShell title="Partner Pay Hub">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto">
                    <TabsTrigger value="overview"><Info className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
                     <TabsTrigger value="pay-partners">Partner Agents <Badge className="ml-2">{payPartnerRequests.length}</Badge></TabsTrigger>
                     <TabsTrigger value="topups">Top-up Requests <Badge className="ml-2">{topUpRequests.filter(r => r.status === 'Pending Approval').length}</Badge></TabsTrigger>
                    <TabsTrigger value="codes"><QrCode className="mr-2 h-4 w-4" /> Digital Codes</TabsTrigger>
                    <TabsTrigger value="shakti-admin"><Settings className="mr-2 h-4 w-4" /> Shakti Card Admin</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Snazzify Coin: The Digital Cash Ecosystem</CardTitle>
                            <CardDescription>A revolutionary system empowering local shopkeepers to act as cash collection and delivery hubs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>The Win-Win-Win Business Model</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-2 mt-2">
                                        <li><b>Shopkeeper Onboarding:</b> A local shopkeeper (Partner) signs up with their business documents and bank details. After paying a small tie-up fee, they receive a digital credit balance of "Snazzify Coins" on their dedicated mobile app.</li>
                                        <li><b>Customer Pays with Cash:</b> A customer without digital payment options pays the partner cash for their online order.</li>
                                        <li><b>Digital Code Generation:</b> The partner uses their app to instantly generate a unique, single-use "Snazzify Coin" code for the exact transaction amount. The partner's coin balance is debited.</li>
                                        <li><b>Code Sharing:</b> The partner shares this secure code with the customer via SMS, WhatsApp, or a simple printed receipt from their thermal printer.</li>
                                        <li><b>Customer Confirms Order:</b> The customer uses this code on the Snazzify website or via a phone call to finalize their purchase. The order is marked as 'Paid' and is dispatched.</li>
                                        <li><b>Logistics & Delivery Hub:</b> Logistics partners can use the trusted shopkeeper's location as a secure drop-off and pickup point for parcels in the area, creating an additional revenue stream for the partner.</li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="pay-partners" className="mt-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Partner Pay Network Requests</CardTitle>
                            <CardDescription>Manage your network of trusted shopkeepers and their digital coin balances.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader><TableRow><TableHead>Partner Name</TableHead><TableHead>Phone</TableHead><TableHead>Address</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {payPartnerRequests.length > 0 ? payPartnerRequests.map(partner => (
                                        <TableRow key={partner.id}>
                                            <TableCell>{partner.companyName}</TableCell>
                                            <TableCell>{partner.phone}</TableCell>
                                            <TableCell className="text-xs">{partner.address}</TableCell>
                                            <TableCell><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{partner.companyName} - Details</DialogTitle></DialogHeader><div className="space-y-2 text-sm"><p><strong>Partner ID:</strong> <span className="font-mono">{partner.id}</span></p><p><strong>PAN:</strong> <span className="font-mono">{partner.pan}</span></p><p><strong>Aadhaar:</strong> <span className="font-mono">{partner.aadhaar}</span></p></div></DialogContent></Dialog></TableCell>
                                            <TableCell className="text-right space-x-2"><Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handlePayPartnerRequest(partner.id, 'approved')}><Check className="mr-2 h-4 w-4" />Approve</Button><Button size="sm" variant="destructive" onClick={() => handlePayPartnerRequest(partner.id, 'rejected')}><X className="mr-2 h-4 w-4" />Reject</Button></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No pending Partner Pay requests.</TableCell></TableRow>
                                    )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Approved Partner Pay Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader><TableRow><TableHead>Partner ID</TableHead><TableHead>Name</TableHead><TableHead>Balance</TableHead><TableHead>Total Collected</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {payPartners.length > 0 ? payPartners.map(partner => (
                                        <TableRow key={partner.id}>
                                            <TableCell className="font-medium font-mono text-xs">{partner.id}</TableCell>
                                            <TableCell>{partner.companyName}</TableCell>
                                            <TableCell>₹{partner.balance.toFixed(2)}</TableCell>
                                            <TableCell>₹{partner.totalCollected.toFixed(2)}</TableCell>
                                            <TableCell><Badge variant={partner.status === 'approved' ? 'default' : 'secondary'} className={partner.status === 'approved' ? 'bg-green-100 text-green-800' : ''}>{partner.status}</Badge></TableCell>
                                            <TableCell><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{partner.companyName} - Details</DialogTitle></DialogHeader><div className="space-y-2 text-sm"><p><strong>Partner ID:</strong> <span className="font-mono">{partner.id}</span></p><p><strong>Phone:</strong> {partner.phone}</p><p><strong>Address:</strong> {partner.address}</p><p><strong>PAN:</strong> <span className="font-mono">{partner.pan}</span></p><p><strong>Aadhaar:</strong> <span className="font-mono">{partner.aadhaar}</span></p></div></DialogContent></Dialog></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No approved Partner Pay agents.</TableCell></TableRow>
                                    )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="topups" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Partner Coin Top-up Requests</CardTitle>
                            <CardDescription>Review paid top-up requests from partners and approve to credit their coin balance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Partner</TableHead>
                                        <TableHead>Coins Requested</TableHead>
                                        <TableHead>Amount Paid</TableHead>
                                        <TableHead>Payment ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {topUpRequests.length > 0 ? topUpRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>{format(new Date(req.requestDate), 'PPp')}</TableCell>
                                            <TableCell className="font-medium">{req.partnerName} <span className="text-xs text-muted-foreground font-mono">({req.partnerId})</span></TableCell>
                                            <TableCell className="font-medium text-blue-600">{req.coinsRequested.toLocaleString()}</TableCell>
                                            <TableCell className="font-medium text-green-600">₹{req.amountPaid.toFixed(2)}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.paymentId}</TableCell>
                                            <TableCell><Badge variant={req.status === 'Approved' ? 'default' : 'secondary'}>{req.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleApproveTopUp(req.id)} disabled={req.status === 'Approved'}>
                                                    {req.status === 'Approved' ? <><BadgeCheck className="mr-2 h-4 w-4" />Approved</> : <><Check className="mr-2 h-4 w-4" />Approve>}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No pending top-up requests.</TableCell></TableRow>
                                   )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="codes" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Generate Digital Code</CardTitle>
                                    <CardDescription>Create a unique payment code for a cash transaction.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="partner">Select Partner</Label>
                                        <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                                            <SelectTrigger id="partner">
                                                <SelectValue placeholder="Select a partner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {payPartners.map(p => (
                                                  <SelectItem key={p.id} value={p.id}>{p.companyName} (Balance: ₹{p.balance.toFixed(2)})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="count">Transaction Value (INR)</Label>
                                        <Input id="count" type="number" placeholder="e.g., 499.00" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full">Generate Code</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Code Generation</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will generate a new digital payment code and may debit the partner's balance. Are you sure you want to proceed?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleGenerateCode}>Yes, Generate Code</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Generated Digital Codes</CardTitle>
                                        <CardDescription>Track all generated payment codes.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                         <Button variant="outline" size="sm" onClick={handleExport}>
                                            <Download className="mr-2 h-4 w-4" /> Export All
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Value</TableHead>
                                                <TableHead>Partner</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {codes.map(code => (
                                                <TableRow key={code.id}>
                                                    <TableCell className="font-mono text-xs">{code.id}</TableCell>
                                                    <TableCell>₹{code.value}</TableCell>
                                                    <TableCell>{code.partner}</TableCell>
                                                    <TableCell>{code.date}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={code.status === 'Used' ? 'secondary' : 'default'}>{code.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                         <Button variant="ghost" size="icon">
                                                            <Printer className="h-4 w-4" />
                                                         </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="shakti-admin" className="mt-4">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Shakti Card Reward Rules</CardTitle>
                                <CardDescription>Set global or seller-specific rules for rewards.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                     <Label htmlFor="seller-select">Configure Rules for Seller</Label>
                                     <Select value={selectedSellerForRules} onValueChange={setSelectedSellerForRules}>
                                        <SelectTrigger id="seller-select"><SelectValue placeholder="Select a seller to configure" /></SelectTrigger>
                                        <SelectContent>
                                            {approvedSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}
                                        </SelectContent>
                                     </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="points-per-rupee">Points Earned Per Rupee Spent</Label>
                                    <div className="flex items-center gap-2">
                                        <Gem className="h-4 w-4 text-muted-foreground" />
                                        <Input id="points-per-rupee" type="number" value={currentSellerRules.pointsPerRupee} onChange={(e) => setCurrentSellerRules(p => ({...p, pointsPerRupee: parseFloat(e.target.value)}))} placeholder="e.g., 0.01 for 1 point per ₹100" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Example: 0.01 means 1 point per ₹100. 0.1 means 1 point per ₹10.</p>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="discount-percentage">Point-to-Rupee Discount Value</Label>
                                    <div className="flex items-center gap-2">
                                        <Percent className="h-4 w-4 text-muted-foreground" />
                                        <Input id="discount-percentage" type="number" value={currentSellerRules.discountPercentage} onChange={(e) => setCurrentSellerRules(p => ({...p, discountPercentage: parseFloat(e.target.value)}))} placeholder="e.g., 10" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">The value of points when redeemed. E.g., 10 means 10 points = ₹1 discount.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cashback-percentage">Cashback Percentage</Label>
                                    <div className="flex items-center gap-2">
                                        <Percent className="h-4 w-4 text-muted-foreground" />
                                        <Input id="cashback-percentage" type="number" value={currentSellerRules.cashbackPercentage} onChange={(e) => setCurrentSellerRules(p => ({...p, cashbackPercentage: parseFloat(e.target.value)}))} placeholder="e.g., 1 for 1%" />
                                    </div>
                                     <p className="text-xs text-muted-foreground">This feature is not yet implemented.</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSaveRules}>Save Reward Rules</Button>
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>All Shakti Card Holders</CardTitle>
                                <CardDescription>View all issued cards and their current reward balances.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, phone, or card number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <div className="overflow-x-auto h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Card / Customer</TableHead>
                                            <TableHead>Contact Info</TableHead>
                                            <TableHead>Points</TableHead>
                                            <TableHead>Cashback</TableHead>
                                            <TableHead>Expiry</TableHead>
                                            <TableHead>Seller</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredShaktiCards.length > 0 ? filteredShaktiCards.map(card => (
                                            <TableRow key={card.cardNumber}>
                                                <TableCell>
                                                    <div className="font-medium">{card.customerName}</div>
                                                    <div className="font-mono text-xs text-muted-foreground">{card.cardNumber}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{card.customerPhone}</div>
                                                    <div className="text-xs text-muted-foreground">{card.customerEmail}</div>
                                                </TableCell>
                                                <TableCell className="font-medium text-blue-600">{card.points}</TableCell>
                                                <TableCell className="font-medium text-green-600">₹{card.cashback.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-xs">{card.validThru}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{card.sellerName}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={6} className="text-center h-24">No Shakti Cards found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
