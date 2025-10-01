
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

export default function VendorOrdersPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchVendorOrders = useCallback(() => {
        if (!user) return;
        setLoading(true);
        try {
            const ordersStorageKey = `vendor_orders_${user.uid}`;
            const allVendorOrdersJSON = localStorage.getItem(ordersStorageKey);
            const allVendorOrders: EditableOrder[] = allVendorOrdersJSON ? JSON.parse(allVendorOrdersJSON) : [];
            
            const unifiedOrders = allVendorOrders.map(order => {
                const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                return { ...order, ...storedOverrides };
            });
      
            setOrders(unifiedOrders);

        } catch (error) {
            console.error("Failed to load vendor orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading your orders",
                description: "Could not load orders from local storage.",
            });
        }
        setLoading(false);
    }, [toast, user]);

    useEffect(() => {
        fetchVendorOrders();
    }, [fetchVendorOrders]);

    const handleMarkAsDispatched = (orderId: string) => {
        const updatedOrders = orders.map(o => 
            o.id === orderId ? { ...o, deliveryStatus: 'dispatched' } : o
        );
        setOrders(updatedOrders);

        // Also update the master override for this order so seller sees it
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
        const newOverrides = { ...storedOverrides, deliveryStatus: 'dispatched' };
        localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));

        toast({
            title: "Order Marked as Dispatched",
            description: "The seller and admin can now see the updated status.",
        });
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
                                        <TableHead>Date Received</TableHead>
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
                                                <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={order.deliveryStatus === 'dispatched' ? 'default' : 'secondary'}>
                                                        {order.deliveryStatus || 'Pending Fulfillment'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleMarkAsDispatched(order.id)} disabled={order.deliveryStatus === 'dispatched'}>
                                                        <Truck className="mr-2 h-4 w-4" /> Mark as Dispatched
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

    