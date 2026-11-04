
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Check, X, MessageSquare, Loader2, Settings } from "lucide-react";
import { getCollection, saveDocument, createChat, getDocument } from "@/services/firestore";
import { useRouter } from "next/navigation";
import type { EditableOrder } from "@/types/order";
import type { SellerUser, UserPermissions } from "@/types/user";
import type { SellerProduct } from "@/types/product";

export default function SellerAccountsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [sellerRequests, setSellerRequests] = useState<SellerUser[]>([]);
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSellers = async () => {
        setIsLoading(true);
        try {
            const allSellers = await getCollection<SellerUser>('seller_users');
            setSellerRequests(allSellers.filter(s => s.status === 'pending'));
            setApprovedSellers(allSellers.filter(s => s.status === 'approved'));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => { loadSellers(); }, []);

    return (
        <AppShell title="Seller Accounts">
            <Tabs defaultValue="approved">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="requests" className="text-[9px] font-black uppercase tracking-tighter px-1">Requests <Badge className="ml-1 h-4 min-w-4 p-0 text-[8px]">{sellerRequests.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved" className="text-[9px] font-black uppercase tracking-tighter px-1">Active Network</TabsTrigger>
                </TabsList>
                <TabsContent value="approved" className="mt-4">
                     <Card>
                        <CardContent className="pt-6">
                           <Table>
                                <TableHeader><TableRow><TableHead>Seller</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                <TableBody>
                                   {approvedSellers.map(seller => (
                                        <TableRow key={seller.id}>
                                            <TableCell><div className="font-black uppercase italic text-xs">{seller.companyName}</div></TableCell>
                                            <TableCell className="text-right"><Button size="sm" variant="outline"><Settings className="h-4 w-4" /></Button></TableCell>
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
