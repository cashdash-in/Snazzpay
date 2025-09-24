
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { Trash2, PlusCircle, Save, Loader2 as ButtonLoader, Mail, Copy, MessageSquare, Facebook, Instagram } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { sanitizePhoneNumber } from "@/lib/utils";
import { usePageRefresh } from "@/hooks/usePageRefresh";

type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country, address.zip];
    return parts.filter(Boolean).join(', ');
}

function mapShopifyToEditable(order: ShopifyOrder): EditableOrder {
    return {
        id: order.id.toString(),
        orderId: order.name,
        customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        customerEmail: order.customer?.email || undefined,
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


export default function DeliveryTrackingPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingState, setSendingState] = useState<string | null>(null);
    const { toast } = useToast();
    const { refreshKey } = usePageRefresh();

    const fetchAndSetOrders = useCallback(async () => {
        setLoading(true);
        let combinedOrders: EditableOrder[] = [];
        try {
            const shopifyOrders = await getOrders();
            combinedOrders.push(...shopifyOrders.map(mapShopifyToEditable));
        } catch (error) {
            console.error("Failed to fetch Shopify orders:", error);
        }

        try {
            const manualOrdersJSON = localStorage.getItem('manualOrders');
            const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
            combinedOrders.push(...manualOrders);
        } catch (error) {
            console.error("Failed to load manual orders:", error);
        }
        
        try {
            const sellerOrdersJSON = localStorage.getItem('seller_orders');
            const sellerOrders: EditableOrder[] = sellerOrdersJSON ? JSON.parse(sellerOrdersJSON) : [];
            combinedOrders.push(...sellerOrders);
        } catch (error) {
            console.error("Failed to load seller orders:", error);
        }

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

            const hasVoided = group.some(o => o.paymentStatus === 'Voided' || o.cancellationStatus === 'Processed');
            const hasRefunded = group.some(o => o.paymentStatus === 'Refunded' || o.refundStatus === 'Processed');

            if (hasVoided) {
                representativeOrder.paymentStatus = 'Voided';
            } else if (hasRefunded) {
                representativeOrder.paymentStatus = 'Refunded';
            }
            
            if (!representativeOrder.cancellationId) {
                 representativeOrder.cancellationId = `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`;
            }

            unifiedOrders.push(representativeOrder);
        });

        setOrders(unifiedOrders.filter(o => o.paymentStatus !== 'Intent Verified'));
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchAndSetOrders();
    }, [fetchAndSetOrders, refreshKey]);

    const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
        const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        );
        setOrders(updatedOrders);
    };

    const handleSave = (orderId: string) => {
        const orderToSave = orders.find(o => o.id === orderId);
        if (!orderToSave) return;
        
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
        const newOverrides = { ...storedOverrides, ...orderToSave };
        localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));

        toast({
            title: "Delivery Info Saved",
            description: `Details for order ${orderToSave.orderId} have been updated.`,
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
            description: "The order has been removed from delivery tracking.",
        });
    };

    const sendAuthLink = async (order: EditableOrder, method: 'email') => {
        setSendingState(order.id);
        
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
            setSendingState(null);
        }
    };

    const getSecureUrl = (order: EditableOrder) => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/secure-cod?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}`;
    };

    const copyAuthLink = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        navigator.clipboard.writeText(secureUrl);
        toast({
            title: "Link Copied!",
            description: "The secure COD authorization link has been copied to your clipboard.",
        });
    };
    
    const sendWhatsAppNotification = (order: EditableOrder) => {
        let message = '';
        if (order.deliveryStatus === 'dispatched' && order.trackingNumber) {
            message = `Great news, ${order.customerName}! Your Snazzify order #${order.orderId} has been shipped with ${order.courierCompanyName || 'our courier'}, tracking no. ${order.trackingNumber}.`;
        } else {
             const secureUrl = getSecureUrl(order);
             message = `Hi ${order.customerName}! Thanks for your order #${order.orderId} from Snazzify. Please click this link to confirm your payment with our modern & secure COD process. Your funds are held in a Trust Wallet and only released on dispatch for 100% safety. ${secureUrl}`;
        }
        const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const shareToFacebook = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(secureUrl)}`;
        window.open(facebookShareUrl, '_blank', 'width=600,height=400');
    };
    
    const shareToInstagram = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        navigator.clipboard.writeText(secureUrl);
        toast({
            title: "Link Copied for Instagram!",
            description: "Paste this link into your Instagram message.",
        });
    };

  return (
    <AppShell title="Delivery Tracking">
      <Card>
        <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Delivery Management</CardTitle>
                    <CardDescription>Manage all orders, their delivery status, and send payment links. Click an Order ID to see full details.</CardDescription>
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
                    <TableHead>Contact / Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-[550px]">Actions</TableHead>
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
                      <TableCell>
                         <Input
                            value={order.customerName}
                            onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)}
                            className="w-40"
                            placeholder="Customer Name"
                        />
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-1">
                             <Input
                                value={order.contactNo}
                                onChange={(e) => handleFieldChange(order.id, 'contactNo', e.target.value)}
                                className="w-32 h-8"
                                placeholder="Contact No."
                            />
                            <Input
                                value={order.customerEmail || ''}
                                onChange={(e) => handleFieldChange(order.id, 'customerEmail', e.target.value)}
                                className="w-40 h-8"
                                placeholder="Email Address"
                            />
                         </div>
                      </TableCell>
                       <TableCell>
                        <Select
                            value={order.deliveryStatus || 'pending'}
                            onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'deliveryStatus', value)}
                        >
                          <SelectTrigger className="w-[180px]">
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
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="secondary" size="sm" onClick={() => shareToFacebook(order)} title="Share to Facebook"><Facebook className="h-4 w-4" /></Button>
                        <Button variant="secondary" size="sm" onClick={() => shareToInstagram(order)} title="Copy Link for Instagram"><Instagram className="h-4 w-4" /></Button>
                        <Button variant="secondary" size="sm" onClick={() => sendWhatsAppNotification(order)} disabled={!order.contactNo} title={!order.contactNo ? "Contact number is required" : "Send WhatsApp Notification"}><MessageSquare className="h-4 w-4" /></Button>
                        <Button variant="default" size="sm" onClick={() => sendAuthLink(order, 'email')} disabled={sendingState === order.id || !order.customerEmail} title={!order.customerEmail ? "Customer email is required" : "Send Authorization Link via Email"}>
                          {sendingState === order.id ? <ButtonLoader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => copyAuthLink(order)} title="Copy Payment Link"><Copy className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => handleSave(order.id)} title="Save Changes"><Save className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)} title="Remove Order"><Trash2 className="h-4 w-4" /></Button>
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
