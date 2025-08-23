
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';

type CancellationStatus = 'Pending' | 'Processed' | 'Failed';

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


export default function CancellationsPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAndSetOrders() {
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
            if (hasVoided) {
                representativeOrder.paymentStatus = 'Voided';
                representativeOrder.cancellationStatus = 'Processed';
            }

            const sharedCancellationId = group.find(o => o.cancellationId)?.cancellationId;
            if (sharedCancellationId) {
                representativeOrder.cancellationId = sharedCancellationId;
            } else {
                 representativeOrder.cancellationId = `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`;
            }

            unifiedOrders.push(representativeOrder);
        });

        setOrders(unifiedOrders);
        setLoading(false);
    }
    fetchAndSetOrders();
  }, [toast]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
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
        title: "Cancellation Info Saved",
        description: `Details for order ${orderToSave.orderId} have been updated.`,
    });
  };

  const handleRemove = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    
    const manualOrdersJSON = localStorage.getItem('manualOrders');
    if (manualOrdersJSON) {
        let manualOrders: EditableOrder[] = JSON.parse(manualOrdersJSON);
        manualOrders = manualOrders.filter(o => o.id !== orderId);
        localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
    }
    
    localStorage.removeItem(`order-override-${orderId}`);
    
    toast({
        variant: 'destructive',
        title: "Order Removed",
        description: "The order has been removed from cancellations.",
    });
  };

  return (
    <AppShell title="Payment Cancellations">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Cancellation Management</CardTitle>
                <CardDescription>View and manage all order cancellations. Click an Order ID to see full details.</CardDescription>
            </div>
            <Link href="/orders/new">
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
                  <TableHead>Date</TableHead>
                  <TableHead>Reason for Cancellation</TableHead>
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
                    <TableCell><Input value={order.cancellationReason || ''} onChange={(e) => handleFieldChange(order.id, 'cancellationReason', e.target.value)} placeholder="e.g., Customer request" className="w-64" /></TableCell>
                    <TableCell>
                        <Select
                            value={order.cancellationStatus || 'Pending'}
                            onValueChange={(value: CancellationStatus) => handleFieldChange(order.id, 'cancellationStatus', value)}
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
                        <Button variant="outline" size="icon" onClick={() => handleSave(order.id)}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemove(order.id)}>
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
