
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, ExternalLink, CreditCard, Send, Loader2 as ButtonLoader, Mail, Printer, Copy, ShieldAlert, AlertTriangle, MessageSquare } from 'lucide-react';
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
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { sanitizePhoneNumber } from '@/lib/utils';

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


function OrderDetailContent() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const orderIdParam = params.id as string;
    
    const [order, setOrder] = useState<EditableOrder | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCharging, setIsCharging] = useState(false);
    const [isSendingLink, setIsSendingLink] = useState(false);
    const [cancellationFee, setCancellationFee] = useState('');
    const [isProcessingFee, setIsProcessingFee] = useState(false);


    const isManualOrder = order ? !order.id.startsWith('gid://') && !/^\d+$/.test(order.id) : false;

    const loadOrderData = useCallback(async () => {
        if (!orderIdParam) return;
        setLoading(true);
        
        let foundOrder: EditableOrder | null = null;
        
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
        
        foundOrder = allOrders.find(o => o.id === orderIdParam) || null;

        if (foundOrder) {
             const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${foundOrder.id}`) || '{}');
             foundOrder = {...foundOrder, ...storedOverrides};
             if (!foundOrder.cancellationId) {
                foundOrder.cancellationId = `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`;
                localStorage.setItem(`order-override-${foundOrder.id}`, JSON.stringify({ ...storedOverrides, cancellationId: foundOrder.cancellationId }));
             }
        }
        
        setOrder(foundOrder);

        if (foundOrder) {
            const paymentInfoJSON = localStorage.getItem(`payment_info_${foundOrder.orderId}`);
            if (paymentInfoJSON) {
                setPaymentInfo(JSON.parse(paymentInfoJSON));
            } else {
                setPaymentInfo(null);
            }
        }

        setLoading(false);
    }, [orderIdParam]);
    
    useEffect(() => {
        loadOrderData();
    }, [loadOrderData]);

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
    
    const saveStatusAndFeeChange = (newStatus: string, fee?: string) => {
        if (!order) return;
        const updatedOrderData: Partial<EditableOrder> = { paymentStatus: newStatus };
        if (fee !== undefined) {
            updatedOrderData.cancellationFee = fee;
        }

        const updatedOrder = { ...order, ...updatedOrderData };
        setOrder(updatedOrder);

        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
        const newOverrides = { ...storedOverrides, ...updatedOrderData };
        localStorage.setItem(`order-override-${order.id}`, JSON.stringify(newOverrides));
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
            
            saveStatusAndFeeChange('Paid');

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
    
    const sendAuthLink = async (order: EditableOrder, method: 'email') => {
        if (!order) return;
        setIsSendingLink(true);
        
        try {
            const response = await fetch('/api/send-auth-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, method }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to send link via ${method}.`);
            }

            toast({
                title: "Link Sent Successfully!",
                description: result.message,
            });

        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: `Error Sending Link`,
                description: error.message,
            });
        } finally {
            setIsSendingLink(false);
        }
    };

    const copyAuthLink = (order: EditableOrder) => {
        if (!order) return;
        const baseUrl = window.location.origin;
        const secureUrl = `${baseUrl}/secure-cod?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}`;
        navigator.clipboard.writeText(secureUrl);
        toast({
            title: "Link Copied!",
            description: "The secure COD authorization link has been copied to your clipboard.",
        });
    };
    
    const sendWhatsAppNotification = (order: EditableOrder) => {
        if (!order) return;
        const secureUrl = `${window.location.origin}/secure-cod?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}`;
        const message = `Hi ${order.customerName}! Thanks for your order #${order.orderId} from Snazzify. Please click this link to confirm your payment with our modern & secure COD process. Your funds are held in a Trust Wallet and only released on dispatch for 100% safety. ${secureUrl}`;
        const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleProcessCancellationFee = async () => {
        if (!order || !paymentInfo) {
            toast({ variant: 'destructive', title: "Error", description: "Order or payment details are missing." });
            return;
        }
        const fee = parseFloat(cancellationFee);
        if (isNaN(fee) || fee <= 0) {
            toast({ variant: 'destructive', title: "Invalid Fee", description: "Please enter a valid cancellation fee amount." });
            return;
        }

        setIsProcessingFee(true);
        try {
            const response = await fetch('/api/charge-cancellation-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: paymentInfo.paymentId,
                    totalAmount: parseFloat(order.price),
                    feeAmount: fee,
                    reason: `Cancellation fee for order ${order.orderId}`
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }
            saveStatusAndFeeChange('Fee Charged', cancellationFee);
            toast({ title: "Success", description: result.message });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Fee Processing Failed", description: error.message });
        } finally {
            setIsProcessingFee(false);
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
    
    const showChargeButton = order.paymentStatus === 'Authorized' && paymentInfo;
    const showCancellationFeeCard = order.paymentStatus === 'Voided' && paymentInfo;


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
                    <div className="flex items-center gap-2">
                        <Link href={`/invoice/${order.id}`}>
                          <Button variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Invoice
                          </Button>
                        </Link>
                        <Button onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>

                {showChargeButton && (
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
                                    <Button disabled={isCharging}>
                                        {isCharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                        Charge Authorized Payment (₹{order.price})
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
                
                {showCancellationFeeCard && (
                     <Card className="border-amber-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-amber-500"/>Process Cancellation Fee</CardTitle>
                            <CardDescription>This order was cancelled after payment authorization. You can charge a service/shipping fee by performing a partial refund. The remaining amount will be returned to the customer.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-end gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cancellation-fee">Fee to Charge (INR)</Label>
                                <Input 
                                    id="cancellation-fee"
                                    type="number"
                                    placeholder="e.g., 150"
                                    value={cancellationFee}
                                    onChange={(e) => setCancellationFee(e.target.value)}
                                />
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="destructive" disabled={isProcessingFee || !cancellationFee}>
                                        {isProcessingFee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Process Charges
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Cancellation Charges</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will charge the customer <strong className="text-foreground">₹{cancellationFee}</strong> and refund the rest of the authorized amount. This action is final. Are you sure?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleProcessCancellationFee}>Yes, Process Charges</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
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
                                    <SelectItem value="Fee Charged">Fee Charged</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Delivery &amp; Communication</CardTitle>
                        <CardDescription>Update tracking info or send payment authorization links to the customer.</CardDescription>
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
                     <CardFooter className="gap-2">
                        <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => sendWhatsAppNotification(order)}
                            disabled={!order.contactNo}
                            title={!order.contactNo ? "Contact number is required" : "Send WhatsApp Notification"}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            WhatsApp
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => sendAuthLink(order, 'email')}
                            disabled={isSendingLink || !order.customerEmail}
                            title={!order.customerEmail ? "Customer email is required" : "Send Authorization Link via Email"}
                        >
                          {isSendingLink ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                          Email Link
                        </Button>
                         <Button variant="secondary" size="sm" onClick={() => copyAuthLink(order)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
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
                                <Label htmlFor="cancellationId">Cancellation ID</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="cancellationId" value={order.cancellationId || ''} readOnly className="font-mono bg-muted" />
                                    <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(order.cancellationId || '')}>Copy ID</Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Provide this unique ID to the customer to allow them to cancel the order.</p>
                            </div>
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

export default function OrderDetailPage() {
    return <OrderDetailContent />;
}
