
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveDocument, deleteDocument } from "@/services/firestore";

type CancellationStatus = 'Pending' | 'Processed' | 'Failed';

export default function CancellationsPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAndSetOrders = useCallback(async () => {
    setLoading(true);
    try {
        const allOrders = await getCollection<EditableOrder>('orders');
        setOrders(allOrders.map(o => ({...o, cancellationId: o.cancellationId || `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`})));
    } catch (error) {
        console.error("Failed to load orders:", error);
        toast({
            variant: 'destructive',
            title: "Error loading orders",
            description: "Could not load orders from Firestore.",
        });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };

  const handleSave = async (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;

    try {
        await saveDocument('orders', orderToSave, orderId);
        toast({
            title: "Cancellation Info Saved",
            description: `Details for order ${orderToSave.orderId} have been updated.`,
        });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error Saving' });
    }
  };

  const handleRemove = async (orderId: string) => {
    // This will likely not delete the order, but maybe remove it from this view
    // For now, it just removes from the state. To persist, we'd need a flag in Firestore
    setOrders(prev => prev.filter(order => order.id !== orderId));
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
