
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollection, saveDocument } from '@/services/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export type Collaborator = {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
    linkedTo: string; // ID of seller, vendor, or 'admin'
};

export default function CollaboratorsPage() {
    const { toast } = useToast();
    const [pendingCollaborators, setPendingCollaborators] = useState<Collaborator[]>([]);
    const [approvedCollaborators, setApprovedCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadCollaborators = async () => {
        setIsLoading(true);
        try {
            const allCollaborators = await getCollection<Collaborator>('collaborators');
            setPendingCollaborators(allCollaborators.filter(c => c.status === 'pending'));
            setApprovedCollaborators(allCollaborators.filter(c => c.status === 'approved' || c.status === 'active'));
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load collaborator data from Firestore." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCollaborators();
    }, [toast]);

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

    return (
        <AppShell title="All Collaborators">
            <Tabs defaultValue="requests">
                 <TabsList className="grid w-full grid-cols-2 max-w-lg">
                    <TabsTrigger value="requests">Signup Requests <Badge className="ml-2">{pendingCollaborators.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved">Approved Collaborators</TabsTrigger>
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
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Linked To</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvedCollaborators.length > 0 ? approvedCollaborators.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>{c.phone}</TableCell>
                                            <TableCell>{c.email}</TableCell>
                                            <TableCell>{c.linkedTo}</TableCell>
                                            <TableCell><Badge className="bg-green-100 text-green-800">{c.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">No collaborators have been approved yet.</TableCell>
                                        </TableRow>
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
