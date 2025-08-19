
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ShoppingCart, ShieldAlert, LogOut, CheckCircle, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EditableOrder } from '@/app/orders/page';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';


export default function CustomerDashboardPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState({ name: '', mobile: '' });
    const [walletBalance, setWalletBalance] = useState(0);
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loggedInMobile = localStorage.getItem('loggedInUserMobile');
        if (!loggedInMobile) {
            router.push('/customer/login');
            return;
        }

        async function loadCustomerData() {
            setIsLoading(true);
            try {
                // Step 1: Get all manual orders from local storage
                const manualOrdersJSON = localStorage.getItem('manualOrders');
                let allSnazzPayOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];

                // Step 2: Apply any saved overrides to every manual order
                const ordersWithOverrides = allSnazzPayOrders.map(order => {
                    const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                    return { ...order, ...storedOverrides };
                });

                // Step 3: Now, filter the updated list for the logged-in customer
                const customerOrders = ordersWithOverrides.filter(order => {
                    const normalize = (phone: string = '') => phone.replace(/[^0-9]/g, '');
                    const orderContact = normalize(order.contactNo);
                    const loggedInContact = normalize(loggedInMobile);
                    
                    if (!orderContact || !loggedInContact) return false;
                    
                    return orderContact.endsWith(loggedInContact) || loggedInContact.endsWith(orderContact);
                });
                
                // Step 4: Set state with the final, correct data
                const customerName = customerOrders.length > 0 ? customerOrders[0].customerName : 'Valued Customer';
                setUser({ name: customerName, mobile: loggedInMobile });

                const activeOrderValue = customerOrders
                    .filter(o => ['Pending', 'Authorized', 'Paid'].includes(o.paymentStatus))
                    .reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
                
                setWalletBalance(activeOrderValue);
                setOrders(customerOrders);

            } catch (error) {
                console.error("Error loading customer data:", error);
                toast({ variant: 'destructive', title: "Error", description: "Could not load your account details." });
            } finally {
                setIsLoading(false);
            }
        }
        
        loadCustomerData();

    }, [router, toast]);
    
    const handleLogout = () => {
        localStorage.removeItem('loggedInUserMobile');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/customer/login');
    };

    const handleCancelOrder = async (order: EditableOrder) => {
        if (!order.cancellationId) {
             toast({
                variant: 'destructive',
                title: "Cannot Cancel Online",
                description: "This order is missing a Cancellation ID. Please contact support to cancel.",
            });
            return;
        }
        
        const cancellationId = prompt(`This will cancel your order #${order.orderId}. To proceed, please enter the unique Cancellation ID provided by our support team:`);
        
        if (cancellationId && cancellationId === order.cancellationId) {
            
            const paymentInfoJSON = localStorage.getItem(`payment_info_${order.orderId}`);
            let paymentId = null;
            if (paymentInfoJSON) {
                paymentId = JSON.parse(paymentInfoJSON).paymentId;
            }

            try {
                const response = await fetch('/api/cancel-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        orderId: order.orderId, 
                        cancellationId: order.cancellationId,
                        paymentId: paymentId,
                        amount: order.price
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to process cancellation.');
                }
                
                const updatedOrder = { ...order, paymentStatus: 'Voided', cancellationStatus: 'Processed' };
                const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                const newOverrides = { ...storedOverrides, paymentStatus: 'Voided', cancellationStatus: 'Processed' };
                localStorage.setItem(`order-override-${order.id}`, JSON.stringify(newOverrides));
                
                setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
                setWalletBalance(prev => prev - parseFloat(order.price || '0'));

                toast({ title: "Order Cancelled", description: `Your order ${order.orderId} has been successfully cancelled.` });
            
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Cancellation Failed',
                    description: error.message,
                });
            }
        } else if (cancellationId) {
            toast({ variant: 'destructive', title: "Incorrect ID", description: "The Cancellation ID you entered is incorrect." });
        }
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
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-8">
                        <Card className="shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Snazzify Trust Wallet</CardTitle>
                                <Wallet className="h-6 w-6 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Value of Active Orders</p>
                                <p className="text-4xl font-bold">₹{walletBalance.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">This reflects the total amount for your active, pre-authorized orders.</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="orders" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="orders">
                                    <ShoppingCart className="mr-2 h-4 w-4" /> My Orders
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
                                                    const isCancellable = ['Pending', 'Authorized', 'Paid'].includes(order.paymentStatus) && differenceInDays(new Date(), new Date(order.date)) <= 7;
                                                    return (
                                                        <TableRow key={order.id}>
                                                            <TableCell className="font-medium">{order.orderId}</TableCell>
                                                            <TableCell>{order.date}</TableCell>
                                                            <TableCell>{order.productOrdered}</TableCell>
                                                            <TableCell>₹{parseFloat(order.price).toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className={order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : (order.paymentStatus === 'Authorized' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                                                                    {order.paymentStatus === 'Paid' ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                                                    {order.paymentStatus}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {isCancellable && (
                                                                    <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order)}>Cancel</Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
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
                             <TabsContent value="cancellations">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Request a Cancellation</CardTitle>
                                        <CardDescription>To cancel an active order, find it in the "My Orders" tab and click the "Cancel" button. You will need the unique Cancellation ID provided by our support team.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            The cancellation process requires a unique ID to ensure security. This ID is available to our support team and will be provided to you upon request. Once you click "Cancel" on an order, you will be prompted to enter this ID.
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

    