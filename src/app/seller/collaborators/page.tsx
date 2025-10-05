
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import type { Collaborator } from '@/app/collaborators/page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SellerCollaboratorsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [pendingCollaborators, setPendingCollaborators] = useState<Collaborator[]>([]);
    const [approvedCollaborators, setApprovedCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [commissionRate, setCommissionRate] = useState<number>(5);

    const loadCollaborators = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const allCollaborators = await getCollection<Collaborator>('collaborators');
            const myCollaborators = allCollaborators.filter(c => c.linkedTo === user.uid);
            
            setPendingCollaborators(myCollaborators.filter(c => c.status === 'pending'));
            setApprovedCollaborators(myCollaborators.filter(c => c.status === 'approved' || c.status === 'active'));
            
            const sellerSettings = await getDocument<{commissionRate?: number}>('commission_settings', user.uid);
            if (sellerSettings?.commissionRate) {
                setCommissionRate(sellerSettings.commissionRate);
            }

        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load collaborator data from Firestore." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCollaborators();
    }, [user, toast]);

    const handleCollaboratorRequest = async (collaboratorId: string, isApproved: boolean) => {
        const collaborator = pendingCollaborators.find(c => c.id === collaboratorId);
        if (!collaborator) return;

        const newStatus = isApproved ? 'approved' : 'rejected';
        
        try {
            await saveDocument('collaborators', { ...collaborator, status: newStatus }, collaborator.id);
            await loadCollaborators();
            
            toast({
                title: `Collaborator Request ${isApproved ? 'Approved' : 'Rejected'}`,
                description: `The account for ${collaborator.name} has been updated.`,
            });
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating collaborator status" });
        }
    };
    
    const handleSaveCommission = async () => {
        if (!user) return;
        try {
            await saveDocument('commission_settings', { commissionRate }, user.uid);
            toast({ title: 'Commission Rate Saved', description: `Default commission for your collaborators is now ${commissionRate}%.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error Saving Commission' });
        }
    };

    return (
        <AppShell title="My Collaborators">
            <Tabs defaultValue="requests">
                 <TabsList className="grid w-full grid-cols-3 max-w-xl">
                    <TabsTrigger value="requests">Signup Requests <Badge className="ml-2">{pendingCollaborators.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved">My Collaborators</TabsTrigger>
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
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow> :
                                   pendingCollaborators.length > 0 ? pendingCollaborators.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.name}</TableCell>
                                            <TableCell>{req.phone}</TableCell>
                                            <TableCell>{req.email}</TableCell>
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
                            <CardTitle>My Collaborator Network</CardTitle>
                            <CardDescription>View all guest collaborators linked to you.</CardDescription>
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
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvedCollaborators.length > 0 ? approvedCollaborators.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>{c.phone}</TableCell>
                                            <TableCell>{c.email}</TableCell>
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
                            <CardDescription>Set the default commission percentage for your collaborators.</CardDescription>
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
