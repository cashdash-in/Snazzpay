
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ShoppingCart, ShieldAlert, LogOut, CheckCircle, Clock, Mail, MessageSquare, PackageCheck, FileText, Calendar, Truck, ArrowRight, CircleDotDashed, AlertTriangle, Gem, Gift } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EditableOrder } from '@/app/orders/page';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from 'uuid';
import { format, addYears } from 'date-fns';
import { sanitizePhoneNumber } from '@/lib/utils';
import { ShaktiCard, ShaktiCardData } from '@/components/shakti-card';
import Link from 'next/link';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';

type PaymentInfo = {
    paymentId: string;
    orderId: string; 
    razorpayOrderId: string;
    signature: string;
    status: string;
    authorizedAt: string;
};

const TimelineEvent = ({ icon, title, date, children, isLast = false }: { icon: React.ElementType, title: string, date: string | null, children?: React.ReactNode, isLast?: boolean }) => {
    const IconComponent = icon;
    const isComplete = !!date;

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <IconComponent className="w-4 h-4" />
                </div>
                {!isLast && <div className="flex-grow w-px bg-gray-200"></div>}
            </div>
            <div className="pb-8 pt-1">
                <p className={`font-semibold ${isComplete ? 'text-gray-800' : 'text-gray-500'}`}>{title}</p>
                {isComplete && <p className="text-xs text-muted-foreground">{date}</p>}
                {children && <div className="text-sm text-muted-foreground mt-1">{children}</div>}
            </div>
        </div>
    );
}

