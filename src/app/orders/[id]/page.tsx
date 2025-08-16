
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, ExternalLink, CreditCard, Send, Loader2 as ButtonLoader, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '../page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
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
} from "@/components/ui/alert-dialog"
import { getOrders, type Order as ShopifyOrder } from '@/services/shopify';

type PaymentInfo = {
    paymentId: string;
    orderId: string; 
    razorpayOrderId: string;
    signature: string;
    status: string;
    authorizedAt: string;
}

function mapShopifyOrderToEditableOrder(shopifyOrder: ShopifyOrder): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    
    const products = shopifyOrder.line_items.map(item => item.title).join(', ');

    return {
        id: shopifyOrder.id.toString(),
        orderId: shopifyOrder.name,
        customerName,
        customerEmail: customer?.email || undefined,
        customerAddress: shopifyOrder.shipping_address ? `${shopifyOrder.shipping_address.address1}, ${shopifyOrder.shipping_address.city}` : 'N/A',
        pincode: shopifyOrder.shipping_address?.zip || 'N/A',
        contactNo: shopifyOrder.customer?.phone || 'N/A',
        productOrdered: products,
        quantity: shopifyOrder.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: shopifyOrder.total_price,
        paymentStatus: shopifyOrder.financial_status || 'Pending',
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
    };
}


