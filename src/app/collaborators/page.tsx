
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Percent, User, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SellerUser } from '@/app/seller-accounts/page';
import type { Vendor } from '@/app/vendors/page';

export type Collaborator = {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
    linkedTo: string; // ID of seller, vendor, or 'admin'
    linkedToName?: string;
};

export default function CollaboratorsPage() {
    const { toast } = useToast();
    const [pendingCollaborators, setPendingCollaborators] = useState<Collaborator[]>([]);
    const [approvedCollaborators, setApprovedCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [commissionRate, setCommissionRate] = useState<number>(5);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allCollaborators, allSellers, allVendors] = await Promise.all([
                getCollection<Collaborator>('collaborators'),
                getCollection<SellerUser>('seller_users'),
                getCollection<Vendor>('vendors')
            ]);
            
            const nameMap = new Map<string, string>();
            allSellers.forEach(s => nameMap.set(s.id, s.companyName));
            allVendors.forEach(v => nameMap.set(v.id, v.name));
            nameMap.set('admin', 'Snazzify Admin');

            const collaboratorsWithNames = allCollaborators.map(c => ({
                ...c,
                linkedToName: nameMap.get(c.linkedTo) || 'Unknown'
            }));

            setPendingCollaborators(collaboratorsWithNames.filter(c => c.status === 'pending'));
            setApprovedCollaborators(collaboratorsWithNames.filter(c => c.status === 'approved' || c.status === 'active'));
            
            const adminSettings = await getDocument<{commissionRate?: number}>('commission_settings', 'admin');
            if (adminSettings?.commissionRate) {
                setCommissionRate(adminSettings.commissionRate);
            }

        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load collaborator data from Firestore." });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [toast]);

    const handleCollaboratorRequest = async (collaboratorId: string, isApproved: boolean) => {
        const collaborator = pendingCollaborators.find(c => c.id === collaboratorId);
        if (!collaborator) return;

        const newStatus = isApproved ? 'approved' : 'rejected';
        
        try {
            await saveDocument('collaborators', { ...collaborator, status: newStatus }, collaborator.id);
            await loadData(); // Reload all data
            toast({
                title: `Collaborator Request ${isApproved ? 'Approved' : 'Rejected'}`,
                description: `The account for ${collaborator.name} has been updated.`,
            });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating collaborator status" });
        }
    };
    
    const handleSaveCommission = async () => {
        try {
            await saveDocument('commission_settings', { commissionRate }, 'admin');
            toast({ title: 'Commission Rate Saved', description: `Default commission for your collaborators is now ${commissionRate}%.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error Saving Commission' });
        }
    };

    return (
        <AppShell title="All Collaborators">
            <Tabs defaultValue="requests">
                 <TabsList className="grid w-full grid-cols-3 max-w-xl">
                    <TabsTrigger value="requests">Signup Requests <Badge className="ml-2">{pendingCollaborators.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved">Approved Collaborators</TabsTrigger>
                    <TabsTrigger value="settings">Commission Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Collaborator Signup Requests</CardTitle>
                            <CardDescription>Review and approve new collaborators who want to join your network.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone / Email</TableHead>
                                        <TableHead>Applying For</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow> :
                                   pendingCollaborators.length > 0 ? pendingCollaborators.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.name}</TableCell>
                                            <TableCell>
                                                <div>{req.phone}</div>
                                                <div className="text-xs text-muted-foreground">{req.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    {req.linkedTo === 'admin' ? <User className="h-3 w-3" /> : <Factory className="h-3 w-3" />}
                                                    {req.linkedToName}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleCollaboratorRequest(req.id, true)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleCollaboratorRequest(req.id, false)}><X className="mr-2 h-4 w-4" />Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No pending collaborator requests.</TableCell></TableRow>
                                   )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="approved" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Collaborator Network</CardTitle>
                            <CardDescription>View all guest collaborators across the entire platform.</CardDescription>
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone / Email</TableHead>
                                        <TableHead>Linked To</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvedCollaborators.length > 0 ? approvedCollaborators.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>
                                                <div>{c.phone}</div>
                                                <div className="text-xs text-muted-foreground">{c.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    {c.linkedTo === 'admin' ? <User className="h-3 w-3" /> : <Factory className="h-3 w-3" />}
                                                    {c.linkedToName}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge className="bg-green-100 text-green-800">{c.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">No collaborators have been approved yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                        </CardContent>
                    </Card>
                 </TabsContent>
                 <TabsContent value="settings" className="mt-4">
                     <Card className="max-w-xl">
                         <CardHeader>
                            <CardTitle>Collaborator Commission Settings</CardTitle>
                            <CardDescription>Set the default commission percentage for your direct collaborators. This can be overridden by individual vendors or sellers for their collaborators.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="commission-rate">Default Commission Rate (%)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="commission-rate"
                                        type="number"
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                                        className="w-32"
                                    />
                                    <Percent className="h-4 w-4 text-muted-foreground" />
                                </div>
                             </div>
                         </CardContent>
                         <CardFooter>
                            <Button onClick={handleSaveCommission}>Save Commission Rate</Button>
                         </CardFooter>
                     </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
