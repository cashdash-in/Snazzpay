
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";

type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';

type EditableOrder = {
  orderId: string;
  customerName: string;
  amount: number;
  date: string;
  trackingNumber: string;
  status: OrderStatus;
  estDelivery: string;
};

function mapShopifyOrderToEditableOrder(shopifyOrder: ShopifyOrder): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    
    return {
        orderId: shopifyOrder.name,
        customerName,
        amount: parseFloat(shopifyOrder.total_price),
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
        trackingNumber: '',
        status: 'pending',
        estDelivery: '',
    };
}


export default function DeliveryTrackingPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);

    useEffect(() => {
        async function fetchOrders() {
            const shopifyOrders = await getOrders();
            const allOrders = shopifyOrders.map(mapShopifyOrderToEditableOrder);
            setOrders(allOrders);
        }
        fetchOrders();
    }, []);

    const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.orderId === orderId ? { ...order, [field]: value } : order
            )
        );
    };

  return (
    <AppShell title="Delivery Tracking">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Management</CardTitle>
          <CardDescription>Update dispatch details and track delivery status for your orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tracking No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Est. Delivery</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>
                    <Input 
                        placeholder="Enter Tracking No." 
                        className="w-40" 
                        value={order.trackingNumber}
                        onChange={(e) => handleFieldChange(order.orderId, 'trackingNumber', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                        value={order.status}
                        onValueChange={(value: OrderStatus) => handleFieldChange(order.orderId, 'status', value)}
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
                  <TableCell>
                     <Input 
                        type="date" 
                        className="w-40" 
                        value={order.estDelivery}
                        onChange={(e) => handleFieldChange(order.orderId, 'estDelivery', e.target.value)}
                     />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm">
                      <Send className="mr-2 h-4 w-4" />
                      Notify Customer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