export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const orderIdParam = params.id as string;
    
    const [order, setOrder] = useState<EditableOrder | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCharging, setIsCharging] = useState(false);
    const [isSendingLink, setIsSendingLink] = useState(false);

    useEffect(() => {
        if (!orderIdParam) return;
        setLoading(true);
        
        async function loadOrder() {
            let foundOrder: EditableOrder | null = null;
            
            // 1. Fetch all orders (Shopify and Manual)
            let allOrders: EditableOrder[] = [];
             try {
                const shopifyOrders = await getOrders();
                allOrders = allOrders.concat(shopifyOrders.map(mapShopifyOrderToEditableOrder));
            } catch (e) {
                console.error("Could not fetch Shopify orders", e);
            }
            const manualOrdersJSON = localStorage.getItem('manualOrders');
            if (manualOrdersJSON) {
                allOrders = allOrders.concat(JSON.parse(manualOrdersJSON));
            }
            
            // 2. Find the correct order by matching the internal `id`
            foundOrder = allOrders.find(o => o.id === orderIdParam) || null;

            // 3. Apply any saved overrides from localStorage using the internal ID
            if (foundOrder) {
                 const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${foundOrder.id}`) || '{}');
                 foundOrder = {...foundOrder, ...storedOverrides};
            }
            
            setOrder(foundOrder);

            // 4. Check for payment info using the order's display ID (e.g., #1001)
            if (foundOrder) {
                const paymentInfoJSON = localStorage.getItem(`payment_info_${foundOrder.orderId}`);
                if (paymentInfoJSON) {
                    setPaymentInfo(JSON.parse(paymentInfoJSON));
                }
            }

            setLoading(false);
        }
        
        loadOrder();

    }, [orderIdParam]);

    const handleInputChange = (field: keyof EditableOrder, value: string | number) => {
        if (!order) return;
        setOrder(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSelectChange = (field: keyof EditableOrder, value: string) => {
        if (!order) return;
        setOrder(prev => prev ? { ...prev, [field]: value } : null);
    };
    
    const handleSave = () => {
        if (!order) return;

        // Use the internal `id` for saving, not the display `orderId`
        if (order.id.startsWith('gid://') || /^\d+$/.test(order.id)) {
          const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
          const newOverrides = { ...storedOverrides, ...order };
          localStorage.setItem(`order-override-${order.id}`, JSON.stringify(newOverrides));
        } else {
          const manualOrdersJSON = localStorage.getItem('manualOrders');
          let manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
          const orderIndex = manualOrders.findIndex(o => o.id === order.id);
          if (orderIndex > -1) {
            manualOrders[orderIndex] = order;
            localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
          }
        }

        toast({
            title: "Order Saved",
            description: `Details for order ${order.orderId} have been updated successfully.`,
        });
    };
    
    const handleChargePayment = async () => {
        if (!paymentInfo || !order) return;
        setIsCharging(true);
        try {
            const response = await fetch('/api/charge-mandate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: paymentInfo.paymentId,
                    amount: parseFloat(order.price)
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to charge payment.');
            }
            
            const updatedOrder = { ...order, paymentStatus: 'Paid' };
            setOrder(updatedOrder);

            // Save the payment status change using the internal id
            if (updatedOrder.id.startsWith('gid://') || /^\d+$/.test(updatedOrder.id)) {
                const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${updatedOrder.id}`) || '{}');
                const newOverrides = { ...storedOverrides, paymentStatus: 'Paid' };
                localStorage.setItem(`order-override-${updatedOrder.id}`, JSON.stringify(newOverrides));
            } else {
                 const manualOrdersJSON = localStorage.getItem('manualOrders');
                let manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
                const orderIndex = manualOrders.findIndex(o => o.id === updatedOrder.id);
                if (orderIndex > -1) {
                    manualOrders[orderIndex].paymentStatus = 'Paid';
                    localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
                }
            }

            toast({
                title: "Charge Successful!",
                description: `Successfully charged ₹${order.price}. Transaction ID: ${result.transactionId}`,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Charge Failed",
                description: error.message,
            });
        } finally {
            setIsCharging(false);
        }
    };
    
    const handleSendLink = async () => {
        if (!order) return;
        setIsSendingLink(true);
        try {
            const response = await fetch('/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: order.price,
                    customerName: order.customerName,
                    customerContact: order.contactNo,
                    customerEmail: order.customerEmail,
                    orderId: order.orderId,
                    productName: order.productOrdered,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send payment link.');
            }

            toast({
                title: "Payment Link Sent!",
                description: result.message,
            });

        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Error Sending Link",
                description: error.message,
            });
        } finally {
            setIsSendingLink(false);
        }
    };


    if (loading) {
        return (
            <AppShell title="Loading Order...">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppShell>
        );
    }
    
    if (!order) {
        return (
            <AppShell title="Order Not Found">
                 <Card>
                    <CardHeader>
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="w-fit">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <CardTitle>Order Not Found</CardTitle>
                        <CardDescription>The requested order could not be found. It may not exist or is not yet synced.</CardDescription>
                    </CardHeader>
                </Card>
            </AppShell>
        );
    }

    return (
        <AppShell title={`Order ${order.orderId}`}>
            <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className='flex items-center gap-4'>
                        <Button variant="outline" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Order Details</h2>
                            <p className="text-muted-foreground">Editing order {order.orderId}. Click save when you're done.</p>
                        </div>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </div>

                {paymentInfo && order.paymentStatus.toLowerCase() === 'authorized' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Authorization Details</CardTitle>
                            <CardDescription>This information was captured from a successful Secure COD authorization.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><span className="font-medium text-muted-foreground">Razorpay Payment ID:</span> {paymentInfo.paymentId}</div>
                            <div><span className="font-medium text-muted-foreground">Authorization Status:</span> <span className="capitalize bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{paymentInfo.status}</span></div>
                            <div><span className="font-medium text-muted-foreground">Authorized At:</span> {format(new Date(paymentInfo.authorizedAt), "PPP p")}</div>
                            <div className="flex items-center">
                                <a 
                                    href={`https://dashboard.razorpay.com/app/payments/${paymentInfo.paymentId}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    View on Razorpay <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </CardContent>
                        <CardFooter>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={isCharging || order.paymentStatus.toLowerCase() === 'paid'}>
                                        {isCharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                        {order.paymentStatus.toLowerCase() === 'paid' ? 'Payment Captured' : `Charge Authorized Payment (₹${order.price})`}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will immediately charge the customer's authorized card for the full amount of ₹{order.price}. This cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleChargePayment}>Yes, Charge Now</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Core Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="orderId">Order ID</Label>
                            <Input id="orderId" value={order.orderId} onChange={(e) => handleInputChange('orderId', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name</Label>
                            <Input id="customerName" value={order.customerName} onChange={(e) => handleInputChange('customerName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactNo">Contact No.</Label>
                            <Input id="contactNo" value={order.contactNo} onChange={(e) => handleInputChange('contactNo', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="customerEmail">Email</Label>
                            <Input id="customerEmail" value={order.customerEmail || ''} onChange={(e) => handleInputChange('customerEmail', e.target.value)} placeholder="customer@example.com"/>
                        </div>
                         <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="customerAddress">Address</Label>
                            <Input id="customerAddress" value={order.customerAddress} onChange={(e) => handleInputChange('customerAddress', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pincode">Pincode</Label>
                            <Input id="pincode" value={order.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="productOrdered">Product(s)</Label>
                            <Input id="productOrdered" value={order.productOrdered} onChange={(e) => handleInputChange('productOrdered', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" type="number" value={order.quantity} onChange={(e) => handleInputChange('quantity', parseInt(e.target.value, 10))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input id="price" value={order.price} onChange={(e) => handleInputChange('price', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={order.date} onChange={(e) => handleInputChange('date', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="paymentStatus">Payment Status</Label>
                             <Select value={order.paymentStatus} onValueChange={(value) => handleSelectChange('paymentStatus', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Intent Verified">Intent Verified</SelectItem>
                                    <SelectItem value="Authorized">Authorized</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Refunded">Refunded</SelectItem>
                                    <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                                    <SelectItem value="Voided">Voided</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Delivery Tracking</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="courierCompanyName">Courier Company</Label>
                            <Input id="courierCompanyName" value={order.courierCompanyName || ''} onChange={(e) => handleInputChange('courierCompanyName', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="trackingNumber">Tracking No.</Label>
                            <Input id="trackingNumber" value={order.trackingNumber || ''} onChange={(e) => handleInputChange('trackingNumber', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="readyForDispatchDate">Ready For Dispatch</Label>
                            <Input id="readyForDispatchDate" type="date" value={order.readyForDispatchDate || ''} onChange={(e) => handleInputChange('readyForDispatchDate', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="estDelivery">Est. Delivery Date</Label>
                            <Input id="estDelivery" type="date" value={order.estDelivery || ''} onChange={(e) => handleInputChange('estDelivery', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deliveryStatus">Delivery Status</Label>
                            <Select value={order.deliveryStatus || 'pending'} onValueChange={(value) => handleSelectChange('deliveryStatus', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="dispatched">Dispatched</SelectItem>
                                <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="failed">Delivery Failed</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                     <CardFooter>
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleSendLink}
                            disabled={isSendingLink}
                        >
                          {isSendingLink ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Send Payment Link
                        </Button>
                    </CardFooter>
                </Card>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cancellation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="cancellationReason">Reason for Cancellation</Label>
                                <Input id="cancellationReason" value={order.cancellationReason || ''} onChange={(e) => handleInputChange('cancellationReason', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cancellationStatus">Cancellation Status</Label>
                                <Select value={order.cancellationStatus || 'Pending'} onValueChange={(value) => handleSelectChange('cancellationStatus', value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Processed">Processed</SelectItem>
                                    <SelectItem value="Failed">Failed</SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Refund</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="refundAmount">Refund Amount</Label>
                                <Input id="refundAmount" value={order.refundAmount || ''} onChange={(e) => handleInputChange('refundAmount', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="refundReason">Reason for Refund</Label>
                                <Input id="refundReason" value={order.refundReason || ''} onChange={(e) => handleInputChange('refundReason', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="refundStatus">Refund Status</Label>
                                <Select value={order.refundStatus || 'Pending'} onValueChange={(value) => handleSelectChange('refundStatus', value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Processed">Processed</SelectItem>
                                    <SelectItem value="Failed">Failed</SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
