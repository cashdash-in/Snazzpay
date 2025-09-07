
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck, CheckCircle, Copy, User, Phone, Home, Loader2, Coins, BarChart3, TrendingUp, TrendingDown, Search } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { format, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { getRazorpayKeyId } from '@/app/actions';
import type { PartnerData } from '../page';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import type { ShaktiCardData } from '@/components/shakti-card';


type TransactionStatus = 'In Process' | 'Completed' | 'Refunded' | 'Refund Requested';

type Transaction = {
    id: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    value: number;
    date: string; // ISO string for accurate time checks
    status: TransactionStatus;
    sellerTransactionCode?: string;
    customerCode?: string;
    commission: number; // Profit from this transaction
    shaktiCardNumber?: string;
    discountApplied?: number;
};

type CashCode = {
    code: string;
    amount: number;
    partnerId: string;
    partnerName: string;
    status: 'Pending' | 'Settled';
};

type TopUpRequest = {
    id: string;
    partnerId: string;
    partnerName: string;
    coinsRequested: number;
    amountPaid: number;
    paymentId: string;
    status: 'Pending Approval' | 'Approved';
    requestDate: string;
};

type VerifiedCardInfo = ShaktiCardData & { 
    discount: number 
};


const initialTransactions: Transaction[] = [];

const initialParcels = [
    { id: '#SNZ-9876', customer: 'Priya S.', customerPhone: '9988776655', customerAddress: 'A-101, Rose Apartments, Mumbai', productName: 'Designer Watch', status: 'Waiting for Pickup', awb: 'DLV123456', courier: 'Delhivery', dispatchDate: '2024-05-23', estArrival: '2024-05-25' },
    { id: '#SNZ-9875', customer: 'Amit K.', customerPhone: '9876543211', customerAddress: 'B-202, Lotus Towers, Pune', productName: 'Leather Handbag', status: 'Picked Up', awb: 'BLD789012', courier: 'BlueDart', dispatchDate: '2024-05-22', estArrival: '2024-05-24' },
    { id: '#SNZ-9874', customer: 'Rina V.', customerPhone: '9123456780', customerAddress: 'C-303, Tulip Gardens, Delhi', productName: 'Sunglasses', status: 'Ready for Pickup', awb: 'XPS345678', courier: 'XpressBees', dispatchDate: '2024-05-24', estArrival: '2024-05-26' },
];

const coinPackages = [
    { coins: 10000, price: 100, label: "10,000 Coins" },
    { coins: 50000, price: 500, label: "50,000 Coins" },
    { coins: 100000, price: 1000, label: "1,00,000 Coins" },
];


export default function PartnerPayDashboardPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [partner, setPartner] = useState<PartnerData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [parcels, setParcels] = useState(initialParcels);
    const [transactionValue, setTransactionValue] = useState('');
    const [isSettling, setIsSettling] = useState(false);
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [sellerCodeToProcess, setSellerCodeToProcess] = useState('');
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [collectorName, setCollectorName] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [cashAmount, setCashAmount] = useState('');
    const [isToppingUp, setIsToppingUp] = useState(false);
    const [shaktiCardNumber, setShaktiCardNumber] = useState('');
    const [verifiedCardInfo, setVerifiedCardInfo] = useState<VerifiedCardInfo | null>(null);
    const [isVerifyingCard, setIsVerifyingCard] = useState(false);


    useEffect(() => {
        const loggedInPartnerId = localStorage.getItem('loggedInPartnerId');
        if (!loggedInPartnerId) {
            router.push('/partner-pay/login');
            return;
        }

        const allPartnersJSON = localStorage.getItem('payPartners');
        const allPartners: PartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
        const currentPartner = allPartners.find(p => p.id === loggedInPartnerId);

        if (!currentPartner) {
            toast({ variant: 'destructive', title: "Authentication Error", description: "Could not find your partner details." });
            router.push('/partner-pay/login');
            return;
        }

        setPartner(currentPartner);

        getRazorpayKeyId().then(key => setRazorpayKeyId(key));
        
        const storedTransactions = localStorage.getItem(`partnerTransactions_${loggedInPartnerId}`);
        setTransactions(storedTransactions ? JSON.parse(storedTransactions) : initialTransactions);

    }, [router, toast]);

    useEffect(() => {
        if (partner) {
            localStorage.setItem(`partnerTransactions_${partner.id}`, JSON.stringify(transactions));
            const allPartnersJSON = localStorage.getItem('payPartners');
            let allPartners: PartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
            allPartners = allPartners.map(p => p.id === partner.id ? partner : p);
            localStorage.setItem('payPartners', JSON.stringify(allPartners));
        }
    }, [transactions, partner]);

    const profitData = useMemo(() => {
        const monthlyProfit: { [key: string]: number } = {};
        transactions.forEach(tx => {
            if (tx.status === 'Completed') {
                const month = format(new Date(tx.date), 'MMM yyyy');
                monthlyProfit[month] = (monthlyProfit[month] || 0) + tx.commission;
            }
        });

        for (let i = 2; i >= 0; i--) {
            const monthKey = format(subMonths(new Date(), i), 'MMM yyyy');
            if (!monthlyProfit[monthKey]) {
                monthlyProfit[monthKey] = 0;
            }
        }

        return Object.entries(monthlyProfit)
            .map(([name, total]) => ({ name: name.split(' ')[0], total }))
            .slice(-3); 
    }, [transactions]);
    
    const handleLogout = () => {
        localStorage.removeItem('loggedInPartnerId');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/partner-pay/login');
    };

    const handleVerifyShaktiCard = () => {
        if (!shaktiCardNumber) return;
        setIsVerifyingCard(true);
        // Simulate API call to fetch card benefits
        setTimeout(() => {
            const allCards: ShaktiCardData[] = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
            const foundCard = allCards.find(c => c.cardNumber === shaktiCardNumber);

            if (foundCard) {
                const discount = Math.floor(foundCard.points / 10); // 10 points = 1 Rupee discount
                setVerifiedCardInfo({ ...foundCard, discount });
                setCustomerInfo({name: foundCard.customerName, phone: foundCard.customerPhone, address: foundCard.customerAddress})
                toast({ title: "Card Verified!", description: `Customer ${foundCard.customerName} has ₹${discount} available as discount.` });
            } else {
                setVerifiedCardInfo(null);
                toast({ variant: 'destructive', title: "Invalid Card", description: "This Shakti Card number was not found." });
            }
            setIsVerifyingCard(false);
        }, 500);
    };
    
    const handleSettleWithSeller = async () => {
        const amount = parseFloat(transactionValue);
        if (!transactionValue || amount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Value", description: "Please enter a valid transaction amount." });
            return;
        }
        if (!partner || amount > partner.balance) {
             toast({ variant: 'destructive', title: "Insufficient Balance", description: "Your Snazzify Coin balance is too low. Please request a top-up." });
             return;
        }
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Configuration Error", description: "Razorpay Key ID is not set. Please contact support." });
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
            toast({ variant: 'destructive', title: "Customer Details Required", description: "Please enter the customer's name, phone, and address." });
            return;
        }

        const discountToApply = verifiedCardInfo?.discount || 0;
        const finalAmount = amount - discountToApply;

        setIsSettling(true);
        
        try {
            const response = await fetch('/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: finalAmount, customerName: partner.companyName, isPartnerSettlement: true })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const options = {
                key: razorpayKeyId,
                order_id: result.order_id,
                name: "Settle with Snazzify Seller",
                description: `Settlement of ₹${finalAmount.toFixed(2)}`,
                handler: (response: any) => {
                    const newTransaction: Transaction = {
                        id: uuidv4().substring(0, 8).toUpperCase(),
                        customerName: customerInfo.name,
                        customerPhone: customerInfo.phone,
                        customerAddress: customerInfo.address,
                        value: parseFloat(transactionValue),
                        date: new Date().toISOString(),
                        status: 'In Process',
                        sellerTransactionCode: response.razorpay_payment_id,
                        commission: parseFloat(transactionValue) * 0.02,
                        shaktiCardNumber: shaktiCardNumber || undefined,
                        discountApplied: discountToApply,
                    };
                    setTransactions(prev => [newTransaction, ...prev]);
                    setPartner(prev => prev ? ({ ...prev, balance: prev.balance - finalAmount }) : null);

                    // Update Shakti Card points
                    if (verifiedCardInfo && shaktiCardNumber) {
                        const allCards: ShaktiCardData[] = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
                        const updatedCards = allCards.map(c => c.cardNumber === shaktiCardNumber ? {...c, points: c.points - (discountToApply * 10)} : c);
                        localStorage.setItem('shakti_cards_db', JSON.stringify(updatedCards));
                    }

                    toast({ title: "Settlement Successful!", description: `Transaction code ${response.razorpay_payment_id} is now in your transaction list.` });
                    setTransactionValue('');
                    setCustomerInfo({ name: '', phone: '', address: '' });
                    setShaktiCardNumber('');
                    setVerifiedCardInfo(null);
                    setIsSettling(false);
                },
                prefill: { name: partner.companyName },
                theme: { color: "#5a31f4" },
                modal: { ondismiss: () => setIsSettling(false) }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsSettling(false);
        }
    };

    const handleGenerateCustomerCode = () => {
        if (!sellerCodeToProcess) {
            toast({ variant: 'destructive', title: "Verification Required", description: "Please enter the Seller Transaction Code." });
            return;
        }
        
        let txFound = false;
        let pointsEarned = 0;
        let cardToUpdate = '';
        let sellerIdForRules = 'default';

        setTransactions(prev => prev.map(tx => {
            if (tx.sellerTransactionCode === sellerCodeToProcess && tx.status === 'In Process') {
                txFound = true;
                const customerCode = `CUST-${uuidv4().substring(0, 8).toUpperCase()}`;
                
                // Add points to Shakti Card
                if (tx.shaktiCardNumber) {
                    const allRules: Record<string, { pointsPerRupee: number }> = JSON.parse(localStorage.getItem('shakti_card_rules_db') || '{}');
                    const allCards: ShaktiCardData[] = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
                    const cardDetails = allCards.find(c => c.cardNumber === tx.shaktiCardNumber);
                    sellerIdForRules = cardDetails?.sellerId || 'default';
                    const rules = allRules[sellerIdForRules] || { pointsPerRupee: 0.01 };
                    pointsEarned = Math.floor(tx.value * rules.pointsPerRupee);
                    cardToUpdate = tx.shaktiCardNumber;
                }

                toast({ title: "Customer Code Generated!", description: `Share this code with the customer: ${customerCode}` });
                return { ...tx, status: 'Completed', customerCode: customerCode };
            }
            return tx;
        }));

        if (txFound && cardToUpdate) {
            const allCards: ShaktiCardData[] = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
            const updatedCards = allCards.map(c => c.cardNumber === cardToUpdate ? {...c, points: c.points + pointsEarned} : c);
            localStorage.setItem('shakti_cards_db', JSON.stringify(updatedCards));
        }

        if (!txFound) {
            toast({ variant: 'destructive', title: 'Transaction Not Found', description: 'Could not find an "In Process" transaction with that Seller Code.'})
        }
        
        setSellerCodeToProcess('');
    };
    
    const handleGenerateCashCode = () => {
        const amount = parseFloat(cashAmount);
        if (!cashAmount || amount <= 0 || !partner) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Please enter a valid cash amount." });
            return;
        }

        const newCode: CashCode = {
            code: `CASH-${uuidv4().substring(0, 4).toUpperCase()}`,
            amount: amount,
            partnerId: partner.id,
            partnerName: partner.companyName,
            status: 'Pending',
        };

        const existingCodes = JSON.parse(localStorage.getItem('cashCodes') || '[]');
        localStorage.setItem('cashCodes', JSON.stringify([...existingCodes, newCode]));

        toast({
            title: "Cash Collection Code Generated!",
            description: `Code ${newCode.code} for ₹${newCode.amount} created. Provide this to the logistics agent.`
        });

        setCashAmount('');
    };

    const handleCopyCode = (codeToCopy: string) => {
        navigator.clipboard.writeText(codeToCopy);
        toast({ title: "Copied!", description: "The code has been copied to your clipboard." });
    };

    const handleRefund = async (tx: Transaction) => {
        try {
            const response = await fetch('/api/refund-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: tx.sellerTransactionCode,
                    amount: tx.value,
                    reason: `Partner-initiated refund for transaction ${tx.id}`
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setTransactions(prev => prev.map(t => t.id === tx.id ? {...t, status: 'Refunded'} : t));
            setPartner(prev => prev ? ({ ...prev, balance: prev.balance + tx.value }) : null); // Refund coins
            toast({ title: "Refund Processed", description: `Refund for ₹${tx.value} has been successfully initiated.`});
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Refund Failed", description: e.message });
        }
    };
    
    const handleRequestRefund = (tx: Transaction) => {
        let partnerCancellations = JSON.parse(localStorage.getItem('partnerCancellations') || '[]');
        partnerCancellations.push({
            ...tx,
            requestDate: new Date().toISOString(),
        });
        localStorage.setItem('partnerCancellations', JSON.stringify(partnerCancellations));
        setTransactions(prev => prev.map(t => t.id === tx.id ? {...t, status: 'Refund Requested'} : t));
        toast({ title: "Refund Requested", description: `Your request for order ${tx.id} has been sent to the seller.`});
    };

    const isWithin24Hours = (isoDateString: string) => {
        const date = parseISO(isoDateString);
        const now = new Date();
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        return diffHours < 24;
    };
    
    const handleTopUp = async (coins: number, price: number) => {
        if (!partner || !razorpayKeyId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Partner details or Razorpay key not available.' });
            return;
        }
        setIsToppingUp(true);

        try {
            const response = await fetch('/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: price, customerName: partner.companyName, isPartnerSettlement: true })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const options = {
                key: razorpayKeyId,
                order_id: result.order_id,
                amount: price * 100,
                name: "Snazzify Coin Top-up",
                description: `Purchase ${coins.toLocaleString()} Snazzify Coins`,
                handler: (response: any) => {
                    const newTopUpRequest: TopUpRequest = {
                        id: uuidv4(),
                        partnerId: partner.id,
                        partnerName: partner.companyName,
                        coinsRequested: coins,
                        amountPaid: price,
                        paymentId: response.razorpay_payment_id,
                        status: 'Pending Approval',
                        requestDate: new Date().toISOString(),
                    };

                    const existingRequests = JSON.parse(localStorage.getItem('topUpRequests') || '[]');
                    localStorage.setItem('topUpRequests', JSON.stringify([...existingRequests, newTopUpRequest]));

                    toast({ title: "Payment Successful!", description: `Your request for ${coins.toLocaleString()} coins has been sent for approval.` });
                    setIsToppingUp(false);
                    document.getElementById('close-topup-dialog')?.click();
                },
                prefill: { name: partner.companyName },
                theme: { color: "#5a31f4" },
                modal: { ondismiss: () => setIsToppingUp(false) }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsToppingUp(false);
        }
    };

    if (!partner) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const finalTransactionValue = parseFloat(transactionValue || '0') - (verifiedCardInfo?.discount || 0);
    const canSettle = partner.balance >= finalTransactionValue;
    const totalProfit = transactions.reduce((acc, tx) => tx.status === 'Completed' ? acc + tx.commission : acc, 0);
    const totalRevenue = transactions.reduce((acc, tx) => tx.status === 'Completed' ? acc + tx.value : acc, 0);
    const totalRefunds = transactions.reduce((acc, tx) => tx.status === 'Refunded' ? acc + tx.value : acc, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome, {partner.companyName}</h1>
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
                            <CardContent><p className="text-4xl font-bold">₹{partner.balance.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Your available digital credit.</p></CardContent>
                            <CardFooter>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" className="w-full">
                                            <Coins className="mr-2 h-4 w-4" /> Request Top-up
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Top-up Snazzify Coins</DialogTitle>
                                            <DialogDescription>Select a package to add coins to your balance. Payment is processed securely via Razorpay.</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            {coinPackages.map(pkg => (
                                                <Card key={pkg.coins} className="hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4 flex justify-between items-center">
                                                        <div>
                                                            <p className="font-bold text-lg">{pkg.label}</p>
                                                            <p className="text-sm text-muted-foreground">Pay ₹{pkg.price} to get credits</p>
                                                        </div>
                                                        <Button onClick={() => handleTopUp(pkg.coins, pkg.price)} disabled={isToppingUp}>
                                                            {isToppingUp ? <Loader2 className="h-4 w-4 animate-spin"/> : `Pay ₹${pkg.price}`}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button variant="outline" id="close-topup-dialog">Close</Button></DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>
                        <Card className="shadow-lg">
                            <CardHeader><CardTitle>Generate Payment Code</CardTitle><CardDescription className="text-xs">Collect cash, settle with seller online, then generate a code for the customer.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Shakti Card (Optional)</Label>
                                    <div className="flex gap-2">
                                        <Input id="shakti-card-no" placeholder="Enter Shakti Card number" value={shaktiCardNumber} onChange={(e) => setShaktiCardNumber(e.target.value)} />
                                        <Button variant="secondary" size="icon" onClick={handleVerifyShaktiCard} disabled={isVerifyingCard}>{isVerifyingCard ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}</Button>
                                    </div>
                                    {verifiedCardInfo && (
                                        <div className="text-xs text-green-600 p-2 bg-green-50 rounded-md">
                                            <p className='font-bold'>Card verified for: {verifiedCardInfo.customerName}</p>
                                            <p>Customer has <span className="font-bold">₹{verifiedCardInfo.discount.toFixed(2)}</span> discount available.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tx-value">Cash Collected (₹)</Label>
                                    <Input id="tx-value" type="number" placeholder="e.g., 500" value={transactionValue} onChange={(e) => setTransactionValue(e.target.value)} />
                                </div>
                                {verifiedCardInfo && verifiedCardInfo.discount > 0 && (
                                    <div className="text-sm p-2 border-dashed border-primary border rounded-md">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Original Total:</span><span>₹{parseFloat(transactionValue || '0').toFixed(2)}</span></div>
                                        <div className="flex justify-between text-destructive"><span className="text-muted-foreground">Discount:</span><span>- ₹{verifiedCardInfo.discount.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-bold mt-1 pt-1 border-t"><span >Final Amount:</span><span>₹{finalTransactionValue.toFixed(2)}</span></div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Customer Details (for your records)</Label>
                                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-name" placeholder="Customer Name" value={customerInfo.name} onChange={(e) => setCustomerInfo(p => ({...p, name: e.target.value}))} className="pl-9" /></div>
                                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-phone" placeholder="Customer Phone" value={customerInfo.phone} onChange={(e) => setCustomerInfo(p => ({...p, phone: e.target.value}))} className="pl-9" /></div>
                                    <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-address" placeholder="Customer Address" value={customerInfo.address} onChange={(e) => setCustomerInfo(p => ({...p, address: e.target.value}))} className="pl-9" /></div>
                                </div>
                                
                                <Button className="w-full" onClick={handleSettleWithSeller} disabled={isSettling || !canSettle}>
                                    <QrCode className="mr-2 h-4 w-4" /> 
                                    {isSettling ? 'Processing...' : `Pay Seller ₹${finalTransactionValue.toFixed(2) || '0.00'} & Get Code`}
                                </Button>
                                {!canSettle && <p className="text-xs text-destructive text-center">Insufficient coin balance for this transaction.</p>}

                                <Dialog>
                                    <DialogTrigger asChild><Button variant="secondary" className="w-full mt-2">I have my Seller Code</Button></DialogTrigger>
                                    <DialogContent><DialogHeader><DialogTitle>Step 2: Generate Customer Code</DialogTitle><DialogDescription>Enter the confirmed Seller Transaction Code from your transaction list to generate the final code for your customer.</DialogDescription></DialogHeader><div className="py-4 space-y-2"><Label htmlFor="seller-tx-code">Seller Transaction Code</Label><Input id="seller-tx-code" placeholder="Paste code here e.g. pay_..." value={sellerCodeToProcess} onChange={(e) => setSellerCodeToProcess(e.target.value)} /></div><DialogFooter><DialogClose asChild><Button onClick={handleGenerateCustomerCode}>Generate for Customer</Button></DialogClose></DialogFooter></DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="transactions" className="w-full">
                            <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="transactions"><Wallet className="mr-2 h-4 w-4" /> Transactions</TabsTrigger><TabsTrigger value="human-qr"><Clipboard className="mr-2 h-4 w-4" /> Human QR Code</TabsTrigger><TabsTrigger value="logistics"><Package className="mr-2 h-4 w-4" /> Logistics Hub</TabsTrigger><TabsTrigger value="pnl"><BarChart3 className="mr-2 h-4 w-4" /> P&amp;L</TabsTrigger></TabsList>
                            <TabsContent value="transactions">
                                <Card className="shadow-lg">
                                    <CardHeader><CardTitle>Recent Transactions</CardTitle><CardDescription>History of codes generated from your account.</CardDescription></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Value</TableHead><TableHead>Commission</TableHead><TableHead>Seller Tx/Customer Code</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                 {transactions.map(tx => {
                                                    const isCancellable = isWithin24Hours(tx.date);
                                                    const canRequestRefund = !isCancellable && tx.status === 'Completed';
                                                    const isActionable = tx.status !== 'Refunded' && tx.status !== 'Refund Requested';

                                                    return (
                                                    <TableRow key={tx.id}>
                                                        <TableCell><div className="font-medium">{tx.customerName}</div><div className="text-xs text-muted-foreground">{tx.customerPhone}</div></TableCell>
                                                        <TableCell>
                                                            <div>₹{tx.value.toFixed(2)}</div>
                                                            {tx.discountApplied && tx.discountApplied > 0 && <div className="text-xs text-destructive">(-₹{tx.discountApplied.toFixed(2)})</div>}
                                                        </TableCell>
                                                        <TableCell className="text-green-600 font-medium">+ ₹{tx.commission.toFixed(2)}</TableCell>
                                                        <TableCell className="font-mono text-xs flex items-center gap-1">
                                                           {tx.status === 'Completed' ? tx.customerCode : tx.sellerTransactionCode || 'N/A'} 
                                                           {tx.sellerTransactionCode && <Copy className="h-3 w-3 cursor-pointer" onClick={() => handleCopyCode(tx.status === 'Completed' ? tx.customerCode! : tx.sellerTransactionCode!)} />}
                                                        </TableCell>
                                                        <TableCell><Badge variant={tx.status === 'Completed' ? 'default' : 'secondary'}>{tx.status}</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                           {isActionable && (tx.status === 'Completed' || tx.status === 'In Process') && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive" size="sm">
                                                                            {isCancellable ? 'Cancel &amp; Refund' : 'Request Refund'}
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                {isCancellable ? `This will immediately process a refund of ₹${tx.value} via Razorpay. This action cannot be undone.` : 'Your 24-hour window has passed. This will send a refund request to the seller for their approval.'}
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Close</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => isCancellable ? handleRefund(tx) : handleRequestRefund(tx)}>
                                                                                Yes, Proceed
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                           )}
                                                        </TableCell>
                                                    </TableRow>
                                                 );})}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                             <TabsContent value="human-qr">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Human QR Code: Cash Collection</CardTitle>
                                        <CardDescription>Generate a one-time code for cash collected from a customer. A logistics agent will use this code to settle the amount with you and top up your coin balance.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         <div className="space-y-2">
                                            <Label htmlFor="cash-amount">Cash Amount Collected (₹)</Label>
                                            <Input 
                                                id="cash-amount" 
                                                type="number" 
                                                placeholder="e.g., 1250.50" 
                                                value={cashAmount}
                                                onChange={(e) => setCashAmount(e.target.value)}
                                            />
                                        </div>
                                        <Button className="w-full" onClick={handleGenerateCashCode}>Generate Collection Code</Button>
                                    </CardContent>
                                     <CardFooter>
                                        <p className="text-xs text-muted-foreground">This system allows you to convert physical cash into Snazzify Coins without needing a bank deposit. The logistics agent acts as the bridge.</p>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                            <TabsContent value="logistics">
                                 <Card className="shadow-lg">
                                    <CardHeader><CardTitle>Parcel Management</CardTitle><CardDescription>Manage incoming and outgoing parcels for customers.</CardDescription></CardHeader>
                                    <CardContent>
                                        <Table><TableHeader><TableRow><TableHead>Parcel ID</TableHead><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Address</TableHead><TableHead>AWB No.</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {parcels.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">{p.id}</TableCell>
                                                        <TableCell><div className="font-medium">{p.customer}</div><div className="text-xs text-muted-foreground">{p.customerPhone}</div></TableCell>
                                                        <TableCell>{p.productName}</TableCell>
                                                        <TableCell className="text-xs">{p.customerAddress}</TableCell>
                                                        <TableCell className="font-mono text-xs">{p.awb}</TableCell>
                                                        <TableCell><Badge variant={p.status === 'Picked Up' ? 'default' : 'secondary'} className={p.status === 'Picked Up' ? 'bg-green-100 text-green-800' : p.status === 'Ready for Pickup' ? 'bg-blue-100 text-blue-800' : p.status === 'Notified' ? 'bg-yellow-100 text-yellow-800' : ''}>{p.status}</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                            <Dialog>
                                                                <DialogTrigger asChild><Button size="sm" variant="outline">Manage</Button></DialogTrigger>
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
                                                                            <Button onClick={() => {}} variant="secondary" className="w-full justify-start"><MessageSquare className="mr-2"/>Notify Customer for Pickup</Button>
                                                                        </div>
                                                                        <div className="space-y-2 border-t pt-4">
                                                                            <h4 className="font-medium">Close Order: Mark as Delivered</h4>
                                                                            <Label htmlFor="collector-name">Collected By</Label>
                                                                            <Input id="collector-name" placeholder="Customer's full name" value={collectorName} onChange={e => setCollectorName(e.target.value)} />
                                                                            <Label htmlFor="delivery-notes">Notes / Signed Document Reference</Label>
                                                                            <Textarea id="delivery-notes" placeholder="e.g., ID checked, document signed." value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} />
                                                                            <DialogClose asChild><Button onClick={() => {}}><PackageCheck className="mr-2"/>Confirm Delivery</Button></DialogClose>
                                                                        </div>
                                                                        <div className="space-y-2 border-t pt-4">
                                                                            <h4 className="font-medium">Other Actions</h4>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild><Button variant="outline" className="w-full justify-start"><Edit className="mr-2"/>Request Cancellation</Button></AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>Request Cancellation for {p.id}?</AlertDialogTitle>
                                                                                        <AlertDialogDescription>This action will send a cancellation request to the seller. This should only be done before the parcel is dispatched from the main warehouse.</AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                                                                        <AlertDialogAction onClick={() => {}}>Yes, Request Cancellation</AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild><Button variant="destructive" className="w-full justify-start"><AlertTriangle className="mr-2"/>Arrange Return</Button></AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>Arrange Return for {p.id}?</AlertDialogTitle>
                                                                                        <AlertDialogDescription>If the customer has rejected the parcel, this will initiate the return process with the logistics partner and notify the seller. Are you sure?</AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                                                                        <AlertDialogAction onClick={() => {}}>Yes, Arrange Return</AlertDialogAction>
                                                                                    </AlertDialogFooter>
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
                             <TabsContent value="pnl">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Profit &amp; Loss</CardTitle>
                                        <CardDescription>An overview of your earnings and transaction history.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="p-4 bg-green-50 rounded-lg">
                                                <dt className="text-sm font-medium text-green-700 flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4"/>Total Profit</dt>
                                                <dd className="text-2xl font-bold text-green-800">₹{totalProfit.toFixed(2)}</dd>
                                            </div>
                                            <div className="p-4 bg-blue-50 rounded-lg">
                                                <dt className="text-sm font-medium text-blue-700">Total Revenue</dt>
                                                <dd className="text-2xl font-bold text-blue-800">₹{totalRevenue.toFixed(2)}</dd>
                                            </div>
                                             <div className="p-4 bg-red-50 rounded-lg">
                                                <dt className="text-sm font-medium text-red-700 flex items-center justify-center gap-1"><TrendingDown className="h-4 w-4"/>Total Refunds</dt>
                                                <dd className="text-2xl font-bold text-red-800">₹{totalRefunds.toFixed(2)}</dd>
                                            </div>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold text-lg mb-2">Monthly Profit</h4>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <BarChart data={profitData}>
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
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
