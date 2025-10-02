
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Check, X, MessageSquare, Factory, Sparkles, Send, Loader2 } from "lucide-react";
import { sanitizePhoneNumber } from "@/lib/utils";
import { getCollection, saveDocument, createChat, type ChatUser } from "@/services/firestore";
import type { SellerProduct } from "@/app/seller/ai-product-uploader/page";
import { useRouter } from "next/navigation";


export type SellerUser = {
    id: string;
    companyName: string;
    email: string;
    phone?: string;
    status: 'pending' | 'approved' | 'rejected';
    vendorId?: string;
    vendorName?: string;
    // Usage stats
    aiUploads?: number;
};

export default function SellerAccountsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [sellerRequests, setSellerRequests] = useState<SellerUser[]>([]);
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadSellers() {
            setIsLoading(true);
            try {
                const allSellers = await getCollection<SellerUser>('seller_users');
                const aiProducts = await getCollection<SellerProduct>('seller_products');

                const usageMap = aiProducts.reduce((acc, product) => {
                    acc[product.sellerId] = (acc[product.sellerId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const sellersWithUsage = allSellers.map(seller => ({
                    ...seller,
                    aiUploads: usageMap[seller.id] || 0,
                }));
                
                setSellerRequests(sellersWithUsage.filter(s => s.status === 'pending'));
                setApprovedSellers(sellersWithUsage.filter(s => s.status === 'approved'));

            } catch (error) {
                console.error("Error loading sellers:", error);
                toast({ variant: "destructive", title: "Failed to load seller data" });
            } finally {
                setIsLoading(false);
            }
        }
        loadSellers();
    }, [toast]);

    const handleSellerRequest = async (sellerId: string, isApproved: boolean) => {
        const seller = sellerRequests.find(s => s.id === sellerId);
        if (!seller) return;

        const newStatus = isApproved ? 'approved' : 'rejected';
        
        try {
            await saveDocument('seller_users', { ...seller, status: newStatus }, seller.id);

            const updatedRequests = sellerRequests.filter(s => s.id !== sellerId);
            setSellerRequests(updatedRequests);

            if (isApproved) {
                setApprovedSellers(prev => [...prev, { ...seller, status: 'approved' }]);
            }
            
            toast({
                title: `Seller Request ${isApproved ? 'Approved' : 'Rejected'}`,
                description: `The seller account for ${seller.companyName} has been updated.`,
            });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating seller status" });
        }
    };
    
     const handleChat = async (seller: SellerUser) => {
        try {
            const chatId = `admin_${seller.id}`;
            const participantNames = {
                'admin': 'Admin', // This should be dynamic in a real multi-admin system
                [seller.id]: seller.companyName
            };
            await createChat(chatId, ['admin', seller.id], participantNames);
            router.push('/chat-integration-info');
        } catch (error) {
            console.error("Error creating chat:", error);
            toast({ variant: 'destructive', title: 'Failed to start chat.' });
        }
    };

    return (
        <AppShell title="Seller Accounts">
            <Tabs defaultValue="requests">
                <TabsList className="grid w-full grid-cols-2 max-w-lg">
                    <TabsTrigger value="requests">Signup Requests <Badge className="ml-2">{sellerRequests.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved">Approved Sellers</TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Seller Signup Requests</CardTitle>
                            <CardDescription>Review and approve new sellers to join the SnazzPay platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Email / Phone</TableHead>
                                        <TableHead>Linked Vendor</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {sellerRequests.length > 0 ? sellerRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.companyName}</TableCell>
                                            <TableCell>
                                                <div>{req.email}</div>
                                                <div className="text-xs text-muted-foreground">{req.phone || 'No phone provided'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Factory className="h-4 w-4 text-muted-foreground" />
                                                    <span>{req.vendorName || 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleSellerRequest(req.id, true)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleSellerRequest(req.id, false)}><X className="mr-2 h-4 w-4" />Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No pending seller requests.</TableCell></TableRow>
                                   )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Approved Sellers</CardTitle>
                            <CardDescription>The list of sellers currently active on your platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
                            ) : (
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Email / Phone</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>AI Uploads</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {approvedSellers.length > 0 ? approvedSellers.map(seller => (
                                        <TableRow key={seller.id}>
                                            <TableCell className="font-medium">{seller.companyName}</TableCell>
                                            <TableCell>
                                                <div>{seller.email}</div>
                                                <div className="text-xs text-muted-foreground">{seller.phone || 'No phone provided'}</div>
                                            </TableCell>
                                            <TableCell>
                                                 <div className="text-sm text-muted-foreground">{seller.vendorName || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Sparkles className="h-4 w-4 text-muted-foreground"/> {seller.aiUploads || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge className="bg-green-100 text-green-800">{seller.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                 <Button size="sm" variant="secondary" onClick={() => handleChat(seller)}>
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    Chat
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No approved sellers yet.</TableCell></TableRow>
                                   )}
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
