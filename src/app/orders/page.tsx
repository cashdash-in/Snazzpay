
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2, Save, MessageSquare, RefreshCw, CreditCard, Ban, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export type EditableOrder = {
  id: string; // Internal unique ID for React key
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerAddress: string;
  pincode: string;
  contactNo: string;
  productOrdered: string;
  quantity: number;
  price: string;
  paymentStatus: string;
  date: string;
  // Fields from other tabs
  trackingNumber?: string;
  courierCompanyName?: string;
  deliveryStatus?: 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';
  estDelivery?: string;
  readyForDispatchDate?: string;
  cancellationId?: string;
  cancellationReason?: string;
  cancellationStatus?: 'Pending' | 'Processed' | 'Failed';
  cancellationFee?: string;
  refundAmount?: string;
  refundReason?: string;
  refundStatus?: 'Pending' | 'Processed' | 'Failed';
};

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country];
    return parts.filter(Boolean).join(', ');
}

function mapShopifyOrderToEditableOrder(shopifyOrder: ShopifyOrder): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    
    let paymentStatus: string = 'Pending';
    switch (shopifyOrder.financial_status) {
        case 'paid': paymentStatus = 'Paid'; break;
        case 'pending': paymentStatus = 'Pending'; break;
        case 'refunded': case 'partially_refunded': paymentStatus = 'Refunded'; break;
        case 'authorized': paymentStatus = 'Authorized'; break;
        case 'partially_paid': paymentStatus = 'Partially Paid'; break;
        case 'voided': paymentStatus = 'Voided'; break;
        default: paymentStatus = shopifyOrder.financial_status || 'Pending';
    }
    
    const products = shopifyOrder.line_items.map(item => item.title).join(', ');

    return {
        id: shopifyOrder.id.toString(),
        orderId: shopifyOrder.name,
        customerName,
        customerEmail: shopifyOrder.customer?.email || undefined,
        customerAddress: formatAddress(shopifyOrder.shipping_address),
        pincode: shopifyOrder.shipping_address?.zip || 'N/A',
        contactNo: shopifyOrder.customer?.phone || 'N/A',
        productOrdered: products,
        quantity: shopifyOrder.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: shopifyOrder.total_price,
        paymentStatus,
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
    };
}

const TEST_ORDER_ID = '#TEST-1001';

