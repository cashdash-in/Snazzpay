
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

type CancellationOrder = {
  id: string; // Internal unique ID
  orderId: string;
  customerName: string;
  date: string;
  reason: string;
  status: 'Pending' | 'Processed' | 'Failed';
};

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country];
    return parts.filter(Boolean).join(', ');
}

function mapToCancellationOrder(order: EditableOrder): CancellationOrder {
    const cancellationState = JSON.parse(localStorage.getItem('cancellationState') || '{}');
    const specificOrderState = cancellationState[order.id] || {};
    return {
        id: order.id,
        orderId: order.orderId,
        customerName: order.customerName,
        date: order.date,
        reason: specificOrderState.reason || '',
        status: specificOrderState.status || 'Pending',
    };
}

export default function CancellationsPage() {
  const [orders, setOrders] = useState<CancellationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchOrders() {
        setLoading(true);
        let combinedOrders: EditableOrder[] = [];
        try {
            const shopifyOrders = await getOrders();
            const shopifyEditableOrders = shopifyOrders.map(order => ({
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
            }));
            combinedOrders = [...shopifyEditableOrders];
        } catch (error) {
            console.error("Failed to fetch Shopify orders:", error);
        }

        const manualOrdersJSON = localStorage.getItem('manualOrders');
        const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
        
        combinedOrders = [...combinedOrders, ...manualOrders];
        setOrders(combinedOrders.map(mapToCancellationOrder));
        setLoading(false);
    }
    fetchOrders();
  }, []);

  const handleFieldChange = (orderId: string, field: keyof CancellationOrder, value: string) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };

  const handleSave = (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;

    const cancellationState = JSON.parse(localStorage.getItem('cancellationState') || '{}');
    cancellationState[orderId] = {
        reason: orderToSave.reason,
        status: orderToSave.status,
    };
    localStorage.setItem('cancellationState', JSON.stringify(cancellationState));
    toast({
        title: "Cancellation Info Saved",
        description: `Details for order ${orderToSave.orderId} have been updated.`,
    });
  };

  const handleRemove = (orderId: string) => {
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    
    // Also remove from local storage if it's a manual order
    const manualOrdersJSON = localStorage.getItem('manualOrders');
    if (manualOrdersJSON) {
        let manualOrders: EditableOrder[] = JSON.parse(manualOrdersJSON);
        manualOrders = manualOrders.filter(o => o.id !== orderId);
        localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
    }
    
    const cancellationState = JSON.parse(localStorage.getItem('cancellationState') || '{}');
    delete cancellationState[orderId];
    localStorage.setItem('cancellationState', JSON.stringify(cancellationState));
    
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
                <CardDescription>View and manage all order cancellations.</CardDescription>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Reason for Cancellation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell><Input value={order.orderId} onChange={(e) => handleFieldChange(order.id, 'orderId', e.target.value)} className="w-28" /></TableCell>
                    <TableCell><Input value={order.customerName} onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)} className="w-40" /></TableCell>
                    <TableCell><Input type="date" value={order.date} onChange={(e) => handleFieldChange(order.id, 'date', e.target.value)} className="w-32" /></TableCell>
                    <TableCell><Input value={order.reason} onChange={(e) => handleFieldChange(order.id, 'reason', e.target.value)} placeholder="e.g., Customer request" className="w-64" /></TableCell>
                    <TableCell>
                        <Select
                            value={order.status}
                            onValueChange={(value: 'Pending' | 'Processed' | 'Failed') => handleFieldChange(order.id, 'status', value)}
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
