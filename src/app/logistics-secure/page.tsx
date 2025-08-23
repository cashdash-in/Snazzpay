
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Save, Loader2, Trash2, MoreVertical, Search } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed' | 'rto' | 'ndr';

type LogisticsPartner = {
    id: string;
    name: string;
    contactPerson: string;
    contactEmail: string;
};

const initialPartners: LogisticsPartner[] = [
    { id: 'partner-1', name: 'Delhivery', contactPerson: 'Suresh Gupta', contactEmail: 'suresh@delhivery.com' },
    { id: 'partner-2', name: 'BlueDart', contactPerson: 'Anita Rao', contactEmail: 'anita.r@bluedart.com' },
    { id: 'partner-3', name: 'XpressBees', contactPerson: 'Raj Singh', contactEmail: 'raj.singh@xpressbees.com' },
];

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country, address.zip];
    return parts.filter(Boolean).join(', ');
}

function mapShopifyToEditable(order: ShopifyOrder): EditableOrder {
    return {
        id: order.id.toString(),
        orderId: order.name,
        customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        customerEmail: order.customer?.email || undefined,
        customerAddress: formatAddress(order.shipping_address),
        pincode: order.shipping_address?.zip || 'N/A',
        contactNo: order.customer?.phone || 'N/A',
        productOrdered: order.line_items.map(item => item.title).join(', '),
        quantity: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: order.total_price,
        paymentStatus: order.financial_status || 'Pending',
        date: format(new Date(order.created_at), "yyyy-MM-dd"),
    };
}


export default function LogisticsHubPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [partners, setPartners] = useState<LogisticsPartner[]>(initialPartners);
    const [loading, setLoading] = useState(true);
    const [newPartner, setNewPartner] = useState({ name: '', contactPerson: '', contactEmail: '' });
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAndSetOrders() {
            setLoading(true);
            let combinedOrders: EditableOrder[] = [];
            try {
                const shopifyOrders = await getOrders();
                combinedOrders.push(...shopifyOrders.map(mapShopifyToEditable));
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: "Failed to load Shopify Orders",
                });
            }

            try {
                const manualOrdersJSON = localStorage.getItem('manualOrders');
                const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
                combinedOrders.push(...manualOrders);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: "Error loading manual orders",
                });
            }

            const unifiedOrders = combinedOrders.map(order => {
                 const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                 return { ...order, ...storedOverrides };
            }).filter(o => o.paymentStatus === 'Paid');

            setOrders(unifiedOrders);
            setLoading(false);
        }
        fetchAndSetOrders();
    }, [toast]);
    
    const partnerStats = useMemo(() => {
        return partners.map(partner => {
            const assignedOrders = orders.filter(o => o.courierCompanyName === partner.name);
            return {
                ...partner,
                totalShipments: assignedOrders.length,
                outForDelivery: assignedOrders.filter(o => o.deliveryStatus === 'out-for-delivery').length,
                delivered: assignedOrders.filter(o => o.deliveryStatus === 'delivered').length,
                rto: assignedOrders.filter(o => o.deliveryStatus === 'rto').length,
                ndr: assignedOrders.filter(o => o.deliveryStatus === 'failed').length,
            };
        });
    }, [partners, orders]);

    const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
        const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        );
        setOrders(updatedOrders);
    };

    const handleSave = (orderId: string) => {
        const orderToSave = orders.find(o => o.id === orderId);
        if (!orderToSave) return;
        
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
        const newOverrides = { ...storedOverrides, ...orderToSave };
        localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));
        
        toast({
            title: "Shipment Info Saved",
            description: `Details for order ${orderToSave.orderId} have been updated.`,
        });
    };
    
    const handleAddPartner = () => {
        if (!newPartner.name || !newPartner.contactPerson || !newPartner.contactEmail) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all partner details.' });
            return;
        }
        const partnerToAdd = { ...newPartner, id: uuidv4() };
        setPartners([...partners, partnerToAdd]);
        setNewPartner({ name: '', contactPerson: '', contactEmail: '' });
        toast({ title: 'Partner Added', description: `${partnerToAdd.name} has been added to your logistics network.` });
    };
    
    const handleRemovePartner = (partnerId: string) => {
        setPartners(partners.filter(p => p.id !== partnerId));
        toast({ variant: 'destructive', title: 'Partner Removed', description: 'The logistics partner has been removed.' });
    };

  return (
    <AppShell title="Logistics Hub">
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Logistics Partner Network</CardTitle>
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Partner</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New Logistics Partner</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Partner Company Name</Label><Input value={newPartner.name} onChange={(e) => setNewPartner(p => ({...p, name: e.target.value}))} placeholder="e.g., Delhivery" /></div>
                                    <div className="space-y-2"><Label>Contact Person</Label><Input value={newPartner.contactPerson} onChange={(e) => setNewPartner(p => ({...p, contactPerson: e.target.value}))} placeholder="e.g., Suresh Gupta" /></div>
                                    <div className="space-y-2"><Label>Contact Email</Label><Input type="email" value={newPartner.contactEmail} onChange={(e) => setNewPartner(p => ({...p, contactEmail: e.target.value}))} placeholder="e.g., suresh@delhivery.com" /></div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button onClick={handleAddPartner}>Save Partner</Button></DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </div>
                    </div>
                    <CardDescription>Manage your courier partners and view their performance at a glance.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Partner Name</TableHead><TableHead>Total Shipments</TableHead><TableHead>Delivered</TableHead><TableHead>Out for Delivery</TableHead><TableHead>NDR</TableHead><TableHead>RTO</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {partnerStats.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.contactEmail}</div></TableCell>
                                    <TableCell>{p.totalShipments}</TableCell>
                                    <TableCell className="text-green-600 font-medium">{p.delivered}</TableCell>
                                    <TableCell>{p.outForDelivery}</TableCell>
                                    <TableCell className="text-red-600">{p.ndr}</TableCell>
                                    <TableCell className="text-orange-600">{p.rto}</TableCell>
                                    <TableCell className="text-right"><Button variant="destructive" size="icon" onClick={() => handleRemovePartner(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Shipment Management</CardTitle>
                    <CardDescription>Assign paid orders to logistics partners for dispatch and monitor their status.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Address</TableHead><TableHead>Partner</TableHead><TableHead>Tracking No.</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                            <TableCell><Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline cursor-pointer">{order.orderId}</Link></TableCell>
                            <TableCell><div className="font-medium">{order.customerName}</div><div className="text-xs text-muted-foreground">{order.contactNo}</div></TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{order.productOrdered}</TableCell>
                            <TableCell className="text-xs max-w-[250px] truncate">{order.customerAddress}</TableCell>
                            <TableCell>
                                <Select value={order.courierCompanyName || ''} onValueChange={(value) => handleFieldChange(order.id, 'courierCompanyName', value)}>
                                    <SelectTrigger className="w-40"><SelectValue placeholder="Assign Partner" /></SelectTrigger>
                                    <SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell><Input placeholder="Enter Tracking No." className="w-40" value={order.trackingNumber || ''} onChange={(e) => handleFieldChange(order.id, 'trackingNumber', e.target.value)} /></TableCell>
                            <TableCell>
                                <Select value={order.deliveryStatus || 'pending'} onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'deliveryStatus', value)}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending Dispatch</SelectItem>
                                    <SelectItem value="dispatched">Dispatched</SelectItem>
                                    <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="failed">Delivery Failed (NDR)</SelectItem>
                                    <SelectItem value="rto">Return to Origin (RTO)</SelectItem>
                                </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-center"><Button variant="outline" size="icon" onClick={() => handleSave(order.id)}><Save className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </AppShell>
  );
}
