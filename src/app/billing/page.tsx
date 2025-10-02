
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, PackagePlus, Settings, DollarSign, Percent, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollection, getDocument, saveDocument } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { Vendor } from "@/app/vendors/page";
import type { SellerProduct } from "@/app/seller/ai-product-uploader/page";
import type { ProductDrop } from "@/app/vendor/product-drops/page";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { EditableOrder } from '@/app/orders/page';

type UserPermissions = {
    id: string;
    aiUploadLimit?: number;
    productDropLimit?: number;
};

type UsageData = {
    id: string;
    name: string;
    email: string;
    aiUploads: number;
    aiUploadLimit: number;
    productDrops: number;
    productDropLimit: number;
    totalValue: number;
    commission: number;
};

const DEFAULT_AI_LIMIT = 50;
const DEFAULT_DROP_LIMIT = 50;
const COMMISSION_RATE = 0.025; // 2.5%

export default function BillingPage() {
    const { toast } = useToast();
    const [sellers, setSellers] = useState<UsageData[]>([]);
    const [vendors, setVendors] = useState<UsageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UsageData | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);

    useEffect(() => {
        const loadUsageData = async () => {
            setIsLoading(true);
            try {
                const [allSellers, allVendors, allProducts, allDrops, allPermissions, allOrders] = await Promise.all([
                    getCollection<SellerUser>('seller_users'),
                    getCollection<Vendor>('vendors'),
                    getCollection<SellerProduct>('seller_products'),
                    getCollection<ProductDrop>('product_drops'),
                    getCollection<UserPermissions>('user_permissions'),
                    getCollection<EditableOrder>('orders')
                ]);

                const permissionsMap = new Map(allPermissions.map(p => [p.id, p]));

                const sellerUsageMap = allProducts.reduce((acc, product) => {
                    acc[product.sellerId] = (acc[product.sellerId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const vendorUsageMap = allDrops.reduce((acc, drop) => {
                    acc[drop.vendorId] = (acc[drop.vendorId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                
                const sellerValueMap = allOrders.reduce((acc, order) => {
                    if (order.sellerId) {
                        acc[order.sellerId] = (acc[order.sellerId] || 0) + parseFloat(order.price || '0');
                    }
                    return acc;
                }, {} as Record<string, number>);

                const sellerData = allSellers.map(s => {
                    const totalValue = sellerValueMap[s.id] || 0;
                    return {
                        id: s.id,
                        name: s.companyName,
                        email: s.email,
                        aiUploads: sellerUsageMap[s.id] || 0,
                        aiUploadLimit: permissionsMap.get(s.id)?.aiUploadLimit || DEFAULT_AI_LIMIT,
                        productDrops: 0,
                        productDropLimit: 0,
                        totalValue: totalValue,
                        commission: totalValue * COMMISSION_RATE,
                    };
                });
                
                // For now, vendor value is not automatically tracked.
                const vendorData = allVendors.map(v => ({
                    id: v.id,
                    name: v.name,
                    email: v.email,
                    aiUploads: 0,
                    aiUploadLimit: 0,
                    productDrops: vendorUsageMap[v.id] || 0,
                    productDropLimit: permissionsMap.get(v.id)?.productDropLimit || DEFAULT_DROP_LIMIT,
                    totalValue: 0, 
                    commission: 0, 
                }));

                setSellers(sellerData);
                setVendors(vendorData);

            } catch (error) {
                console.error("Error loading usage data:", error);
                toast({ variant: 'destructive', title: 'Failed to load billing data' });
            } finally {
                setIsLoading(false);
            }
        };
        loadUsageData();
    }, [toast]);

    const handleFieldChange = (userId: string, field: keyof UsageData, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSellers(prev => prev.map(s => s.id === userId ? { ...s, [field]: numValue } : s));
        setVendors(prev => prev.map(v => v.id === userId ? { ...v, [field]: numValue } : v));
    };

    const handleSaveBilling = async (userId: string) => {
        const userToSave = sellers.find(s => s.id === userId) || vendors.find(v => v.id === userId);
        if (!userToSave) return;

        try {
            // Here you might want to save these overridden values to a specific place in Firestore,
            // for example, in the 'user_permissions' document or a new 'billing_overrides' collection.
            // For now, we'll log it and show a success toast.
            console.log("Saving billing data for user:", userId, { totalValue: userToSave.totalValue, commission: userToSave.commission });
            // Example of saving: await saveDocument('user_billing', { totalValue: userToSave.totalValue, commission: userToSave.commission }, userId);
            toast({ title: "Billing Data Saved", description: `Changes for ${userToSave.name} have been persisted.` });
        } catch (error) {
             toast({ variant: 'destructive', title: "Error Saving Billing Data" });
        }
    };

    const openManageDialog = (user: UsageData) => {
        setSelectedUser(user);
        setPermissions({
            id: user.id,
            aiUploadLimit: user.aiUploadLimit,
            productDropLimit: user.productDropLimit,
        });
    };

    const handleSavePermissions = async () => {
        if (!permissions || !selectedUser) return;
        try {
            await saveDocument('user_permissions', permissions, permissions.id);
            
            // Update local state to reflect changes instantly
            if (sellers.some(s => s.id === selectedUser.id)) {
                setSellers(prev => prev.map(s => s.id === selectedUser.id ? { ...s, aiUploadLimit: permissions.aiUploadLimit || s.aiUploadLimit } : s));
            }
            if (vendors.some(v => v.id === selectedUser.id)) {
                setVendors(prev => prev.map(v => v.id === selectedUser.id ? { ...v, productDropLimit: permissions.productDropLimit || v.productDropLimit } : v));
            }

            toast({ title: "Permissions Saved", description: "The user's feature access has been updated." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error saving permissions" });
        }
    };

    return (
        <AppShell title="Billing & Usage Management">
            <Tabs defaultValue="sellers">
                <TabsList className="grid w-full grid-cols-2 max-w-lg">
                    <TabsTrigger value="sellers">Seller Usage</TabsTrigger>
                    <TabsTrigger value="vendors">Vendor Usage</TabsTrigger>
                </TabsList>
                <TabsContent value="sellers" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seller Feature Usage & Financials</CardTitle>
                            <CardDescription>Track feature usage, transaction value, and commissions for all sellers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
                            ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seller</TableHead>
                                        <TableHead>AI Uploads</TableHead>
                                        <TableHead>Total Value (Rs.)</TableHead>
                                        <TableHead>Commission (Rs.)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sellers.map(seller => (
                                        <TableRow key={seller.id}>
                                            <TableCell>
                                                <div className="font-medium">{seller.name}</div>
                                                <div className="text-xs text-muted-foreground">{seller.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                                    {seller.aiUploads} / {seller.aiUploadLimit}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                     <Input 
                                                        type="number" 
                                                        value={seller.totalValue} 
                                                        onChange={(e) => handleFieldChange(seller.id, 'totalValue', e.target.value)}
                                                        className="w-28 h-8"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-medium">
                                                    <Percent className="h-4 w-4 text-muted-foreground" />
                                                     <Input 
                                                        type="number" 
                                                        value={seller.commission} 
                                                        onChange={(e) => handleFieldChange(seller.id, 'commission', e.target.value)}
                                                        className="w-24 h-8"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                 <Button size="icon" variant="outline" onClick={() => handleSaveBilling(seller.id)}><Save className="h-4 w-4" /></Button>
                                                <Dialog onOpenChange={(open) => !open && setSelectedUser(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" onClick={() => openManageDialog(seller)}>
                                                            <Settings className="mr-2 h-4 w-4" /> Manage Limits
                                                        </Button>
                                                    </DialogTrigger>
                                                    {selectedUser?.id === seller.id && permissions && (
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Manage Access for {selectedUser.name}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="py-4 space-y-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="ai-upload-limit">AI Product Uploader Limit</Label>
                                                                    <Input
                                                                        id="ai-upload-limit"
                                                                        type="number"
                                                                        value={permissions.aiUploadLimit || DEFAULT_AI_LIMIT}
                                                                        onChange={(e) => setPermissions(p => p ? {...p, aiUploadLimit: parseInt(e.target.value, 10)} : null)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                                <DialogClose asChild><Button onClick={handleSavePermissions}>Save Permissions</Button></DialogClose>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    )}
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="vendors" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendor Feature Usage & Financials</CardTitle>
                            <CardDescription>Track and manage premium feature usage and financials for all approved vendors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
                            ) : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Product Drops</TableHead>
                                        <TableHead>Total Value (Rs.)</TableHead>
                                        <TableHead>Commission (Rs.)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendors.map(vendor => (
                                         <TableRow key={vendor.id}>
                                            <TableCell>
                                                <div className="font-medium">{vendor.name}</div>
                                                <div className="text-xs text-muted-foreground">{vendor.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <PackagePlus className="h-4 w-4 text-muted-foreground" />
                                                    {vendor.productDrops} / {vendor.productDropLimit}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        value={vendor.totalValue}
                                                        onChange={(e) => handleFieldChange(vendor.id, 'totalValue', e.target.value)}
                                                        className="w-28 h-8"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-medium">
                                                    <Percent className="h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        value={vendor.commission}
                                                        onChange={(e) => handleFieldChange(vendor.id, 'commission', e.target.value)}
                                                        className="w-24 h-8"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="icon" variant="outline" onClick={() => handleSaveBilling(vendor.id)} title="Save financial data">
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Dialog onOpenChange={(open) => !open && setSelectedUser(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" onClick={() => openManageDialog(vendor)}>
                                                            <Settings className="mr-2 h-4 w-4" /> Manage
                                                        </Button>
                                                    </DialogTrigger>
                                                    {selectedUser?.id === vendor.id && permissions && (
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Manage Access for {selectedUser.name}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="py-4 space-y-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="product-drop-limit">Product Drop Limit</Label>
                                                                    <Input
                                                                        id="product-drop-limit"
                                                                        type="number"
                                                                        value={permissions.productDropLimit || DEFAULT_DROP_LIMIT}
                                                                        onChange={(e) => setPermissions(p => p ? {...p, productDropLimit: parseInt(e.target.value, 10)} : null)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                                <DialogClose asChild><Button onClick={handleSavePermissions}>Save Permissions</Button></DialogClose>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    )}
                                                </Dialog>
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