export default function CustomerDashboardPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<{ name: string; mobile: string }>({ name: '', mobile: '' });
    const [trustWalletValue, setTrustWalletValue] = useState(0);
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellationInput, setCancellationInput] = useState('');
    const [selectedOrderForCancellation, setSelectedOrderForCancellation] = useState<EditableOrder | null>(null);
    const [paymentInfos, setPaymentInfos] = useState<Map<string, PaymentInfo>>(new Map());
    const [shaktiCard, setShaktiCard] = useState<ShaktiCardData | null>(null);

     const loadCustomerData = useCallback(async (mobileNumber: string) => {
        setIsLoading(true);
        try {
            const sanitizedMobile = sanitizePhoneNumber(mobileNumber);
            
            const allOrders = await getCollection<EditableOrder>('orders');
            const customerOrders = allOrders.filter(order => order.contactNo && sanitizePhoneNumber(order.contactNo) === sanitizedMobile);
            
            const loadedPaymentInfos = new Map<string, PaymentInfo>();
            for (const order of customerOrders) {
                 const paymentInfo = await getDocument<PaymentInfo>('payment_info', order.orderId);
                 if (paymentInfo) {
                    loadedPaymentInfos.set(order.orderId, paymentInfo);
                 }
            }

            const finalOrders = customerOrders.filter(o => o.paymentStatus !== 'Intent Verified');

            const customerName = finalOrders.length > 0 ? finalOrders[0].customerName : 'Valued Customer';
            setUser({ name: customerName, mobile: mobileNumber });

            const activeTrustValue = finalOrders
                .filter(o => o.paymentStatus === 'Authorized')
                .reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
            
            setTrustWalletValue(activeTrustValue);
            setOrders(finalOrders);
            setPaymentInfos(loadedPaymentInfos);
            
            const allCards = await getCollection<ShaktiCardData>('shakti_cards');
            const customerCard = allCards.find(card => card.customerPhone && sanitizePhoneNumber(card.customerPhone) === sanitizedMobile);
            if (customerCard) {
                setShaktiCard(customerCard);
            }

        } catch (error) {
            console.error("Error loading customer data from Firestore:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load your account details." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
        
    useEffect(() => {
        const loggedInMobile = localStorage.getItem('loggedInUserMobile');
        if (!loggedInMobile) {
            router.push('/customer/login');
        } else {
            loadCustomerData(loggedInMobile);
        }
    }, [router, loadCustomerData]);
    
    const handleLogout = () => {
        localStorage.removeItem('loggedInUserMobile');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/customer/login');
    };

    const handleCancelOrder = async () => {
        if (!selectedOrderForCancellation) return;

        const order = selectedOrderForCancellation;
        const paymentInfo = paymentInfos.get(order.orderId);

        try {
            const response = await fetch('/api/cancel-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId: order.orderId, 
                    cancellationId: cancellationInput || order.cancellationId,
                    paymentId: paymentInfo?.paymentId,
                    amount: order.price
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to process cancellation.');
            
            // Update Firestore
            const updatedOrderData = { paymentStatus: 'Voided', cancellationStatus: 'Processed' };
            await saveDocument('orders', { ...order, ...updatedOrderData }, order.id);

            setOrders(prev => prev.map(o => o.id === order.id ? {...o, ...updatedOrderData} : o));
            setTrustWalletValue(prev => prev - parseFloat(order.price || '0'));
            toast({ title: "Order Cancelled", description: `Your order ${order.orderId} has been successfully cancelled.` });
        
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
        }

        setCancellationInput('');
        setSelectedOrderForCancellation(null);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user.name}</h1>
                        <p className="text-muted-foreground">Here's an overview of your Snazzify account.</p>
                    </div>
                     <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </header>
                
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                         <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>My Shakti COD Card</CardTitle>
                                <CardDescription>Your personal card for Secure COD benefits.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center">
                                {shaktiCard ? (
                                    <Link href="/customer/card-details">
                                        <ShaktiCard card={shaktiCard} />
                                    </Link>
                                ) : (
                                    <div className="text-center text-muted-foreground py-12">
                                        <p>Your Shakti COD Card will appear here after your first successful Secure COD purchase.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {shaktiCard && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Your Rewards</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                                        <Gem className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                        <p className="text-2xl font-bold">{shaktiCard.points}</p>
                                        <p className="text-sm text-muted-foreground">Points Balance</p>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg text-center">
                                        <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                        <p className="text-2xl font-bold">₹{shaktiCard.cashback.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">Cashback Earned</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        <Card className="shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Snazzify Trust Wallet</CardTitle>
                                <Wallet className="h-6 w-6 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Value of Active Orders Held in Trust</p>
                                <p className="text-4xl font-bold">₹{trustWalletValue.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">This is the total amount for your active orders, held securely. Funds are only transferred after your order is dispatched.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Tabs defaultValue="orders" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="orders">
                                    <ShoppingCart className="mr-2 h-4 w-4" /> My Orders
                                </TabsTrigger>
                                <TabsTrigger value="history">
                                    <FileText className="mr-2 h-4 w-4" /> Order History
                                </TabsTrigger>
                                <TabsTrigger value="cancellations">
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Cancellations
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="orders">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>My Order History</CardTitle>
                                        <CardDescription>Here are all the orders placed with your mobile number.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Order ID</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {orders.length > 0 ? orders.map((order) => {
                                                    const isCancelled = ['Voided', 'Cancelled', 'Refunded', 'Fee Charged'].includes(order.paymentStatus);
                                                    const contactSupportLink = `https://web.whatsapp.com/send?phone=919920320790&text=${encodeURIComponent(`Hi, I need a Cancellation ID for my Snazzify order #${order.orderId}.`)}`;
                                                    return (
                                                        <TableRow key={order.id}>
                                                            <TableCell className="font-medium">{order.orderId}</TableCell>
                                                            <TableCell>{order.date}</TableCell>
                                                            <TableCell>{order.productOrdered}</TableCell>
                                                            <TableCell>₹{parseFloat(order.price).toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className={
                                                                    order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 
                                                                    order.paymentStatus === 'Authorized' ? 'bg-yellow-100 text-yellow-800' :
                                                                    order.paymentStatus === 'Fee Charged' ? 'bg-orange-100 text-orange-800' :
                                                                    isCancelled ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }>
                                                                    {order.paymentStatus === 'Paid' ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                                                    {order.paymentStatus === 'Fee Charged' ? `Fee of ₹${order.cancellationFee} Charged` : order.paymentStatus}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive" size="sm" onClick={() => setSelectedOrderForCancellation(order)} disabled={isCancelled}>
                                                                            {isCancelled ? 'Cancelled' : 'Cancel'}
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Request Cancellation for Order #{selectedOrderForCancellation?.orderId}</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                To cancel your order, please contact support to get a unique Cancellation ID. This is required to process the cancellation securely.
                                                                                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                                                                                    <p>Contact support to get your ID:</p>
                                                                                    <div className='flex items-center gap-2'><Mail className="h-3 w-3" /> <a href="mailto:customer.service@snazzify.co.in" className="text-primary hover:underline">customer.service@snazzify.co.in</a></div>
                                                                                    <div className='flex items-center gap-2'><MessageSquare className="h-3 w-3" /> <a href={contactSupportLink} target="_blank" className="text-primary hover:underline">WhatsApp Support</a></div>
                                                                                </div>
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <div className="space-y-2 py-2">
                                                                            <Label htmlFor="cancellation-id-input">Cancellation ID</Label>
                                                                            <Input
                                                                                id="cancellation-id-input"
                                                                                value={cancellationInput}
                                                                                onChange={(e) => setCancellationInput(e.target.value)}
                                                                                placeholder="Enter your Cancellation ID"
                                                                            />
                                                                        </div>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel onClick={() => setCancellationInput('')}>Close</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleCancelOrder}>Submit Cancellation</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                            You have no orders yet.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                             <TabsContent value="history">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Detailed Order History</CardTitle>
                                        <CardDescription>A complete timeline of each order's journey.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {orders.length > 0 ? orders.map((order) => {
                                            const paymentInfo = paymentInfos.get(order.orderId);
                                            const authorizedDate = paymentInfo?.authorizedAt ? format(new Date(paymentInfo.authorizedAt), 'PPp') : format(new Date(order.date), 'PPp');
                                            
                                            const events = [
                                                { icon: CircleDotDashed, title: "Order Placed & Payment Authorized", date: authorizedDate },
                                                order.paymentStatus === 'Fee Charged' && { icon: AlertTriangle, title: `Cancellation Fee Charged: ₹${order.cancellationFee}`, date: 'Fee Processed' },
                                                order.paymentStatus === 'Paid' && { icon: ArrowRight, title: "Funds Transferred", date: order.readyForDispatchDate ? format(new Date(order.readyForDispatchDate), 'PPp') : 'Funds Transferred' },
                                                order.readyForDispatchDate && { icon: PackageCheck, title: "Order Dispatched", date: format(new Date(order.readyForDispatchDate), 'PPp'), children: order.trackingNumber && `Tracking No: ${order.trackingNumber}` },
                                                order.deliveryStatus === 'delivered' && order.estDelivery && { icon: Truck, title: "Delivered", date: format(new Date(order.estDelivery), 'PPp') },
                                                ['Voided', 'Refunded', 'Fee Charged'].includes(order.paymentStatus) && { icon: ShieldAlert, title: "Refunded / Cancelled", date: 'Refund / Cancellation Processed' }
                                            ].filter(Boolean) as { icon: React.ElementType; title: string; date: string | null; children?: React.ReactNode; isLast?: boolean; }[];


                                            return (
                                            <Card key={order.id} className="p-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-lg">Order #{order.orderId}</h4>
                                                        <p className="text-sm text-muted-foreground">{order.productOrdered}</p>
                                                    </div>
                                                    <Badge>₹{order.price}</Badge>
                                                </div>
                                                <div className="relative">
                                                     <div className="absolute left-4 h-full w-px bg-gray-200"></div>
                                                     {events.map((event, index) => (
                                                         <TimelineEvent 
                                                            key={index}
                                                            icon={event.icon}
                                                            title={event.title}
                                                            date={event.date}
                                                            isLast={index === events.length - 1}
                                                        >
                                                            {event.children}
                                                        </TimelineEvent>
                                                     ))}
                                                </div>
                                            </Card>
                                        )}) : (
                                            <p className="text-center text-muted-foreground py-8">No order history to display.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                             <TabsContent value="cancellations">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>How to Cancel</CardTitle>
                                        <CardDescription>Options for cancelling an active order.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            To ensure the security of your transaction, all cancellations must be verified. Please contact our customer support team to receive a unique Cancellation ID. You can then use this ID in the "My Orders" tab to cancel your order and initiate a refund.
                                        </p>
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

    