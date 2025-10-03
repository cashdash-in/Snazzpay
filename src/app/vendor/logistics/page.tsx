
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '@/app/orders/page';
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument } from "@/services/firestore";
import { sanitizePhoneNumber } from "@/lib/utils";

type OrderStatus = 'pending' | 'packed' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'rto';

export default function VendorLogisticsPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchVendorOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const allVendorOrders = await getCollection<EditableOrder>('vendor_orders');
            const myOrders = allVendorOrders.filter(o => (o as any).vendorId === user.uid);
            setOrders(myOrders);
        } catch (error) {
            console.error("Failed to load vendor orders:", error);
            toast({ variant: 'destructive', title: "Error loading orders" });
        }
        setLoading(false);
    }, [toast, user]);

    useEffect(() => {
        fetchVendorOrders();
    }, [fetchVendorOrders]);

    const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
        setOrders(prevOrders => prevOrders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        ));
    };

    const handleSave = async (orderId: string) => {
        setUpdatingId(orderId);
        const orderToSave = orders.find(o => o.id === orderId);
        if (!orderToSave) {
            setUpdatingId(null);
            return;
        }

        try {
            const updateData = {
                deliveryStatus: orderToSave.deliveryStatus,
                courierCompanyName: orderToSave.courierCompanyName,
                trackingNumber: orderToSave.trackingNumber,
                readyForDispatchDate: orderToSave.readyForDispatchDate,
                estDelivery: orderToSave.estDelivery,
            };

            await saveDocument('vendor_orders', updateData, orderToSave.id);
            // Also update the main orders collection so the admin has the latest status
            await saveDocument('orders', updateData, orderToSave.id);

            toast({ title: "Status Updated", description: `Order ${orderToSave.orderId} has been saved.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Saving' });
        } finally {
            setUpdatingId(null);
        }
    };
    
    const sendNotification = async (order: EditableOrder, type: 'dispatch' | 'delivery') => {
        if (!order.customerEmail) {
            toast({variant: 'destructive', title: 'Customer Email Missing'});
            return;
        }
        setUpdatingId(order.id);
         try {
            const response = await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, type }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast({title: 'Notification Sent', description: `An email has been sent to ${order.customerEmail}`});
         } catch(e: any) {
             toast({variant: 'destructive', title: 'Failed to Send Email', description: e.message});
         } finally {
            setUpdatingId(null);
         }
    };
    
    const sendWhatsApp = (order: EditableOrder) => {
        if (!order.contactNo) return;
        const message = `Hi ${order.customerName}, your order #${order.orderId} is now ${order.deliveryStatus}. Tracking: ${order.courierCompanyName} - ${order.trackingNumber}`;
        const url = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <AppShell title="Logistics Hub">
            <Card>
                <CardHeader>
                    <CardTitle>Logistics & Fulfillment</CardTitle>
                    <CardDescription>Update shipment status for orders pushed to you by sellers. Updates will be visible to the seller and admin.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Courier &amp; AWB</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right w-[250px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.orderId}</TableCell>
                                            <TableCell>{order.customerName}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Input
                                                        value={order.courierCompanyName || ''}
                                                        onChange={(e) => handleFieldChange(order.id, 'courierCompanyName', e.target.value)}
                                                        placeholder="e.g., Delhivery"
                                                        className="h-8"
                                                    />
                                                    <Input
                                                        value={order.trackingNumber || ''}
                                                        onChange={(e) => handleFieldChange(order.id, 'trackingNumber', e.target.value)}
                                                        placeholder="AWB Number"
                                                        className="h-8"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                     <Input
                                                        type="date"
                                                        value={order.readyForDispatchDate || ''}
                                                        onChange={(e) => handleFieldChange(order.id, 'readyForDispatchDate', e.target.value)}
                                                        className="h-8"
                                                    />
                                                    <Input
                                                        type="date"
                                                        value={order.estDelivery || ''}
                                                        onChange={(e) => handleFieldChange(order.id, 'estDelivery', e.target.value)}
                                                        className="h-8"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={order.deliveryStatus || 'pending'} onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'deliveryStatus', value)}>
                                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="packed">Packed</SelectItem>
                                                        <SelectItem value="dispatched">Dispatched</SelectItem>
                                                        <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                                                        <SelectItem value="delivered">Delivered</SelectItem>
                                                        <SelectItem value="rto">Return to Origin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="outline" size="icon" onClick={() => handleSave(order.id)} disabled={updatingId === order.id} title="Save Changes">
                                                    {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="secondary" size="icon" onClick={() => sendWhatsApp(order)} disabled={!order.contactNo} title="Send WhatsApp Update">
                                                    <MessageSquare className="h-4 w-4" />
                                                </Button>
                                                <Button variant="secondary" size="icon" onClick={() => sendNotification(order, 'dispatch')} disabled={!order.customerEmail || updatingId === order.id} title="Send Email Notification">
                                                    <Mail className="h-4 w-4" />
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
