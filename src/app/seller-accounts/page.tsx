
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Check, X, MessageSquare } from "lucide-react";
import { sanitizePhoneNumber } from "@/lib/utils";


export type SellerUser = {
    id: string; // This will be the Firebase Auth UID
    companyName: string;
    email: string;
    phone?: string;
    status: 'pending' | 'approved' | 'rejected';
};

export default function SellerAccountsPage() {
    const { toast } = useToast();
    const [sellerRequests, setSellerRequests] = useState<SellerUser[]>([]);
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);

     useEffect(() => {
        function loadData() {
            const localSellerRequestsJSON = localStorage.getItem('seller_requests');
            const localSellerRequests: SellerUser[] = localSellerRequestsJSON ? JSON.parse(localSellerRequestsJSON) : [];
            setSellerRequests(localSellerRequests);

            const approvedSellersJSON = localStorage.getItem('approved_sellers');
            const approvedSellersList: SellerUser[] = approvedSellersJSON ? JSON.parse(approvedSellersJSON) : [];
            setApprovedSellers(approvedSellersList);
        }
        loadData();
    }, []);

    const handleSellerRequest = (sellerId: string, newStatus: 'approved' | 'rejected') => {
        const seller = sellerRequests.find(s => s.id === sellerId);
        if (!seller) return;

        try {
            if (newStatus === 'approved') {
                const approvedSellersJSON = localStorage.getItem('approved_sellers');
                let currentApprovedSellers: SellerUser[] = approvedSellersJSON ? JSON.parse(approvedSellersJSON) : [];
                currentApprovedSellers.push({ ...seller, status: 'approved' });
                localStorage.setItem('approved_sellers', JSON.stringify(currentApprovedSellers));
                setApprovedSellers(currentApprovedSellers);
            }
            
            const updatedRequests = sellerRequests.filter(s => s.id !== sellerId);
            setSellerRequests(updatedRequests);
            localStorage.setItem('seller_requests', JSON.stringify(updatedRequests));

            toast({
                title: `Seller Request ${newStatus}`,
                description: `The seller account for ${seller.companyName} has been ${newStatus}.`,
            });
        } catch (error: any) {
            console.error("Failed to handle seller request:", error);
             toast({
                variant: 'destructive',
                title: `Approval Failed`,
                description: `Could not update local storage. Error: ${error.message}`,
            });
        }
    };

    const handleWhatsAppChat = (seller: SellerUser) => {
        if (!seller.phone) {
            toast({
                variant: 'destructive',
                title: 'Phone Number Missing',
                description: 'Cannot start chat because a phone number is not available for this seller.',
            });
            return;
        }
        const sanitizedPhone = sanitizePhoneNumber(seller.phone);
        const message = `Hi ${seller.companyName}, this is a message from SnazzPay admin.`;
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
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
                                        <TableHead>Email</TableHead>
                                        <TableHead>Firebase UID</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {sellerRequests.length > 0 ? sellerRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.companyName}</TableCell>
                                            <TableCell>{req.email}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.id}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleSellerRequest(req.id, 'approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleSellerRequest(req.id, 'rejected')}><X className="mr-2 h-4 w-4" />Reject</Button>
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
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {approvedSellers.length > 0 ? approvedSellers.map(seller => (
                                        <TableRow key={seller.id}>
                                            <TableCell className="font-medium">{seller.companyName}</TableCell>
                                            <TableCell>{seller.email}</TableCell>
                                            <TableCell><Badge className="bg-green-100 text-green-800">{seller.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                 <Button size="sm" variant="secondary" onClick={() => handleWhatsAppChat(seller)}>
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    WhatsApp Chat
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No approved sellers yet.</TableCell></TableRow>
                                   )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
