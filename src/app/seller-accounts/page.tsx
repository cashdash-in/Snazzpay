
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Check, X, MessageSquare, Factory } from "lucide-react";
import { sanitizePhoneNumber } from "@/lib/utils";


export type SellerUser = {
    id: string;
    companyName: string;
    email: string;
    phone?: string;
    status: 'pending' | 'approved' | 'rejected';
    vendorId?: string;
    vendorName?: string;
};

export default function SellerAccountsPage() {
    const { toast } = useToast();
    const [sellerRequests, setSellerRequests] = useState<SellerUser[]>([]);
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);

    useEffect(() => {
        const requests = JSON.parse(localStorage.getItem('seller_requests') || '[]');
        const approved = JSON.parse(localStorage.getItem('approved_sellers') || '[]');
        setSellerRequests(requests);
        setApprovedSellers(approved);
    }, []);

    const handleSellerRequest = (sellerId: string, isApproved: boolean) => {
        const seller = sellerRequests.find(s => s.id === sellerId);
        if (!seller) return;

        const updatedRequests = sellerRequests.filter(s => s.id !== sellerId);
        
        if (isApproved) {
            const newApprovedSeller = { ...seller, status: 'approved' as const };
            const updatedApproved = [...approvedSellers, newApprovedSeller];
            setApprovedSellers(updatedApproved);
            localStorage.setItem('approved_sellers', JSON.stringify(updatedApproved));
        }

        setSellerRequests(updatedRequests);
        localStorage.setItem('seller_requests', JSON.stringify(updatedRequests));

        toast({
            title: `Seller Request ${isApproved ? 'Approved' : 'Rejected'}`,
            description: `The seller account for ${seller.companyName} has been ${isApproved ? 'approved' : 'rejected'}.`,
        });
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
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Email / Phone</TableHead>
                                        <TableHead>Vendor</TableHead>
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
                                            <TableCell><Badge className="bg-green-100 text-green-800">{seller.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                 <Button size="sm" variant="secondary" onClick={() => handleWhatsAppChat(seller)} disabled={!seller.phone}>
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    WhatsApp Chat
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No approved sellers yet.</TableCell></TableRow>
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

    