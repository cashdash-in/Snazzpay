
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Sparkles, Send, Settings, Save } from "lucide-react";
import { getCollection, saveDocument, getDocument } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { Vendor } from "@/app/vendors/page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UsageStat = {
    id: string;
    name: string;
    totalValue: number;
    commission: number;
    aiUploads?: number;
    aiUploadLimit?: number;
    productDrops?: number;
    productDropLimit?: number;
};

export default function BillingPage() {
    const { toast } = useToast();
    const [sellerUsage, setSellerUsage] = useState<UsageStat[]>([]);
    const [vendorUsage, setVendorUsage] = useState<UsageStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadBillingData = async () => {
        setIsLoading(true);
        try {
            const [sellers, vendors, orders, permissions] = await Promise.all([
                getCollection<SellerUser>('seller_users'),
                getCollection<Vendor>('vendors'),
                getCollection<any>('orders'),
                getCollection<{ id: string; aiUploadLimit?: number, productDropLimit?: number }>('user_permissions'),
            ]);

            const permissionsMap = new Map(permissions.map(p => [p.id, p]));

            const approvedSellers = sellers.filter(s => s.status === 'approved');
            const approvedVendors = vendors.filter(v => v.status === 'approved');

            const sellerData = approvedSellers.map(seller => {
                const sellerOrders = orders.filter(o => o.sellerId === seller.id && o.paymentStatus === 'Paid');
                const totalValue = sellerOrders.reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
                const commission = totalValue * 0.025;
                const perms = permissionsMap.get(seller.id);

                return {
                    id: seller.id,
                    name: seller.companyName,
                    totalValue,
                    commission,
                    aiUploads: seller.aiUploads || 0,
                    aiUploadLimit: perms?.aiUploadLimit || 50,
                };
            });

             const vendorData = approvedVendors.map(vendor => {
                const vendorOrders = orders.filter(o => o.vendorId === vendor.id && o.paymentStatus === 'Paid');
                const totalValue = vendorOrders.reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
                const commission = totalValue * 0.025;
                const perms = permissionsMap.get(vendor.id);
                
                return {
                    id: vendor.id,
                    name: vendor.name,
                    totalValue,
                    commission,
                    productDrops: vendor.dropCount || 0,
                    productDropLimit: perms?.productDropLimit || 50,
                };
            });

            setSellerUsage(sellerData);
            setVendorUsage(vendorData);

        } catch (error) {
            console.error("Error loading billing data:", error);
            toast({ variant: "destructive", title: "Failed to load billing data" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBillingData();
    }, [toast]);

    const handleFieldChange = (id: string, field: keyof UsageStat, value: string, type: 'seller' | 'vendor') => {
        const listToUpdate = type === 'seller' ? sellerUsage : vendorUsage;
        const setList = type === 'seller' ? setSellerUsage : setVendorUsage;

        const updatedList = listToUpdate.map(item => {
            if (item.id === id) {
                return { ...item, [field]: parseFloat(value) || 0 };
            }
            return item;
        });
        setList(updatedList);
    };

    const handleSave = async (id: string, type: 'seller' | 'vendor') => {
        const listToUpdate = type === 'seller' ? sellerUsage : vendorUsage;
        const item = listToUpdate.find(i => i.id === id);
        if (!item) return;

        try {
            // This is a simplified save. In a real app you would save to a dedicated billing record.
            // For now we simulate by showing a toast.
            console.log(`Saving ${type} ${id}:`, { totalValue: item.totalValue, commission: item.commission });
            toast({ title: "Data Saved", description: `Billing info for ${item.name} has been updated.` });
        } catch (error) {
             toast({ variant: "destructive", title: "Failed to save" });
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
                            <CardTitle>Seller Billing & Usage</CardTitle>
                            <CardDescription>Track feature usage, transaction values, and commissions for all approved sellers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seller Name</TableHead>
                                        <TableHead>AI Uploads</TableHead>
                                        <TableHead>Total Value (INR)</TableHead>
                                        <TableHead>Platform Commission (2.5%)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {sellerUsage.map(seller => (
                                       <TableRow key={seller.id}>
                                            <TableCell>{seller.name}</TableCell>
                                            <TableCell><Sparkles className="inline h-4 w-4 mr-1"/>{seller.aiUploads} / {seller.aiUploadLimit}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={seller.totalValue} 
                                                    onChange={(e) => handleFieldChange(seller.id, 'totalValue', e.target.value, 'seller')}
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={seller.commission}
                                                    onChange={(e) => handleFieldChange(seller.id, 'commission', e.target.value, 'seller')} 
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => handleSave(seller.id, 'seller')}><Save className="mr-2 h-4 w-4" />Save</Button>
                                            </TableCell>
                                       </TableRow>
                                   ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="vendors" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendor Billing & Usage</CardTitle>
                            <CardDescription>Track feature usage, transaction values, and commissions for all approved vendors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor Name</TableHead>
                                        <TableHead>Product Drops</TableHead>
                                        <TableHead>Total Value (INR)</TableHead>
                                        <TableHead>Platform Commission (2.5%)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendorUsage.map(vendor => (
                                       <TableRow key={vendor.id}>
                                            <TableCell>{vendor.name}</TableCell>
                                            <TableCell><Send className="inline h-4 w-4 mr-1"/>{vendor.productDrops} / {vendor.productDropLimit}</TableCell>
                                             <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={vendor.totalValue} 
                                                    onChange={(e) => handleFieldChange(vendor.id, 'totalValue', e.target.value, 'vendor')}
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={vendor.commission}
                                                    onChange={(e) => handleFieldChange(vendor.id, 'commission', e.target.value, 'vendor')} 
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => handleSave(vendor.id, 'vendor')}><Save className="mr-2 h-4 w-4" />Save</Button>
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
