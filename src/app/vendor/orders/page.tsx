
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Truck, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/app/orders/page';
import { Badge } from "@/components/ui/badge";
import { sanitizePhoneNumber } from "@/lib/utils";
import { getCollection, saveDocument } from "@/services/firestore";

export default function VendorOrdersPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchVendorOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch orders from Firestore that are assigned to this vendor
            const allVendorOrders = await getCollection<EditableOrder>('vendor_orders');
            const myOrders = allVendorOrders.filter(o => (o as any).vendorId === user.uid);
            
            setOrders(myOrders);

        } catch (error) {
            console.error("Failed to load vendor orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading your orders",
                description: "Could not load orders from Firestore.",
            });
        }
        setLoading(false);
    }, [toast, user]);

    useEffect(() => {
        fetchVendorOrders();
    }, [fetchVendorOrders]);


    const handleMarkAsDispatched = async (order: EditableOrder) => {
        const updatedOrder = { ...order, deliveryStatus: 'dispatched' as const };
        
        try {
            // Update the order in both vendor and main orders collection
            await saveDocument('vendor_orders', { deliveryStatus: 'dispatched' }, order.id);
            await saveDocument('orders', { deliveryStatus: 'dispatched' }, order.id);

            setOrders(prevOrders => prevOrders.map(o => o.id === order.id ? updatedOrder : o));
            
            toast({
                title: "Order Marked as Dispatched",
                description: "The seller and admin can now see the updated status.",
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Failed to Update Status",
            });
        }
    };

    const handleShareOnWhatsApp = (order: EditableOrder) => {
        if (!order.contactNo) {
            toast({
                variant: 'destructive',
                title: 'Customer Contact Missing',
                description: 'Cannot share on WhatsApp without a customer phone number.'
            });
            return;
        }
        const message = `Hi ${order.customerName}, your order #${order.orderId} for "${order.productOrdered}" is being processed by the vendor and will be dispatched soon.`;
        const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <AppShell title="Orders from Sellers">
            <Card>
                <CardHeader>
                    <CardTitle>Orders from Your Sellers</CardTitle>
                    <CardDescription>These are confirmed and paid orders pushed to you for fulfillment.</CardDescription>
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
                                        <TableHead>Payment Type</TableHead>
                                        <TableHead>Fulfillment Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length > 0 ? (
                                        orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline cursor-pointer">
                                                        {order.orderId}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{order.customerName}</TableCell>
                                                <TableCell>{order.productOrdered}</TableCell>
                                                <TableCell>
                                                     <Badge variant={(order as any).paymentMethod === 'Cash on Delivery' ? "secondary" : "default"}>
                                                        {(order as any).paymentMethod || 'Prepaid'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={order.deliveryStatus === 'dispatched' ? 'default' : 'secondary'}>
                                                        {order.deliveryStatus || 'Pending Fulfillment'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleMarkAsDispatched(order)} disabled={order.deliveryStatus === 'dispatched'}>
                                                        <Truck className="mr-2 h-4 w-4" /> {order.deliveryStatus === 'dispatched' ? 'Dispatched' : 'Mark as Dispatched'}
                                                    </Button>
                                                    <Button variant="secondary" size="sm" onClick={() => handleShareOnWhatsApp(order)}>
                                                        <MessageSquare className="mr-2 h-4 w-4" /> Notify Customer
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                You have no orders from sellers yet.
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
