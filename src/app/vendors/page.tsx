
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, MessageSquare, Check, X, Send, Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCollection, saveDocument, createChat, getDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import type { SellerUser } from '@/app/seller-accounts/page';
import type { EditableOrder } from '@/types/order';


export type Vendor = {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    dropCount?: number;
    sellerCount?: number;
    totalSales?: number;
};

type UserPermissions = {
    id: string; // same as user.id
    productDropLimit?: number;
};


export default function VendorsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
    const [approvedVendors, setApprovedVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newVendor, setNewVendor] = useState({ name: '', contactPerson: '', phone: '', email: '' });
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);

    const loadVendors = async () => {
        setIsLoading(true);
        try {
            const [allVendors, productDrops, allSellers, allOrders] = await Promise.all([
                getCollection<Vendor>('vendors'),
                getCollection<ProductDrop>('product_drops'),
                getCollection<SellerUser>('seller_users'),
                getCollection<EditableOrder>('orders'),
            ]);

            const dropCounts = productDrops.reduce((acc, drop) => {
                acc[drop.vendorId] = (acc[drop.vendorId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const sellerCounts = allSellers.reduce((acc, seller) => {
                if (seller.vendorId) {
                    acc[seller.vendorId] = (acc[seller.vendorId] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const salesBySeller = allOrders.reduce((acc, order) => {
                if (order.sellerId && order.paymentStatus === 'Paid') {
                    acc[order.sellerId] = (acc[order.sellerId] || 0) + parseFloat(order.price);
                }
                return acc;
            }, {} as Record<string, number>);

            const salesByVendor = allSellers.reduce((acc, seller) => {
                if (seller.vendorId && salesBySeller[seller.id]) {
                    acc[seller.vendorId] = (acc[seller.vendorId] || 0) + salesBySeller[seller.id];
                }
                return acc;
            }, {} as Record<string, number>);


            const vendorsWithData = allVendors.map(vendor => ({
                ...vendor,
                dropCount: dropCounts[vendor.id] || 0,
                sellerCount: sellerCounts[vendor.id] || 0,
                totalSales: salesByVendor[vendor.id] || 0,
            }));

            setPendingVendors(vendorsWithData.filter(v => v.status === 'pending'));
            setApprovedVendors(vendorsWithData.filter(v => v.status === 'approved'));

        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading vendors" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadVendors();
    }, [toast]);

    const handleAddVendor = async () => {
        if (!newVendor.name || !newVendor.contactPerson || !newVendor.phone) {
            toast({ variant: 'destructive', title: "Details Required" });
            return;
        }

        const newVendorId = uuidv4();
        try {
            await saveDocument('vendors', { ...newVendor, status: 'approved' }, newVendorId);
            await loadVendors();
            toast({ title: "Vendor Added" });
            document.getElementById('close-add-vendor-dialog')?.click();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error Adding Vendor" });
        }
    };
    
    const handleChat = async (vendor: Vendor) => {
        try {
            const chatId = `admin_${vendor.id}`;
            const participantNames = { 'admin': 'Admin', [vendor.id]: vendor.name };
            await createChat(chatId, ['admin', vendor.id], participantNames);
            router.push('/chat-integration-info');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Chat error' });
        }
    };

    const openManageDialog = async (vendor: Vendor) => {
        setSelectedVendor(vendor);
        const perms = await getDocument<UserPermissions>('user_permissions', vendor.id);
        setPermissions(perms || { id: vendor.id, productDropLimit: 50 });
    };

    const handleSavePermissions = async () => {
        if (!permissions) return;
        try {
            await saveDocument('user_permissions', permissions, permissions.id);
            toast({ title: "Permissions Saved" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error" });
        }
    };


    return (
        <AppShell title="Vendors">
            <Tabs defaultValue="approved">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="requests" className="text-[10px] font-bold uppercase">Requests <Badge className="ml-1 h-4 min-w-4 p-0 text-[8px]">{pendingVendors.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved" className="text-[10px] font-bold uppercase">Supply Network</TabsTrigger>
                </TabsList>

                <TabsContent value="approved" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Active Vendors</CardTitle>
                             <Dialog>
                                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-1 h-3 w-3" /> New Vendor</Button></DialogTrigger>
                                <DialogContent>
                                     <DialogHeader><DialogTitle>Register Vendor</DialogTitle></DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="space-y-2"><Label>Vendor Name</Label><Input value={newVendor.name} onChange={(e) => setNewVendor(p => ({ ...p, name: e.target.value }))} /></div>
                                        <div className="space-y-2"><Label>Phone</Label><Input value={newVendor.phone} onChange={(e) => setNewVendor(p => ({ ...p, phone: e.target.value }))} /></div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddVendor}>Save</Button>
                                        <DialogClose asChild><Button variant="outline" id="close-add-vendor-dialog">Cancel</Button></DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                 <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                            ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Drops</TableHead>
                                        <TableHead>Sellers</TableHead>
                                        <TableHead>Sales</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvedVendors.map(vendor => (
                                        <TableRow key={vendor.id}>
                                            <TableCell className="font-black italic uppercase text-xs">{vendor.name}</TableCell>
                                            <TableCell className="text-xs font-bold">{vendor.dropCount || 0}</TableCell>
                                            <TableCell className="text-xs font-bold">{vendor.sellerCount || 0}</TableCell>
                                            <TableCell className="font-bold text-blue-600">₹{vendor.totalSales?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                 <Button size="sm" variant="outline" onClick={() => openManageDialog(vendor)}><Settings className="h-3 w-3" /></Button>
                                                 <Button size="sm" variant="secondary" onClick={() => handleChat(vendor)}><MessageSquare className="h-3 w-3" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}

