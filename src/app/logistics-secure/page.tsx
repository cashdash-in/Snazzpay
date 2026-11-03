
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
import type { EditableOrder, OrderStatus } from '@/types/order';
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
            const allPartnersJSON = localStorage.getItem('logisticsPartners');
            const allPartners: LogisticsPartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
            setPartners(allPartners.filter(p => p.status === 'approved'));
            setPartnerRequests(allPartners.filter(p => p.status === 'pending'));

            try {
                const shopifyOrders = await getOrders();
                setOrders(shopifyOrders.map(mapShopifyToEditable).filter(o => o.paymentStatus === 'Paid'));
            } catch (error) {
                 console.error("Orders load error", error);
            }
            setLoading(false);
        }
        fetchAndSetData();
    }, [toast]);
    
    return (
        <AppShell title="Logistics Hub">
          <Tabs defaultValue="shipments">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="shipments" className="text-[10px] font-bold uppercase">Dispatch Center</TabsTrigger>
                <TabsTrigger value="requests" className="text-[10px] font-bold uppercase">Partners <Badge className="ml-1 h-4 min-w-4 p-0 text-[8px]">{partnerRequests.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="shipments" className="mt-4">
                 <Card>
                    <CardHeader><CardTitle>Shipment Management</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                        ) : (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                <TableCell className="font-bold text-primary">{order.orderId}</TableCell>
                                <TableCell className="text-xs">{order.customerName}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[9px] uppercase">{order.deliveryStatus || 'Pending'}</Badge></TableCell>
                                <TableCell className="text-right"><Button variant="outline" size="sm"><Save className="h-3 w-3" /></Button></TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </AppShell>
    );
}

