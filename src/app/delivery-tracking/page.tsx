
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Send, Trash2, PlusCircle, Save, Loader2 as ButtonLoader } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";

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
    const [sendingLinkId, setSendingLinkId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAndSetOrders() {
            setLoading(true);
            let combinedOrders: EditableOrder[] = [];
            try {
                const shopifyOrders = await getOrders();
                const shopifyEditableOrders = shopifyOrders.map(mapShopifyToEditable);
                combinedOrders = [...shopifyEditableOrders];
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

            const finalOrders = combinedOrders.map(order => {
                const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                return { ...order, ...storedOverrides };
            });

            setOrders(finalOrders);
            setLoading(false);
        }
        fetchAndSetOrders();
    }, [toast]);

    const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
        const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        );
        setOrders(updatedOrders);
    };

    const handleSave = (orderId: string) => {
        const orderToSave = orders.find(o => o.id === orderId);
        if (!orderToSave) return;
        
        if (orderToSave.id.startsWith('gid://') || orderToSave.id.match(/^\d+$/)) {
          const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
          const newOverrides = { ...storedOverrides, ...orderToSave };
          localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));
        } else {
          const manualOrdersJSON = localStorage.getItem('manualOrders');
          let manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
          const orderIndex = manualOrders.findIndex(o => o.id === orderId);
          if (orderIndex > -1) {
            manualOrders[orderIndex] = orderToSave;
            localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
          }
        }

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

    const handleSendLink = async (order: EditableOrder) => {
        setSendingLinkId(order.id);
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
            setSendingLinkId(null);
        }
    };

  return (
    <AppShell title="Delivery Tracking">
      <Card>
        <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Delivery Management</CardTitle>
                    <CardDescription>Manage dispatch details and delivery status. Click an Order ID to see full details.</CardDescription>
                </div>
                <Link href="/orders/new" passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Order
                    </Button>
                </Link>
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
                    <TableHead>Address</TableHead>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Courier Company</TableHead>
                    <TableHead>Tracking No.</TableHead>
                    <TableHead>Ready for Dispatch</TableHead>
                    <TableHead>Est. Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-[250px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} passHref>
                            <span className="font-medium text-primary hover:underline cursor-pointer">{order.orderId}</span>
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
                         <Input
                            value={order.customerAddress}
                            onChange={(e) => handleFieldChange(order.id, 'customerAddress', e.target.value)}
                            className="w-48 text-xs"
                             placeholder="Shipping Address"
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.pincode}
                            onChange={(e) => handleFieldChange(order.id, 'pincode', e.target.value)}
                            className="w-24"
                            placeholder="Pincode"
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.contactNo}
                            onChange={(e) => handleFieldChange(order.id, 'contactNo', e.target.value)}
                            className="w-32"
                            placeholder="Contact No."
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                            placeholder="Courier Name" 
                            className="w-40" 
                            value={order.courierCompanyName || ''}
                            onChange={(e) => handleFieldChange(order.id, 'courierCompanyName', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                            placeholder="Enter Tracking No." 
                            className="w-40" 
                            value={order.trackingNumber || ''}
                            onChange={(e) => handleFieldChange(order.id, 'trackingNumber', e.target.value)}
                        />
                      </TableCell>
                       <TableCell>
                         <Input 
                            type="date" 
                            className="w-40" 
                            value={order.readyForDispatchDate || ''}
                            onChange={(e) => handleFieldChange(order.id, 'readyForDispatchDate', e.target.value)}
                         />
                      </TableCell>
                      <TableCell>
                         <Input 
                            type="date" 
                            className="w-40" 
                            value={order.estDelivery || ''}
                            onChange={(e) => handleFieldChange(order.id, 'estDelivery', e.target.value)}
                         />
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
                      <TableCell className="text-center space-x-2">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleSendLink(order)}
                            disabled={sendingLinkId === order.id}
                        >
                          {sendingLinkId === order.id ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Send Payment Link
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleSave(order.id)}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)}>
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
