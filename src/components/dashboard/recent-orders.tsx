
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Send, Loader2 } from "lucide-react";


type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';

type EditableOrder = {
  id: string;
  orderId: string;
  customerName: string;
  customerAddress: string;
  pincode: string;
  contactNo: string;
  trackingNumber: string;
  status: OrderStatus;
  estDelivery: string;
};

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country, address.zip];
    return parts.filter(Boolean).join(', ');
}

function mapShopifyOrderToEditableOrder(order: ShopifyOrder): EditableOrder {
    const customer = order.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    
    return {
        id: order.id.toString(),
        orderId: order.name,
        customerName: customerName,
        customerAddress: formatAddress(order.shipping_address),
        pincode: order.shipping_address?.zip || 'N/A',
        contactNo: customer?.phone || 'N/A',
        trackingNumber: '',
        status: 'pending',
        estDelivery: '',
    };
}


export function RecentOrders() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchOrders() {
        setLoading(true);
        const shopifyOrders = await getOrders();
        const recentOrders = shopifyOrders.slice(0, 5).map(mapShopifyOrderToEditableOrder);
        setOrders(recentOrders);
        setLoading(false);
    }
    fetchOrders();
  }, []);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
    setOrders(prevOrders =>
        prevOrders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders Dashboard</CardTitle>
        <CardDescription>Quickly update tracking for your 5 most recent orders.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Address / Contact</TableHead>
              <TableHead>Tracking No.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Est. Delivery</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderId}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell className="text-xs">
                    <div>{order.customerAddress}</div>
                    <div className="font-medium">{order.contactNo}</div>
                </TableCell>
                <TableCell>
                    <Input 
                        placeholder="Tracking No." 
                        className="w-40" 
                        value={order.trackingNumber}
                        onChange={(e) => handleFieldChange(order.id, 'trackingNumber', e.target.value)}
                    />
                </TableCell>
                 <TableCell>
                    <Select
                        value={order.status}
                        onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'status', value)}
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
                        onChange={(e) => handleFieldChange(order.id, 'estDelivery', e.target.value)}
                     />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                        <Send className="mr-2 h-4 w-4" />
                        Notify
                    </Button>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
