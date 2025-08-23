
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, Handshake, Info, PlusCircle, Printer, Download, Loader2, QrCode, Check, X } from 'lucide-react';
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
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

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

// Mock Data - Replace with real data later
const mockOrders = [
    { id: '#PP-1001', customer: 'Ravi Kumar', partner: 'Gupta General Store', coinCode: 'SNZ-A1B2-C3D4', amount: '499.00', status: 'Paid' },
    { id: '#PP-1002', customer: 'Priya Sharma', partner: 'Pooja Mobile Recharge', coinCode: 'SNZ-E5F6-G7H8', amount: '1250.00', status: 'Paid' },
];

const initialMockCodes = [
    { id: 'SNC-A1B2-C3D4', value: '499.00', date: '2024-05-23', partner: 'Gupta General Store', status: 'Used' },
    { id: 'SNC-E5F6-G7H8', value: '1250.00', date: '2024-05-23', partner: 'Pooja Mobile Recharge', status: 'Used' },
    { id: 'SNC-J9K0-L1M2', value: '100.00', date: '2024-05-22', partner: 'Gupta General Store', status: 'Unused' },
];


export default function PartnerPayPage() {
    const { toast } = useToast();
    const [codes, setCodes] = useState(initialMockCodes);
    const [partners, setPartners] = useState<PartnerData[]>([]);
    const [partnerRequests, setPartnerRequests] = useState<PartnerData[]>([]);
    const [newCodeValue, setNewCodeValue] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');

     useEffect(() => {
        const allPartnersJSON = localStorage.getItem('payPartners');
        const allPartners: PartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
        setPartners(allPartners.filter(p => p.status === 'approved'));
        setPartnerRequests(allPartners.filter(p => p.status === 'pending'));
    }, []);

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
            partner: partners.find(p => p.id === selectedPartner)?.companyName || 'Unknown Partner',
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

    const handleUpdateRequest = (partnerId: string, newStatus: 'approved' | 'rejected') => {
        const allPartnersJSON = localStorage.getItem('payPartners');
        let allPartners: PartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
        
        allPartners = allPartners.map(p => p.id === partnerId ? { ...p, status: newStatus } : p);
        localStorage.setItem('payPartners', JSON.stringify(allPartners));
        
        setPartners(allPartners.filter(p => p.status === 'approved'));
        setPartnerRequests(allPartners.filter(p => p.status === 'pending'));

        toast({
            title: `Request ${newStatus}`,
            description: `The partner request has been ${newStatus}.`,
        });
    };

    return (
        <AppShell title="Partner Pay System">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
                    <TabsTrigger value="overview">
                        <Info className="mr-2 h-4 w-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="partners">
                        <Handshake className="mr-2 h-4 w-4" /> Partners
                    </TabsTrigger>
                     <TabsTrigger value="requests">
                        Partner Requests <Badge className="ml-2">{partnerRequests.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="codes">
                        <QrCode className="mr-2 h-4 w-4" /> Digital Codes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
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
                 <TabsContent value="partners">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Partner Network</CardTitle>
                                <CardDescription>Manage your network of trusted shopkeepers and their digital coin balances.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Partner ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Balance</TableHead>
                                        <TableHead>Total Collected</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {partners.map(partner => (
                                        <TableRow key={partner.id}>
                                            <TableCell className="font-medium">{partner.id}</TableCell>
                                            <TableCell>{partner.companyName}</TableCell>
                                            <TableCell>₹{partner.balance.toFixed(2)}</TableCell>
                                            <TableCell>₹{partner.totalCollected.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant={partner.status === 'approved' ? 'default' : 'secondary'} className={partner.status === 'approved' ? 'bg-green-100 text-green-800' : ''}>
                                                    {partner.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="requests">
                     <Card>
                        <CardHeader>
                            <CardTitle>Partner Signup Requests</CardTitle>
                            <CardDescription>Review and approve new partners to join the Snazzify Coin network.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>PAN</TableHead>
                                        <TableHead>Aadhaar</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {partnerRequests.length > 0 ? partnerRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.companyName}</TableCell>
                                            <TableCell>{req.phone}</TableCell>
                                            <TableCell className="text-xs">{req.address}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.pan}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.aadhaar}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateRequest(req.id, 'approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req.id, 'rejected')}><X className="mr-2 h-4 w-4" />Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No pending requests.</TableCell></TableRow>
                                   )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="codes">
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
                                                {partners.map(p => (
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
            </Tabs>
        </AppShell>
    )
}
