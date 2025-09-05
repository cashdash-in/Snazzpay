
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { useAuth } from "@/hooks/use-auth";
import type { EditableOrder } from '@/app/orders/page';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { refreshKey } = usePageRefresh();
  const { user } = useAuth();

  const fetchSellerOrders = useCallback(() => {
    if (!user) return;
    setLoading(true);
    try {
      const allSellerOrdersJSON = localStorage.getItem('seller_orders');
      const allSellerOrders: EditableOrder[] = allSellerOrdersJSON ? JSON.parse(allSellerOrdersJSON) : [];
      
      // In a real multi-tenant app, you'd filter by seller ID.
      // For this prototype, we'll assume all orders in this key belong to the logged-in seller.
      setOrders(allSellerOrders);

    } catch (error) {
      console.error("Failed to load seller orders:", error);
      toast({
        variant: 'destructive',
        title: "Error loading your orders",
        description: "Could not load orders from local storage.",
      });
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    fetchSellerOrders();
  }, [fetchSellerOrders, refreshKey]);

  const handleRemoveOrder = (orderId: string) => {
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    localStorage.setItem('seller_orders', JSON.stringify(updatedOrders));
    toast({
        variant: 'destructive',
        title: "Order Removed",
        description: "The order has been removed successfully.",
    });
  };

  return (
    <AppShell title="My Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>My Orders</CardTitle>
              <CardDescription>Add new orders and track their status as they are processed by the admin.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href="/seller/orders/new">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Order
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
                    <TableHead>Product(s)</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderId}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.productOrdered}</TableCell>
                        <TableCell>₹{order.price}</TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell>{order.paymentStatus}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        You haven't added any orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
