
'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { getCollection } from "@/services/firestore";
import { useState, useEffect } from "react";
import type { EditableOrder } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";


export function RecentOrders() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function fetchAndSetOrders() {
        setLoading(true);
        try {
            const allOrders = await getCollection<EditableOrder>('orders');
            const sortedOrders = allOrders.sort((a, b) => {
                try {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                } catch(e) { return 0; }
            });
            const recentOrders = sortedOrders.slice(0, 5);
            setOrders(recentOrders);

        } catch (error) {
            console.error("Failed to load orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading recent orders",
            });
        }
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
                  <Link href={`/orders/${order.id}`}>
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
