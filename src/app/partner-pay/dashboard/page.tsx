
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageSearch, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';


const mockPartner = {
    name: 'Gupta General Store',
    balance: 7500.00,
    totalEarnings: 1250.00
};

const mockTransactions = [
    { id: 'SNC-A1B2', customerId: 'CUST-001', value: 500, date: '2024-05-24 10:30 AM' },
    { id: 'SNC-E5F6', customerId: 'CUST-002', value: 1200, date: '2024-05-24 02:15 PM' },
];

const initialParcels = [
    { id: '#SNZ-9876', customer: 'Priya S.', productName: 'Designer Watch', status: 'Waiting for Pickup', awb: 'DLV123456', courier: 'Delhivery', dispatchDate: '2024-05-23', estArrival: '2024-05-25' },
    { id: '#SNZ-9875', customer: 'Amit K.', productName: 'Leather Handbag', status: 'Picked Up', awb: 'BLD789012', courier: 'BlueDart', dispatchDate: '2024-05-22', estArrival: '2024-05-24' },
    { id: '#SNZ-9874', customer: 'Rina V.', productName: 'Sunglasses', status: 'Ready for Pickup', awb: 'XPS345678', courier: 'XpressBees', dispatchDate: '2024-05-24', estArrival: '2024-05-26' },
];


