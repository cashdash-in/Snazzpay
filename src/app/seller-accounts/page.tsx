
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Check, X, MessageSquare, Factory, Sparkles, Send, Loader2, Settings, ShoppingCart } from "lucide-react";
import { getCollection, saveDocument, createChat, getDocument, type ChatUser } from "@/services/firestore";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { EditableOrder } from "@/types/order";
import type { SellerUser, UserPermissions } from "@/types/user";
import type { SellerProduct } from "@/types/product";

export default function SellerAccountsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [sellerRequests, setSellerRequests] = useState<SellerUser[]>([]);
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSeller, setSelectedSeller] = useState<SellerUser | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);

    const loadSellers = async () => {
        setIsLoading(true);
        try {
            const [allSellers, aiProducts, allOrders] = await Promise.all([
                getCollection<SellerUser>('seller_users'),
                getCollection<SellerProduct>('seller_products'),
                getCollection<EditableOrder>('orders'),
            ]);

            const usageMap = aiProducts.reduce((acc, product) => {
                acc[product.sellerId] = (acc[product.sellerId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const salesMap = allOrders.reduce((acc, order) => {
                if (order.sellerId && order.paymentStatus === 'Paid') {
                    if (!acc[order.sellerId]) {
                        acc[order.sellerId] = { totalSales: 0, orderCount: 0 };
                    }
                    acc[order.sellerId].totalSales += parseFloat(order.price);
                    acc[order.sellerId].orderCount += 1;
                }
                return acc;
            }, {} as Record<string, { totalSales: number, orderCount: number}>);

            const sellersWithData = allSellers.map(seller => ({
                ...seller,
                aiUploads: usageMap[seller.id] || 0,
                totalSales: salesMap[seller.id]?.totalSales || 0,
                orderCount: salesMap[seller.id]?.orderCount || 0,
            }));
            
            setSellerRequests(sellersWithData.filter(s => s.status === 'pending'));
            setApprovedSellers(sellersWithData.filter(s => s.status === 'approved'));

        } catch (error) {
            console.error("Error loading sellers:", error);
            toast({ variant: "destructive", title: "Failed to load seller data" });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadSellers();
    }, [toast]);

    const handleSellerRequest = async (sellerId: string, isApproved: boolean) => {
        const seller = sellerRequests.find(s => s.id === sellerId);
        if (!seller) return;

        const newStatus = isApproved ? 'approved' : 'rejected';
        
        try {
            await saveDocument('seller_users', { ...seller, status: newStatus }, seller.id);
            await loadSellers();
            
            toast({
                title: `Seller Request ${isApproved ? 'Approved' : 'Rejected'}`,
                description: `Account updated.`,
            });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating seller status" });
        }
    };
    
     const handleChat = async (seller: SellerUser) => {
        try {
            const chatId = `admin_${seller.id}`;
            const participantNames = {
                'admin': 'Admin',
                [seller.id]: seller.companyName
            };
            await createChat(chatId, ['admin', seller.id], participantNames);
            router.push('/chat-integration-info');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to start chat.' });
        }
    };

    const openManageDialog = async (seller: SellerUser) => {
        setSelectedSeller(seller);
        const perms = await getDocument<UserPermissions>('user_permissions', seller.id);
        setPermissions(perms || { id: seller.id, aiUploadLimit: 50 });
    };

    const handleSavePermissions = async () => {
        if (!permissions) return;
        try {
            await saveDocument('user_permissions', permissions, permissions.id);
            toast({ title: "Permissions Saved" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error saving permissions" });
        }
    };


    return (
        <AppShell title="Seller Accounts">
            <Tabs defaultValue="approved">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="requests" className="text-[10px] font-bold uppercase">Requests <Badge className="ml-1 h-4 min-w-4 p-0 text-[8px]">{sellerRequests.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved" className="text-[10px] font-bold uppercase">Active Network</TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Signup Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {sellerRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-bold uppercase italic text-xs">{req.companyName}</TableCell>
                                            <TableCell className="text-xs">{req.vendorName || 'N/A'}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleSellerRequest(req.id, true)}><Check className="h-4 w-4" /></Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleSellerRequest(req.id, false)}><X className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                   ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                     <Card>
                        <CardContent className="pt-6">
                            {isLoading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                            ) : (
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seller</TableHead>
                                        <TableHead>AI Usage</TableHead>
                                        <TableHead>Revenue</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {approvedSellers.map(seller => (
                                        <TableRow key={seller.id}>
                                            <TableCell>
                                                <div className="font-black uppercase italic text-xs">{seller.companyName}</div>
                                                <div className="text-[9px] text-muted-foreground uppercase">{seller.vendorName}</div>
                                            </TableCell>
                                            <TableCell className="text-xs font-bold">{seller.aiUploads || 0} Snaps</TableCell>
                                            <TableCell className="font-black text-blue-600">₹{seller.totalSales?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                 <Button size="sm" variant="outline" onClick={() => openManageDialog(seller)}><Settings className="h-4 w-4" /></Button>
                                                 <Button size="sm" variant="secondary" onClick={() => handleChat(seller)}><MessageSquare className="h-4 w-4" /></Button>
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

