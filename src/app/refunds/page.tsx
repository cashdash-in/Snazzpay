
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2, Save, Loader2 as ButtonLoader } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { v4 as uuidv4 } from 'uuid';


type RefundStatus = 'Pending' | 'Processed' | 'Failed';

function isRefundStatus(value: any): value is RefundStatus {
    return ['Pending', 'Processed', 'Failed'].includes(value);
}

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country];
    return parts.filter(Boolean).join(', ');
}

function mapShopifyToEditable(order: ShopifyOrder): EditableOrder {
    return {
        id: order.id.toString(),
        orderId: order.name,
        customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        customerAddress: formatAddress(order.shipping_address),
        pincode: order.shipping_address?.zip || 'N/A',
        contactNo: order.customer?.phone || 'N/A',
        productOrdered: order.line_items.map(item => item.title).join(', '),
        quantity: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: order.total_price,
        paymentStatus: order.financial_status || 'Pending',
        date: format(new Date(order.created_at), "yyyy-MM-dd"),
    };
}

export default function RefundsPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAndSetOrders = useCallback(async () => {
    setLoading(true);
    let combinedOrders: EditableOrder[] = [];
    try {
        const shopifyOrders = await getOrders();
        const shopifyEditableOrders = shopifyOrders.map(mapShopifyToEditable);
        combinedOrders = [...combinedOrders, ...shopifyEditableOrders];
    } catch (error) {
        console.error("Failed to fetch Shopify orders:", error);
        toast({
            variant: 'destructive',
            title: "Failed to load Shopify Orders",
            description: "Displaying manually added orders only. Check Shopify API keys in Settings.",
        });
    }

    try {
        const manualOrdersJSON = localStorage.getItem('manualOrders');
        const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
        combinedOrders = [...combinedOrders, ...manualOrders];
    } catch (error) {
        console.error("Failed to load manual orders:", error);
        toast({
            variant: 'destructive',
            title: "Error loading manual orders",
            description: "Could not load orders from local storage.",
        });
    }

    const orderGroups = new Map<string, EditableOrder[]>();
    combinedOrders.forEach(order => {
        const group = orderGroups.get(order.orderId) || [];
        group.push(order);
        orderGroups.set(order.orderId, group);
    });

    const unifiedOrders: EditableOrder[] = [];
    orderGroups.forEach((group) => {
        const representativeOrder = group.reduce((acc, curr) => ({ ...acc, ...curr }), group[0]);
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${representativeOrder.id}`) || '{}');

        const finalOrder: EditableOrder = {
            ...representativeOrder,
            ...storedOverrides,
            refundStatus: isRefundStatus(storedOverrides.refundStatus)
                ? storedOverrides.refundStatus
                : undefined,
        };
        
        const hasRefunded = group.some(o => o.refundStatus === 'Processed' || o.paymentStatus === 'Refunded') || finalOrder.refundStatus === 'Processed';
        if (hasRefunded) {
            finalOrder.refundStatus = 'Processed';
            finalOrder.paymentStatus = 'Refunded';
        }
        
        const hasVoided = group.some(o => o.paymentStatus === 'Voided' || o.cancellationStatus === 'Processed') || finalOrder.paymentStatus === 'Voided';
        if (hasVoided) {
            finalOrder.paymentStatus = 'Voided';
        }

        if (!finalOrder.cancellationId) {
            finalOrder.cancellationId = `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`;
        }
        
        unifiedOrders.push(finalOrder);
    });

    setOrders(unifiedOrders);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };

  const handleSave = (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;

    const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
    const newOverrides = { ...storedOverrides, ...orderToSave };
    localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));

    toast({
        title: "Refund Info Saved",
        description: `Details for order ${orderToSave.orderId} have been updated.`,
    });
  };

  const handleRemove = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    toast({
        variant: 'destructive',
        title: "Order Removed",
        description: "The order has been removed from this view.",
    });
  };

  const handleProcessRefund = async (order: EditableOrder) => {
    setProcessingRefundId(order.id);

    const paymentInfoJSON = localStorage.getItem(`payment_info_${order.orderId}`);
    if (!paymentInfoJSON) {
        toast({
            variant: 'destructive',
            title: "Cannot Process Refund Automatically",
            description: "No Razorpay payment information found for this order. This might be a manual order or one where the customer did not complete authorization. Please process manually in Razorpay.",
        });
        setProcessingRefundId(null);
        return;
    }
    const paymentInfo = JSON.parse(paymentInfoJSON);
    const paymentId = paymentInfo.paymentId;

    try {
        const response = await fetch('/api/refund-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentId: paymentId,
                amount: order.refundAmount || order.price,
                reason: order.refundReason
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error);
        }

        toast({
            title: "Refund Processed",
            description: result.message,
        });

        const updatedOrders = orders.map(o => o.id === order.id ? {...o, refundStatus: 'Processed', paymentStatus: 'Refunded'} : o)
        setOrders(updatedOrders);
        const orderToSave = updatedOrders.find(o => o.id === order.id);
        if (orderToSave) {
            const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
            const newOverrides = { ...storedOverrides, ...orderToSave };
            localStorage.setItem(`order-override-${order.id}`, JSON.stringify(newOverrides));
        }

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Refund Failed",
            description: error.message,
        });
    } finally {
        setProcessingRefundId(null);
    }
  };

  return (
    <AppShell title="Refunds">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Refund Management</CardTitle>
                <CardDescription>View and manage all order refunds. Note: For post-dispatch cancellations, capture Rs. 300 from the mandate.</CardDescription>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Refund Amount</TableHead>
                  <TableHead>Reason for Refund</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline cursor-pointer">
                          {order.orderId}
                        </Link>
                    </TableCell>
                    <TableCell><Input value={order.customerName} onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)} className="w-40" /></TableCell>
                    <TableCell><Input type="date" value={order.date} onChange={(e) => handleFieldChange(order.id, 'date', e.target.value)} className="w-32" /></TableCell>
                    <TableCell>₹{order.price}</TableCell>
                    <TableCell><Input value={order.refundAmount || ''} onChange={(e) => handleFieldChange(order.id, 'refundAmount', e.target.value)} placeholder={order.price} className="w-36" /></TableCell>
                    <TableCell><Input value={order.refundReason || ''} onChange={(e) => handleFieldChange(order.id, 'refundReason', e.target.value)} placeholder="e.g., Post-dispatch cancellation" className="w-48" /></TableCell>
                    <TableCell>
                        <Select
                            value={order.refundStatus || 'Pending'}
                            onValueChange={(value: RefundStatus) => {
                                setOrders(prev => prev.map(o => 
                                    o.id === order.id ? { ...o, refundStatus: value } : o
                                ));
                            }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Processed">Processed</SelectItem>
                            <SelectItem value="Failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell className="text-center space-x-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button 
                                    variant="destructive"
                                    size="sm"
                                    disabled={processingRefundId === order.id || order.refundStatus === 'Processed'}
                                >
                                    {processingRefundId === order.id && <ButtonLoader className="mr-2 h-4 w-4 animate-spin" />}
                                    {order.refundStatus === 'Processed' ? 'Refunded' : 'Process Refund'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to process this refund?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will initiate a refund of <strong>₹{order.refundAmount || order.price}</strong> for order <strong>{order.orderId}</strong> via Razorpay. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleProcessRefund(order)}>Yes, Process Refund</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="icon" onClick={() => handleSave(order.id)}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(order.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