export default function PartnerPayDashboardPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [partner] = useState(mockPartner);
    const [transactions, setTransactions] = useState(mockTransactions);
    const [parcels, setParcels] = useState(initialParcels);
    const [generatedCode, setGeneratedCode] = useState('');
    const [transactionValue, setTransactionValue] = useState('');
    const [sellerTxCode, setSellerTxCode] = useState('');
    const [collectorName, setCollectorName] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    const handleLogout = () => {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/partner-pay/login');
    };

    const handleGenerateCode = () => {
        if (!transactionValue || parseFloat(transactionValue) <= 0) {
            toast({ variant: 'destructive', title: "Invalid Value", description: "Please enter a valid transaction amount." });
            return;
        }
        if (!sellerTxCode) {
            toast({ variant: 'destructive', title: "Verification Required", description: "Please enter the transaction code from the seller." });
            return;
        }

        const code = `SNZ-${uuidv4().substring(0, 8).toUpperCase()}`;
        setGeneratedCode(code);
        toast({ title: "Code Generated", description: `New code for ₹${transactionValue} created successfully.` });
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        toast({ title: "Copied!", description: "The code has been copied to your clipboard." });
    };
    
     const handleNotifyCustomer = (parcelId: string) => {
        toast({
            title: "Notification Sent!",
            description: `A WhatsApp & SMS has been sent to the customer for parcel ${parcelId}.`
        });
    };

    const handleMarkAsDelivered = (parcelId: string) => {
        if (!collectorName) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please enter the name of the person who collected the parcel." });
            return;
        }
        setParcels(prev => prev.map(p => p.id === parcelId ? {...p, status: 'Delivered'} : p));
        toast({ title: "Order Closed", description: `Parcel ${parcelId} has been marked as delivered to ${collectorName}.`});
        setCollectorName('');
        setDeliveryNotes('');
        // This would typically close the dialog, which is handled by DialogClose
    }
    
    const handleRequestCancellation = (parcelId: string) => {
        setParcels(prev => prev.map(p => p.id === parcelId ? {...p, status: 'Cancellation Requested'} : p));
        toast({ title: "Cancellation Requested", description: `A request has been sent to cancel order ${parcelId}.`});
    }

    const handleArrangeReturn = (parcelId: string) => {
        setParcels(prev => prev.map(p => p.id === parcelId ? {...p, status: 'Return Initiated'} : p));
        toast({ title: "Return Initiated", description: `The return process for ${parcelId} has been started.`});
    }


    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome, {partner.name}</h1>
                        <p className="text-muted-foreground">Your Partner Pay Dashboard.</p>
                    </div>
                     <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </header>
                
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <Card className="shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Snazzify Coin Balance</CardTitle>
                                <Wallet className="h-6 w-6 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">₹{partner.balance.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Your available digital credit.</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>Generate Payment Code</CardTitle>
                                <CardDescription className="text-xs">
                                   To generate a code, collect cash from the customer. First, enter the transaction code provided by the seller to authorize your system. Then, generate the final customer code.
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tx-value">Cash Collected (₹)</Label>
                                    <Input id="tx-value" type="number" placeholder="e.g., 500" value={transactionValue} onChange={(e) => setTransactionValue(e.target.value)} />
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                         <Button className="w-full">
                                            <QrCode className="mr-2 h-4 w-4" /> Get Customer Code
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                         <DialogHeader>
                                            <DialogTitle>Enter Seller Transaction Code</DialogTitle>
                                            <DialogDescription>
                                                To generate the final code for the customer, you must first enter the unique transaction code provided to you by the seller for this amount.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Label htmlFor="seller-tx-code">Seller Transaction Code</Label>
                                            <Input id="seller-tx-code" placeholder="Enter code from seller" value={sellerTxCode} onChange={(e) => setSellerTxCode(e.target.value)} />
                                        </div>
                                         <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <DialogClose asChild>
                                                <Button onClick={handleGenerateCode}>Confirm & Generate</Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                {generatedCode && (
                                    <div className="p-4 bg-muted rounded-lg text-center space-y-2 mt-4">
                                        <Label>Your One-Time Customer Code</Label>
                                        <p className="text-2xl font-bold font-mono tracking-widest">{generatedCode}</p>
                                        <Button size="sm" variant="outline" onClick={handleCopyCode} className="w-full">
                                            <Clipboard className="mr-2 h-4 w-4" /> Copy Code
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                         <Tabs defaultValue="logistics" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="logistics"><Package className="mr-2 h-4 w-4" /> Logistics Hub</TabsTrigger>
                                <TabsTrigger value="transactions"><Wallet className="mr-2 h-4 w-4" /> Transactions</TabsTrigger>
                            </TabsList>
                            <TabsContent value="logistics">
                                 <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Parcel Management</CardTitle>
                                        <CardDescription>Manage incoming and outgoing parcels for customers.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Parcel ID</TableHead>
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>AWB No.</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parcels.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">{p.id}</TableCell>
                                                        <TableCell>{p.customer}</TableCell>
                                                        <TableCell>{p.productName}</TableCell>
                                                        <TableCell className="font-mono text-xs">{p.awb}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={p.status === 'Picked Up' ? 'default' : 'secondary'} className={p.status === 'Picked Up' ? 'bg-green-100 text-green-800' : p.status === 'Ready for Pickup' ? 'bg-blue-100 text-blue-800' : ''}>
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button size="sm" variant="outline">Manage</Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Manage Parcel {p.id}</DialogTitle>
                                                                        <DialogDescription>For: {p.customer} ({p.productName})</DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4 py-4">
                                                                        <div>
                                                                            <h4 className="font-medium">Tracking Details</h4>
                                                                            <p className="text-sm text-muted-foreground">AWB: {p.awb} ({p.courier})</p>
                                                                            <p className="text-sm text-muted-foreground">Dispatched: {p.dispatchDate}, Est. Arrival: {p.estArrival}</p>
                                                                        </div>
                                                                         <div className="space-y-2 border-t pt-4">
                                                                            <h4 className="font-medium">Customer Actions</h4>
                                                                            <Button onClick={() => handleNotifyCustomer(p.id)} variant="secondary" className="w-full justify-start">
                                                                                <MessageSquare className="mr-2"/>Notify Customer for Pickup
                                                                            </Button>
                                                                        </div>
                                                                         <div className="space-y-2 border-t pt-4">
                                                                            <h4 className="font-medium">Close Order: Mark as Delivered</h4>
                                                                            <Label htmlFor="collector-name">Collected By</Label>
                                                                            <Input id="collector-name" placeholder="Customer's full name" value={collectorName} onChange={e => setCollectorName(e.target.value)} />
                                                                            <Label htmlFor="delivery-notes">Notes / Signed Document Reference</Label>
                                                                            <Textarea id="delivery-notes" placeholder="e.g., ID checked, document signed." value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} />
                                                                            <DialogClose asChild>
                                                                                <Button onClick={() => handleMarkAsDelivered(p.id)}><PackageCheck className="mr-2"/>Confirm Delivery</Button>
                                                                            </DialogClose>
                                                                        </div>
                                                                         <div className="space-y-2 border-t pt-4">
                                                                            <h4 className="font-medium">Other Actions</h4>
                                                                             <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button variant="outline" className="w-full justify-start"><Edit className="mr-2"/>Request Cancellation</Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader><AlertDialogTitle>Request Cancellation for {p.id}?</AlertDialogTitle><AlertDialogDescription>This action will send a cancellation request to the seller. This should only be done before the parcel is dispatched from the main warehouse.</AlertDialogDescription></AlertDialogHeader>
                                                                                    <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel><AlertDialogAction onClick={() => handleRequestCancellation(p.id)}>Yes, Request Cancellation</AlertDialogAction></AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                     <Button variant="destructive" className="w-full justify-start"><AlertTriangle className="mr-2"/>Arrange Return</Button>
                                                                                </AlertDialogTrigger>
                                                                                 <AlertDialogContent>
                                                                                    <AlertDialogHeader><AlertDialogTitle>Arrange Return for {p.id}?</AlertDialogTitle><AlertDialogDescription>If the customer has rejected the parcel, this will initiate the return process with the logistics partner and notify the seller. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                                                                    <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel><AlertDialogAction onClick={() => handleArrangeReturn(p.id)}>Yes, Arrange Return</AlertDialogAction></AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                             <TabsContent value="transactions">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Recent Transactions</CardTitle>
                                        <CardDescription>History of codes generated from your account.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code ID</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                 {transactions.map(tx => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="font-mono">{tx.id}</TableCell>
                                                        <TableCell>₹{tx.value}</TableCell>
                                                        <TableCell>{tx.date}</TableCell>
                                                    </TableRow>
                                                 ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
}

    

    