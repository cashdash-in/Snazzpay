
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { getCollection, getDocument } from '@/services/firestore';
import { format, parseISO } from 'date-fns';
import { getCookie } from 'cookies-next';
import type { EditableOrder } from '@/app/orders/page';
import type { Collaborator } from '@/app/collaborators/page';

type Commission = {
    id: string;
    orderId: string;
    orderDate: string;
    product: string;
    orderValue: number;
    commissionEarned: number;
    collaboratorId: string;
    collaboratorName: string;
    status: string;
};

export default function CollaboratorBillingPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            const role = getCookie('userRole');
            const allOrders = await getCollection<EditableOrder>('orders');
            const allCollaborators = await getCollection<Collaborator>('collaborators');
            const collaboratorMap = new Map(allCollaborators.map(c => [c.id, c]));
            
            let relevantOrders: EditableOrder[] = [];

            if (role === 'admin') {
                relevantOrders = allOrders;
            } else if (role === 'vendor') {
                // Find collaborators linked to this vendor
                const myCollaboratorIds = allCollaborators.filter(c => c.linkedTo === user.uid).map(c => c.id);
                relevantOrders = allOrders.filter(o => o.sellerId && myCollaboratorIds.includes(o.sellerId));
            } else if (role === 'seller') {
                 // Find collaborators linked to this seller
                const myCollaboratorIds = allCollaborators.filter(c => c.linkedTo === user.uid).map(c => c.id);
                relevantOrders = allOrders.filter(o => o.sellerId && myCollaboratorIds.includes(o.sellerId));
            }

            const successfulOrders = relevantOrders.filter(o => o.paymentStatus === 'Paid' && o.sellerId);
            
            const calculatedCommissions = successfulOrders.map(order => {
                const collaborator = collaboratorMap.get(order.sellerId!);
                return {
                    id: order.id,
                    orderId: order.orderId,
                    orderDate: format(parseISO(order.date), 'PP'),
                    product: order.productOrdered,
                    orderValue: parseFloat(order.price),
                    commissionEarned: parseFloat(order.price) * 0.05, // Assuming 5% commission
                    collaboratorId: order.sellerId!,
                    collaboratorName: collaborator?.name || 'Unknown',
                    status: order.paymentStatus
                };
            });

            setCommissions(calculatedCommissions);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error Loading Data', description: 'Could not load collaborator commission data.' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    return (
        <AppShell title="Collaborator Billing">
            <Card>
                <CardHeader>
                    <CardTitle>Collaborator Commission Ledger</CardTitle>
                    <CardDescription>
                        A detailed history of commissions earned by your Guest Collaborators from successful sales.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Collaborator</TableHead>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Order Date</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Order Value</TableHead>
                                    <TableHead className="text-right">Commission (5%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commissions.length > 0 ? commissions.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.collaboratorName}</TableCell>
                                        <TableCell>{c.orderId}</TableCell>
                                        <TableCell>{c.orderDate}</TableCell>
                                        <TableCell>{c.product}</TableCell>
                                        <TableCell className="text-right">₹{c.orderValue.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">+ ₹{c.commissionEarned.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">No commission data available for your collaborators yet.</TableCell>
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