export default function OrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingChargeId, setProcessingChargeId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAndSetOrders = useCallback(async () => {
    setLoading(true);
    let shopifyEditableOrders: EditableOrder[] = [];
    try {
        const shopifyOrders = await getOrders();
        shopifyEditableOrders = shopifyOrders.map(mapShopifyOrderToEditableOrder);
    } catch (error) {
        console.error("Failed to fetch Shopify orders:", error);
        toast({
            variant: 'destructive',
            title: "Failed to load Shopify Orders",
            description: "Displaying manually added orders only. Check Shopify API keys in Settings.",
        });
    }

    let manualOrders: EditableOrder[] = [];
    try {
        const manualOrdersJSON = localStorage.getItem('manualOrders');
        manualOrders = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
        
        const testOrderExists = manualOrders.some(order => order.orderId === TEST_ORDER_ID);
        if (!testOrderExists) {
             manualOrders.unshift({
                id: uuidv4(),
                orderId: TEST_ORDER_ID,
                customerName: 'Test Customer',
                customerEmail: 'test@example.com',
                customerAddress: '123 Test Street, Testville',
                pincode: '12345',
                contactNo: '9876543210',
                productOrdered: 'Sample Product for Testing',
                quantity: 1,
                price: '499.00',
                paymentStatus: 'Pending',
                date: format(new Date(), 'yyyy-MM-dd'),
            });
            localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
        }
    } catch (error) {
        console.error("Failed to load manual orders:", error);
        toast({
            variant: 'destructive',
            title: "Error loading manual orders",
            description: "Could not load orders from local storage.",
        });
    }

    let combinedOrders = [...manualOrders, ...shopifyEditableOrders];

    const orderGroups = new Map<string, EditableOrder[]>();
    combinedOrders.forEach(order => {
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
        const finalOrder = { ...order, ...storedOverrides };
        const group = orderGroups.get(finalOrder.orderId) || [];
        group.push(finalOrder);
        orderGroups.set(finalOrder.orderId, group);
    });

    const unifiedOrders: EditableOrder[] = [];
    orderGroups.forEach((group) => {
        let representativeOrder = group.reduce((acc, curr) => ({ ...acc, ...curr }), group[0]);
        
        // Let the most recent status override others.
        // This is a simplification; a more robust system would use timestamps.
        const hasVoided = group.some(o => o.paymentStatus === 'Voided' || o.cancellationStatus === 'Processed');
        const hasRefunded = group.some(o => o.paymentStatus === 'Refunded' || o.refundStatus === 'Processed');
        const hasFeeCharged = group.some(o => o.paymentStatus === 'Fee Charged');
        
        if (hasVoided) representativeOrder.paymentStatus = 'Voided';
        if (hasRefunded) representativeOrder.paymentStatus = 'Refunded';
        if (hasFeeCharged) representativeOrder.paymentStatus = 'Fee Charged';

        // Ensure cancellation ID exists
        if (!representativeOrder.cancellationId) {
             representativeOrder.cancellationId = `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`;
        }

        unifiedOrders.push(representativeOrder);
    });

    const finalOrders = unifiedOrders.filter(o => o.paymentStatus !== 'Intent Verified');

    setOrders(finalOrders);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string | number) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };
  
  const handleSaveOrder = (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;

    const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
    const newOverrides = { ...storedOverrides, ...orderToSave };
    localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));

    toast({
        title: "Changes Saved",
        description: `Order ${orderToSave?.orderId} has been updated.`,
    });
  };

  const handleRemoveOrder = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    
    const manualOrdersJSON = localStorage.getItem('manualOrders');
    if(manualOrdersJSON) {
        let manualOrders: EditableOrder[] = JSON.parse(manualOrdersJSON);
        manualOrders = manualOrders.filter(o => o.id !== orderId);
        localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
    }
    
    localStorage.removeItem(`order-override-${orderId}`);

    toast({
        variant: 'destructive',
        title: "Order Removed",
        description: "The order has been removed.",
    });
  };

  const sendWhatsAppNotification = (order: EditableOrder) => {
    let message = `Hi ${order.customerName}, this is a notification regarding your Snazzify order #${order.orderId}.`;

    if (order.cancellationStatus === 'Processed' || order.paymentStatus === 'Voided') {
        message = `Hi ${order.customerName}, this is to confirm that your order #${order.orderId} has been successfully cancelled.`
    } else if (order.refundStatus === 'Processed' || order.paymentStatus === 'Refunded') {
        message = `Hi ${order.customerName}, your refund for order #${order.orderId} has been processed. You should see the amount in your account within 5-7 business days.`
    } else if (order.deliveryStatus === 'dispatched' && order.trackingNumber) {
        message = `Hi ${order.customerName}, great news! Your Snazzify order #${order.orderId} has been dispatched. You can track it with number: ${order.trackingNumber}`;
    }

    const whatsappUrl = `https://wa.me/${order.contactNo}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

    const handleQuickCapture = async (order: EditableOrder) => {
        setProcessingChargeId(order.id);
        const paymentInfoJSON = localStorage.getItem(`payment_info_${order.orderId}`);
        if (!paymentInfoJSON) {
            toast({
                variant: 'destructive',
                title: "Payment Info Not Found",
                description: `Cannot charge order ${order.orderId}. No payment authorization found.`,
            });
            setProcessingChargeId(null);
            return;
        }

        const paymentInfo = JSON.parse(paymentInfoJSON);

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
            if (!response.ok) throw new Error(result.error || 'Failed to charge payment.');

            const updatedOrder = { ...order, paymentStatus: 'Paid' };
            setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

            const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
            localStorage.setItem(`order-override-${order.id}`, JSON.stringify({ ...storedOverrides, paymentStatus: 'Paid' }));

            toast({
                title: "Charge Successful!",
                description: `Successfully charged ₹${order.price} for order ${order.orderId}.`,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Charge Failed",
                description: error.message,
            });
        } finally {
            setProcessingChargeId(null);
        }
    };

  return (
    <AppShell title="All Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>View and manage all orders. Click an Order ID to see full details.</CardDescription>
            </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={fetchAndSetOrders}>
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    Refresh
                </Button>
                <Link href="/orders/new">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Order
                </Button>
                </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                    const isAuthorized = order.paymentStatus === 'Authorized';
                    const isProcessing = processingChargeId === order.id;

                    return (
                        <TableRow key={order.id}>
                            <TableCell>
                                <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline cursor-pointer">
                                    {order.orderId}
                                </Link>
                            </TableCell>
                            <TableCell><Input value={order.customerName} onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)} className="w-40" /></TableCell>
                            <TableCell><Input value={order.price} onChange={(e) => handleFieldChange(order.id, 'price', e.target.value)} className="w-24" /></TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <Input value={order.paymentStatus} onChange={(e) => handleFieldChange(order.id, 'paymentStatus', e.target.value)} className="w-32 h-8" />
                                    {order.cancellationStatus === 'Processed' && (
                                        <Badge variant="destructive" className="w-fit"><Ban className="mr-1 h-3 w-3"/>Cancelled</Badge>
                                    )}
                                    {order.refundStatus === 'Processed' && (
                                        <Badge variant="destructive" className="w-fit"><CircleDollarSign className="mr-1 h-3 w-3"/>Refunded</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell><Input type="date" value={order.date} onChange={(e) => handleFieldChange(order.id, 'date', e.target.value)} className="w-32" /></TableCell>
                            <TableCell className="text-center space-x-2">
                                {isAuthorized && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="outline" disabled={isProcessing} title="Capture Payment">
                                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Capture Payment for {order.orderId}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will charge the customer's authorized card for the full amount of ₹{order.price}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleQuickCapture(order)}>Yes, Charge Now</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Button 
                                    variant="secondary" 
                                    size="icon" 
                                    onClick={() => sendWhatsAppNotification(order)}
                                    disabled={!order.contactNo}
                                    title="Notify on WhatsApp"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleSaveOrder(order.id)}>
                                    <Save className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

    