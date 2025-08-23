
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { PlusCircle, Save, Loader2 } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

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


export default function LogisticsHubPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAndSetOrders() {
            setLoading(true);
            let combinedOrders: EditableOrder[] = [];
            try {
                const shopifyOrders = await getOrders();
                combinedOrders = [...combinedOrders, ...shopifyOrders.map(mapShopifyToEditable)];
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

            // For Logistics Hub, we only care about 'Paid' orders that need dispatch
            setOrders(unifiedOrders.filter(o => o.paymentStatus === 'Paid'));
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
        
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
        const newOverrides = { ...storedOverrides, ...orderToSave };
        localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));
        
        toast({
            title: "Delivery Info Saved",
            description: `Details for order ${orderToSave.orderId} have been updated.`,
        });
    };
    
  return (
    <AppShell title="Logistics Hub">
      <Card>
        <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Logistics Hub Management</CardTitle>
                    <CardDescription>Assign paid orders to logistics partners for dispatch.</CardDescription>
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
                    <TableHead>Address</TableHead>
                    <TableHead>Courier Partner</TableHead>
                    <TableHead>Tracking No.</TableHead>
                    <TableHead>Delivery Status</TableHead>
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
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerAddress}</TableCell>
                      <TableCell>
                        <Input 
                            placeholder="e.g., Delhivery, BlueDart" 
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
                        <Select
                            value={order.deliveryStatus || 'pending'}
                            onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'deliveryStatus', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending Dispatch</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="failed">Delivery Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleSave(order.id)}>
                            <Save className="h-4 w-4" />
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
