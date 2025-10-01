
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Check, X, MessageSquare, Factory } from "lucide-react";
import { sanitizePhoneNumber } from "@/lib/utils";


export type SellerUser = {
    id: string; // This will be the Firebase Auth UID
    companyName: string;
    email: string;
    phone?: string;
    status: 'pending' | 'approved' | 'rejected';
    vendorId?: string;
    vendorName?: string;
    role: 'seller';
};

export default function SellerAccountsPage() {
    const { toast } = useToast();
    const [sellerRequests, setSellerRequests] = useState<SellerUser[]>([]);
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);

     useEffect(() => {
        async function loadData() {
            if (!db) return;
            // Fetch users from Firestore instead of localStorage
            try {
                const usersCollection = collection(db, 'users');
                
                const pendingQuery = query(usersCollection, where('status', '==', 'pending'), where('role', '==', 'seller'));
                const pendingSnapshot = await getDocs(pendingQuery);
                const pending = pendingSnapshot.docs.map(doc => doc.data() as SellerUser);
                setSellerRequests(pending);

                const approvedQuery = query(usersCollection, where('status', '==', 'approved'), where('role', '==', 'seller'));
                const approvedSnapshot = await getDocs(approvedQuery);
                const approved = approvedSnapshot.docs.map(doc => doc.data() as SellerUser);
                setApprovedSellers(approved);

            } catch (error: any) {
                console.error("Failed to load seller accounts from Firestore:", error);
                toast({
                    variant: 'destructive',
                    title: 'Failed to Load Data',
                    description: 'Could not retrieve seller accounts from the database. This might be a Firestore rules issue.',
                });
            }
        }
        loadData();
    }, [toast]);

    const handleSellerRequest = async (sellerId: string, newStatus: 'approved' | 'rejected') => {
        const seller = sellerRequests.find(s => s.id === sellerId);
        if (!seller || !db) return;

        try {
            const docRef = doc(db, "users", seller.id);
            await updateDoc(docRef, { status: newStatus });
            
            // Optimistically update UI
            const updatedRequests = sellerRequests.filter(s => s.id !== sellerId);
            setSellerRequests(updatedRequests);
            
            if (newStatus === 'approved') {
                setApprovedSellers(prev => [...prev, { ...seller, status: 'approved' }]);
            }
            
            toast({
                title: `Seller Request ${newStatus}`,
                description: `The seller account for ${seller.companyName} has been ${newStatus}.`,
            });
        } catch (error: any) {
            console.error("Failed to handle seller request:", error);
             toast({
                variant: 'destructive',
                title: `Approval Failed`,
                description: `Could not update the document in Firestore. Error: ${error.message}`,
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
