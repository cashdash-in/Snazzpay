
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/app/orders/page';
import { Badge } from "@/components/ui/badge";
import { sanitizePhoneNumber } from "@/lib/utils";
import { getCollection } from "@/services/firestore";

export default function SellerLogisticsPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchSellerOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const allVendorOrders = await getCollection<EditableOrder>('vendor_orders');
            // Filter orders that belong to this seller's pushed orders
            const myPushedOrders = allVendorOrders.filter(o => o.sellerId === user.uid);
            setOrders(myPushedOrders);
        } catch (error) {
            console.error("Failed to load seller logistics orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading your orders",
                description: "Could not load orders from the logistics hub.",
            });
        }
        setLoading(false);
    }, [toast, user]);

    useEffect(() => {
        fetchSellerOrders();
    }, [fetchSellerOrders]);

    const handleShareWithReseller = (order: EditableOrder) => {
        const message = `Update for order #${order.orderId} for ${order.customerName}: The status is now "${order.deliveryStatus || 'Processing'}". ${order.trackingNumber ? `You can track it with ${order.courierCompanyName} using AWB: ${order.trackingNumber}` : ''}`;
        
        // This is a placeholder for a more complex reseller selection UI
        const resellerPhone = "919999988888"; // Example reseller phone
        
        const whatsappUrl = `https://wa.me/${resellerPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        toast({title: "Sharing Update", description: "Opening WhatsApp to share status with your reseller."})
    };
    
    const handleNotifyCustomer = (order: EditableOrder) => {
        if (!order.contactNo) {
            toast({
                variant: 'destructive',
                title: 'Customer Contact Missing',
                description: 'Cannot send a notification without the customer\'s phone number.'
            });
            return;
        }

        const message = `Hi ${order.customerName}, here is an update on your order #${order.orderId}. The current status is: "${order.deliveryStatus || 'Processing'}". ${order.trackingNumber ? `You can track it with ${order.courierCompanyName} using AWB: ${order.trackingNumber}` : 'Tracking information will be available soon.'}`;
        
        const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        toast({title: "Notifying Customer", description: "Opening WhatsApp to send status update."})
    };


    return (
        <AppShell title="Logistics Hub">
            <Card>
                <CardHeader>
                    <CardTitle>My Logistics Hub</CardTitle>
                    <CardDescription>Track the fulfillment status of orders you've pushed to your vendor.</CardDescription>
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
                                        <TableHead>Courier</TableHead>
                                        <TableHead>Tracking No.</TableHead>
                                        <TableHead>Fulfillment Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length > 0 ? (
                                        orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.orderId}</TableCell>
                                                <TableCell>{order.customerName}</TableCell>
                                                <TableCell>{order.courierCompanyName || 'N/A'}</TableCell>
                                                <TableCell className="font-mono text-xs">{order.trackingNumber || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={order.deliveryStatus === 'dispatched' ? 'default' : 'secondary'}>
                                                        {order.deliveryStatus || 'Pending Fulfillment'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleNotifyCustomer(order)} disabled={!order.contactNo}>
                                                        <MessageSquare className="mr-2 h-4 w-4" /> Notify Customer
                                                    </Button>
                                                    <Button variant="secondary" size="sm" onClick={() => handleShareWithReseller(order)}>
                                                        <MessageSquare className="mr-2 h-4 w-4" /> Share with Reseller
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                You have not pushed any orders to your vendor yet.
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
