
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPaymentInfo, updateOrder } from "@/services/firestore";
import { getOrders as getShopifyOrders } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2, Save, MessageSquare, CreditCard, Ban, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { sanitizePhoneNumber } from "@/lib/utils";
import { usePageRefresh } from "@/hooks/usePageRefresh";

export type EditableOrder = {
  id: string; // Firestore document ID or unique local ID
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
  source?: 'Shopify' | 'Manual' | 'Seller';
};

function mapShopifyOrderToEditableOrder(shopifyOrder: any): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    const products = shopifyOrder.line_items.map((item: any) => item.title).join(', ');

    return {
        id: `shopify-${shopifyOrder.id.toString()}`,
        orderId: shopifyOrder.name,
        customerName,
        customerEmail: customer?.email || undefined,
        customerAddress: shopifyOrder.shipping_address ? `${shopifyOrder.shipping_address.address1}, ${shopifyOrder.shipping_address.city}, ${shopifyOrder.shipping_address.zip}` : 'N/A',
        pincode: shopifyOrder.shipping_address?.zip || 'N/A',
        contactNo: shopifyOrder.customer?.phone || 'N/A',
        productOrdered: products,
        quantity: shopifyOrder.line_items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        price: shopifyOrder.total_price,
        paymentStatus: shopifyOrder.financial_status || 'Pending',
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
        source: 'Shopify',
    };
}

const TEST_ORDER_ID = '#TEST-1001';

export default function OrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingChargeId, setProcessingChargeId] = useState<string | null>(null);
  const { toast } = useToast();
  const { refreshKey } = usePageRefresh();

  const fetchAndSetOrders = useCallback(async () => {
    setLoading(true);
    try {
        let allOrders: EditableOrder[] = [];
        
        const shopifyPromise = getShopifyOrders().catch(e => {
            console.error("Shopify fetch failed:", e.message);
            toast({ variant: "destructive", title: "Could not load Shopify orders."});
            return [];
        });

        const manualOrdersJSON = localStorage.getItem('manualOrders');
        const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
        allOrders.push(...manualOrders.map(o => ({ ...o, source: o.source || 'Manual' })));

        const sellerOrdersJSON = localStorage.getItem('seller_orders');
        if (sellerOrdersJSON) {
            allOrders.push(...JSON.parse(sellerOrdersJSON).map((o: EditableOrder) => ({...o, source: 'Seller'})));
        }

        const shopifyOrders = await shopifyPromise;
        allOrders.push(...shopifyOrders.map(mapShopifyOrderToEditableOrder));
        
        const orderMap = new Map<string, EditableOrder>();

        allOrders.forEach(order => {
             const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
             const finalOrder = { ...order, ...storedOverrides };

             const existing = orderMap.get(finalOrder.orderId);
             
             const isDefinitive = (status: string) => ['Paid', 'Authorized', 'Fee Charged'].includes(status);
             
             if (!existing || isDefinitive(finalOrder.paymentStatus) || (!isDefinitive(existing?.paymentStatus || '') && finalOrder.source !== 'Shopify')) {
                  orderMap.set(finalOrder.orderId, finalOrder);
             }
        });
        
        let unifiedOrders = Array.from(orderMap.values());

        const testOrderExists = unifiedOrders.some(order => order.orderId === TEST_ORDER_ID);
        if (!testOrderExists) {
             const testOrder: EditableOrder = {
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
                source: 'Manual',
            };
            unifiedOrders.unshift(testOrder);
        }
        
        const finalOrders = unifiedOrders.filter(o => o.paymentStatus !== 'Intent Verified');
        setOrders(finalOrders);

    } catch (error: any) {
        console.error("Failed to load orders:", error);
        toast({
            variant: 'destructive',
            title: "Failed to load orders",
            description: error.message || "Could not retrieve order data.",
        });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders, refreshKey]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string | number) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };
  
  const handleSaveOrder = async (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;
    try {
        await updateOrder(orderToSave.id, orderToSave);
        toast({
            title: "Changes Saved",
            description: `Order ${orderToSave?.orderId} has been updated.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Error Saving Order",
            description: error.message,
        });
    }
  };

  const handleRemoveOrder = async (orderId: string, sourceId: string) => {
    try {
        if(sourceId.startsWith('shopify-')){
             localStorage.removeItem(`order-override-${sourceId}`);
        } else {
            let manualOrders: EditableOrder[] = JSON.parse(localStorage.getItem('manualOrders') || '[]');
            manualOrders = manualOrders.filter(o => o.id !== sourceId);
            localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
            
            let sellerOrders: EditableOrder[] = JSON.parse(localStorage.getItem('seller_orders') || '[]');
            sellerOrders = sellerOrders.filter(o => o.id !== sourceId);
            localStorage.setItem('seller_orders', JSON.stringify(sellerOrders));
        }

        setOrders(prev => prev.filter(order => order.id !== sourceId));
        toast({
            variant: 'destructive',
            title: "Order Removed",
            description: "The order has been removed from local lists.",
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Error Removing Order",
            description: error.message,
        });
    }
  };

  const sendWhatsAppNotification = (order: EditableOrder) => {
    let message = '';
    const secureUrl = `${window.location.origin}/secure-cod?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}`;

    if (order.paymentStatus === 'Pending') {
        message = `Hi ${order.customerName}! Thanks for your order #${order.orderId} from Snazzify. Please click this link to confirm your payment with our modern & secure COD process. Your funds are held in a Trust Wallet and only released on dispatch for 100% safety. ${secureUrl}`;
    } else if (order.deliveryStatus === 'dispatched' && order.trackingNumber) {
        message = `Great news, ${order.customerName}! Your Snazzify order #${order.orderId} has been shipped with ${order.courierCompanyName || 'our courier'}, tracking no. ${order.trackingNumber}. Your secure payment has now been finalized. Thank you for shopping with us!`;
    } else if (order.cancellationStatus === 'Processed' || order.paymentStatus === 'Voided') {
        message = `Hi ${order.customerName}, this confirms the cancellation of your Snazzify order #${order.orderId}. Your payment authorization has been voided. We hope to see you again!`;
    } else if (order.refundStatus === 'Processed' || order.paymentStatus === 'Refunded') {
        message = `Hi ${order.customerName}, your refund for order #${order.orderId} has been processed. You should see the amount in your account within 5-7 business days.`;
    } else {
        message = `Hi ${order.customerName}, this is a notification regarding your Snazzify order #${order.orderId}.`;
    }

    const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

    const handleQuickCapture = async (order: EditableOrder) => {
        setProcessingChargeId(order.id);
        const paymentInfo = await getPaymentInfo(order.orderId);

        if (!paymentInfo) {
            toast({
                variant: 'destructive',
                title: "Payment Info Not Found",
                description: `Cannot charge order ${order.orderId}. No payment authorization found.`,
            });
            setProcessingChargeId(null);
            return;
        }

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
            await updateOrder(order.id, { paymentStatus: 'Paid' });
            setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

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
                  <TableHead>Source</TableHead>
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
                            <TableCell><Badge variant={order.source === 'Shopify' ? 'secondary' : 'outline'}>{order.source || 'Manual'}</Badge></TableCell>
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
                                <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.orderId, order.id)}>
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
