
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck, CheckCircle, Copy, User, Phone, Home } from "lucide-react";
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
import { getRazorpayKeyId } from '@/app/actions';


const mockPartner = {
    name: 'Gupta General Store',
    balance: 7500.00,
    totalEarnings: 1250.00
};

const mockTransactions = [
    { id: 'SNC-A1B2', customerName: 'Rohan Sharma', customerPhone: '9876543210', value: 500, date: '2024-05-24 10:30 AM' },
    { id: 'SNC-E5F6', customerName: 'Aditi Singh', customerPhone: '9123456789', value: 1200, date: '2024-05-24 02:15 PM' },
];

const initialParcels = [
    { id: '#SNZ-9876', customer: 'Priya S.', customerPhone: '9988776655', productName: 'Designer Watch', status: 'Waiting for Pickup', awb: 'DLV123456', courier: 'Delhivery', dispatchDate: '2024-05-23', estArrival: '2024-05-25' },
    { id: '#SNZ-9875', customer: 'Amit K.', customerPhone: '9876543211', productName: 'Leather Handbag', status: 'Picked Up', awb: 'BLD789012', courier: 'BlueDart', dispatchDate: '2024-05-22', estArrival: '2024-05-24' },
    { id: '#SNZ-9874', customer: 'Rina V.', customerPhone: '9123456780', productName: 'Sunglasses', status: 'Ready for Pickup', awb: 'XPS345678', courier: 'XpressBees', dispatchDate: '2024-05-24', estArrival: '2024-05-26' },
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
    const [confirmedSellerTxCode, setConfirmedSellerTxCode] = useState('');
    const [isSettling, setIsSettling] = useState(false);
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);

    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });

    const [collectorName, setCollectorName] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    
    useEffect(() => {
        getRazorpayKeyId().then(key => {
            if (key) {
                setRazorpayKeyId(key);
            } else {
                 toast({ variant: 'destructive', title: "Configuration Error", description: "Could not fetch Razorpay Key ID from the server." });
            }
        });
    }, [toast]);

    const handleLogout = () => {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/partner-pay/login');
    };
    
    const handleSettleWithSeller = async () => {
        if (!transactionValue || parseFloat(transactionValue) <= 0) {
            toast({ variant: 'destructive', title: "Invalid Value", description: "Please enter a valid transaction amount." });
            return;
        }
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Configuration Error", description: "Razorpay Key ID is not set. Please configure it in the main app settings." });
            return;
        }
        setIsSettling(true);
        
        try {
            const response = await fetch('/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: transactionValue,
                    customerName: partner.name, // The partner is settling
                    isPartnerSettlement: true
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const options = {
                key: razorpayKeyId,
                order_id: result.order_id,
                name: "Settle with Snazzify Seller",
                description: `Settlement of ₹${transactionValue}`,
                handler: (response: any) => {
                    setConfirmedSellerTxCode(response.razorpay_payment_id);
                    toast({ title: "Settlement Successful!", description: `Payment of ₹${transactionValue} confirmed. Your Transaction Code is generated.` });
                    setIsSettling(false);
                },
                prefill: {
                    name: partner.name,
                },
                theme: { color: "#5a31f4" },
                modal: {
                    ondismiss: () => {
                        setIsSettling(false);
                        toast({ variant: 'destructive', title: 'Payment Cancelled' });
                    }
                }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsSettling(false);
        }
    };

    const handleGenerateCustomerCode = () => {
        if (!sellerTxCode) {
            toast({ variant: 'destructive', title: "Verification Required", description: "Please enter the confirmed Seller Transaction Code." });
            return;
        }
        
        const code = `SNZ-CUST-${uuidv4().substring(0, 8).toUpperCase()}`;
        setGeneratedCode(code);
        const newTransaction = {
             id: code, 
             customerName: customerInfo.name, 
             customerPhone: customerInfo.phone, 
             value: parseFloat(transactionValue), 
             date: format(new Date(), 'yyyy-MM-dd p')
        };
        setTransactions(prev => [newTransaction, ...prev]);
        toast({ title: "Customer Code Generated", description: `New code for ₹${transactionValue} created successfully.` });
    };


    const handleCopyCode = (codeToCopy: string) => {
        navigator.clipboard.writeText(codeToCopy);
        toast({ title: "Copied!", description: "The code has been copied to your clipboard." });
    };
    
     const handleNotifyCustomer = (parcelId: string) => {
        setParcels(prev => prev.map(p => p.id === parcelId ? {...p, status: 'Notified'} : p));
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
                                   Collect cash, settle with seller online, then generate a code for the customer.
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tx-value">Cash Collected (₹)</Label>
                                    <Input id="tx-value" type="number" placeholder="e.g., 500" value={transactionValue} onChange={(e) => setTransactionValue(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Customer Details (for your records)</Label>
                                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-name" placeholder="Customer Name" value={customerInfo.name} onChange={(e) => setCustomerInfo(p => ({...p, name: e.target.value}))} className="pl-9" /></div>
                                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-phone" placeholder="Customer Phone" value={customerInfo.phone} onChange={(e) => setCustomerInfo(p => ({...p, phone: e.target.value}))} className="pl-9" /></div>
                                     <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-address" placeholder="Customer Address" value={customerInfo.address} onChange={(e) => setCustomerInfo(p => ({...p, address: e.target.value}))} className="pl-9" /></div>
                                </div>
                                <Dialog onOpenChange={(open) => { if (!open) setConfirmedSellerTxCode('') }}>
                                    <DialogTrigger asChild>
                                         <Button className="w-full">
                                            <QrCode className="mr-2 h-4 w-4" /> Settle with Seller & Get Code
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Step 1: Settle with Seller</DialogTitle>
                                            <DialogDescription>
                                                To get a customer code, you must first pay the seller ₹{transactionValue || '0.00'} online. Click below to open the payment gateway.
                                            </DialogDescription>
                                        </DialogHeader>
                                        
                                        {!confirmedSellerTxCode ? (
                                            <div className="py-4 text-center">
                                                <Button onClick={handleSettleWithSeller} disabled={isSettling}>
                                                    {isSettling ? 'Processing...' : `Pay Seller ₹${transactionValue || '0.00'} Now`}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="py-4 space-y-3 text-center bg-green-50 p-4 rounded-lg">
                                                <CheckCircle className="mx-auto h-10 w-10 text-green-600"/>
                                                <h3 className="font-semibold">Payment Confirmed!</h3>
                                                <p className="text-sm text-muted-foreground">Copy your unique Seller Transaction Code below.</p>
                                                <div className="flex items-center gap-2 p-2 bg-background border rounded-md">
                                                    <Input readOnly value={confirmedSellerTxCode} className="font-mono text-sm border-0 bg-transparent shadow-none focus-visible:ring-0"/>
                                                    <Button variant="ghost" size="icon" onClick={() => handleCopyCode(confirmedSellerTxCode)}>
                                                        <Copy className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                         <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Close</Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                {generatedCode ? (
                                     <div className="p-4 bg-muted rounded-lg text-center space-y-2 mt-4">
                                        <Label>Your One-Time Customer Code</Label>
                                        <p className="text-2xl font-bold font-mono tracking-widest">{generatedCode}</p>
                                        <Button size="sm" variant="outline" onClick={() => handleCopyCode(generatedCode)} className="w-full">
                                            <Clipboard className="mr-2 h-4 w-4" /> Copy Customer Code
                                        </Button>
                                    </div>
                                ) : (
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" className="w-full mt-2">I have my Seller Code</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Step 2: Generate Customer Code</DialogTitle>
                                                <DialogDescription>
                                                   Enter the confirmed Seller Transaction Code to generate the final code for your customer.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-2">
                                                <Label htmlFor="seller-tx-code">Seller Transaction Code</Label>
                                                <Input id="seller-tx-code" placeholder="Paste code here e.g. pay_..." value={sellerTxCode} onChange={(e) => setSellerTxCode(e.target.value)} />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button onClick={handleGenerateCustomerCode}>Generate for Customer</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
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
                                                        <TableCell>
                                                            <div className="font-medium">{p.customer}</div>
                                                            <div className="text-xs text-muted-foreground">{p.customerPhone}</div>
                                                        </TableCell>
                                                        <TableCell>{p.productName}</TableCell>
                                                        <TableCell className="font-mono text-xs">{p.awb}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={p.status === 'Picked Up' ? 'default' : 'secondary'} className={p.status === 'Picked Up' ? 'bg-green-100 text-green-800' : p.status === 'Ready for Pickup' ? 'bg-blue-100 text-blue-800' : p.status === 'Notified' ? 'bg-yellow-100 text-yellow-800' : ''}>
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
                                                                        <DialogDescription>For: {p.customer} ({p.customerPhone}) - {p.productName}</DialogDescription>
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
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                 {transactions.map(tx => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="font-mono">{tx.id}</TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{tx.customerName}</div>
                                                            <div className="text-xs text-muted-foreground">{tx.customerPhone}</div>
                                                        </TableCell>
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
