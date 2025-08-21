
'use client';

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
import type { EditableOrder } from "@/app/orders/page";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";


function mapShopifyToEditable(order: ShopifyOrder): EditableOrder {
    return {
        id: order.id.toString(),
        orderId: order.name,
        customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        customerAddress: 'N/A', // Not needed for this compact view
        pincode: 'N/A',
        contactNo: 'N/A',
        productOrdered: order.line_items.map(item => item.title).join(', '),
        quantity: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: order.total_price,
        paymentStatus: order.financial_status || 'Pending',
        date: format(new Date(order.created_at), "yyyy-MM-dd"),
    };
}


export function RecentOrders() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function fetchAndSetOrders() {
        setLoading(true);
        let combinedOrders: EditableOrder[] = [];
        try {
            const shopifyOrders = await getOrders();
            combinedOrders.push(...shopifyOrders.map(mapShopifyToEditable));
        } catch (error) {
            console.error("Failed to fetch Shopify orders:", error);
            // Non-blocking, we can still show manual orders
        }

        try {
            const manualOrdersJSON = localStorage.getItem('manualOrders');
            const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
            combinedOrders.push(...manualOrders);
        } catch (error) {
            console.error("Failed to load manual orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading manual orders",
                description: "Could not load orders from local storage.",
            });
        }

        const ordersWithOverrides = combinedOrders.map(order => {
          const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
          return { ...order, ...storedOverrides };
        });

        const sortedOrders = ordersWithOverrides.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recentOrders = sortedOrders.slice(0, 5);
        setOrders(recentOrders);
        setLoading(false);
    }
    fetchAndSetOrders();
  }, [toast]);


  if (loading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link href={`/orders/${order.id}`} passHref>
                    <div className="font-medium text-primary hover:underline cursor-pointer">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.orderId}</div>
                  </Link>
                </TableCell>
                <TableCell>
                    <Badge 
                        variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'}
                        className={
                            order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                            order.paymentStatus === 'Authorized' ? 'bg-yellow-100 text-yellow-800' :
                            ['Voided', 'Refunded'].includes(order.paymentStatus) ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }
                    >
                        {order.paymentStatus}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">₹{parseFloat(order.price).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}