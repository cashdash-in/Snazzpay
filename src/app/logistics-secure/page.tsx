
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Save, Loader2, Trash2, MoreVertical, Search, Check, X, ShieldQuestion, Eye } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder, OrderStatus } from '../orders/page';
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LogisticsPartnerData } from "./dashboard/page";

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
    const [partners, setPartners] = useState<LogisticsPartnerData[]>([]);
    const [partnerRequests, setPartnerRequests] = useState<LogisticsPartnerData[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAndSetData() {
            setLoading(true);
            
            // Load Partners & Requests from local storage
            const allPartnersJSON = localStorage.getItem('logisticsPartners');
            const allPartners: LogisticsPartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
            setPartners(allPartners.filter(p => p.status === 'approved'));
            setPartnerRequests(allPartners.filter(p => p.status === 'pending'));

            // Load Orders
            let combinedOrders: EditableOrder[] = [];
            try {
                const shopifyOrders = await getOrders();
                combinedOrders.push(...shopifyOrders.map(mapShopifyToEditable));
            } catch (error) {
                 console.error("Could not fetch Shopify orders", error);
            }

            try {
                const manualOrdersJSON = localStorage.getItem('manualOrders');
                const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
                combinedOrders.push(...manualOrders);
            } catch (error) {
                console.error("Error loading manual orders", error);
            }

            const unifiedOrders = combinedOrders.map(order => {
                 const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                 return { ...order, ...storedOverrides };
            }).filter(o => o.paymentStatus === 'Paid');

            setOrders(unifiedOrders);
            setLoading(false);
        }
        fetchAndSetData();
    }, [toast]);
    
    const partnerStats = useMemo(() => {
        return partners.map(partner => {
            const assignedOrders = orders.filter(o => o.courierCompanyName === partner.companyName);
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
    
    const handleUpdateRequest = (partnerId: string, newStatus: 'approved' | 'rejected') => {
        const allPartnersJSON = localStorage.getItem('logisticsPartners');
        let allPartners: LogisticsPartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
        
        allPartners = allPartners.map(p => p.id === partnerId ? { ...p, status: newStatus } : p);
        
        localStorage.setItem('logisticsPartners', JSON.stringify(allPartners));
        
        setPartners(allPartners.filter(p => p.status === 'approved'));
        setPartnerRequests(allPartners.filter(p => p.status === 'pending'));

        toast({
            title: `Request ${newStatus}`,
            description: `The partner request has been ${newStatus}.`,
        });
    };

    return (
        <AppShell title="Logistics Hub">
          <Tabs defaultValue="shipments">
            <TabsList className="grid w-full grid-cols-2 max-w-lg">
                <TabsTrigger value="shipments">Shipment Management</TabsTrigger>
                <TabsTrigger value="requests">Partner Network <Badge className="ml-2">{partnerRequests.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="shipments" className="mt-4">
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
                                        <SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.companyName}>{p.companyName}</SelectItem>)}</SelectContent>
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
            </TabsContent>
            <TabsContent value="requests" className="mt-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Partner Signup Requests</CardTitle>
                        <CardDescription>Review and approve new logistics partners who want to join your network.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Phone</TableHead><TableHead>Address</TableHead><TableHead>PAN</TableHead><TableHead>Aadhaar</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {partnerRequests.length > 0 ? partnerRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.companyName}</TableCell>
                                    <TableCell>{req.phone}</TableCell>
                                    <TableCell className="text-xs">{req.address}</TableCell>
                                    <TableCell className="font-mono text-xs">{req.pan}</TableCell>
                                    <TableCell className="font-mono text-xs">{req.aadhaar}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateRequest(req.id, 'approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req.id, 'rejected')}><X className="mr-2 h-4 w-4" />Reject</Button>
                                    </TableCell>
                                </TableRow>
                                )) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No pending requests.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Approved Logistics Partner Network</CardTitle>
                        <CardDescription>Manage your approved courier partners and view their performance.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Partner ID</TableHead><TableHead>Partner Name</TableHead><TableHead>Total Shipments</TableHead><TableHead>Delivered</TableHead><TableHead>Out for Delivery</TableHead><TableHead>NDR</TableHead><TableHead>RTO</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {partnerStats.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono text-xs">{p.id}</TableCell>
                                        <TableCell><div className="font-medium">{p.companyName}</div><div className="text-xs text-muted-foreground">{p.phone}</div></TableCell>
                                        <TableCell>{p.totalShipments}</TableCell>
                                        <TableCell className="text-green-600 font-medium">{p.delivered}</TableCell>
                                        <TableCell>{p.outForDelivery}</TableCell>
                                        <TableCell className="text-red-600">{p.ndr}</TableCell>
                                        <TableCell className="text-orange-600">{p.rto}</TableCell>
                                        <TableCell>
                                             <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>{p.companyName} - Details</DialogTitle>
                                                        <DialogDescription>Full KYC and contact information for this partner.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-2 text-sm">
                                                        <p><strong>Partner ID:</strong> <span className="font-mono">{p.id}</span></p>
                                                        <p><strong>Contact Phone:</strong> {p.phone}</p>
                                                        <p><strong>Email:</strong> {p.email}</p>
                                                        <p><strong>Address:</strong> {p.address}</p>
                                                        <p><strong>PAN:</strong> <span className="font-mono">{p.pan}</span></p>
                                                        <p><strong>Aadhaar:</strong> <span className="font-mono">{p.aadhaar}</span></p>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </AppShell>
    );
}
