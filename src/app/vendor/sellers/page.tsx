
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { SellerUser } from '@/app/seller-accounts/page';
import { Badge } from '@/components/ui/badge';
import { sanitizePhoneNumber } from '@/lib/utils';

export default function MySellersPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [mySellers, setMySellers] = useState<SellerUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        try {
            const approvedSellersJSON = localStorage.getItem('approved_sellers');
            const approvedSellers: SellerUser[] = approvedSellersJSON ? JSON.parse(approvedSellersJSON) : [];
            // Filter sellers that belong to the current logged-in vendor
            const sellersForThisVendor = approvedSellers.filter(seller => seller.vendorId === user.uid);
            setMySellers(sellersForThisVendor);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load your sellers from local storage." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

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
        const message = `Hi ${seller.companyName}, this is a message from your vendor, ${user?.displayName}.`;
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <AppShell title="My Sellers">
            <Card>
                <CardHeader>
                    <CardTitle>My Seller Network</CardTitle>
                    <CardDescription>View and manage the sellers who are part of your network.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Email / Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mySellers.length > 0 ? mySellers.map(seller => (
                                    <TableRow key={seller.id}>
                                        <TableCell className="font-medium">{seller.companyName}</TableCell>
                                        <TableCell>
                                            <div>{seller.email}</div>
                                            <div className="text-xs text-muted-foreground">{seller.phone || 'No phone'}</div>
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
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No sellers have been approved for your network yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}

    