
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Save, Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export type Collaborator = {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: 'active' | 'inactive';
};

export default function SellerCollaboratorsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newCollaborator, setNewCollaborator] = useState({ name: '', phone: '', email: '' });

    const storageKey = user ? `resellers_${user.uid}` : ''; // Using old name for data continuity

    useEffect(() => {
        if (!storageKey) {
            setIsLoading(false);
            return;
        }
        try {
            const storedData = localStorage.getItem(storageKey);
            if (storedData) {
                setCollaborators(JSON.parse(storedData));
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load collaborators from local storage." });
        } finally {
            setIsLoading(false);
        }
    }, [storageKey, toast]);

    useEffect(() => {
        if (!isLoading && storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(collaborators));
        }
    }, [collaborators, isLoading, storageKey]);

    const handleAddCollaborator = () => {
        if (!newCollaborator.name || !newCollaborator.phone) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide a name and phone number." });
            return;
        }

        const collaboratorToAdd: Collaborator = {
            id: uuidv4(),
            ...newCollaborator,
            status: 'active'
        };

        setCollaborators(prev => [...prev, collaboratorToAdd]);
        setNewCollaborator({ name: '', phone: '', email: '' });
        toast({ title: "Collaborator Added", description: `${collaboratorToAdd.name} is now in your network.` });
        document.getElementById('close-add-collaborator-dialog')?.click();
    };

    const handleRemoveCollaborator = (id: string) => {
        setCollaborators(prev => prev.filter(r => r.id !== id));
        toast({ variant: 'destructive', title: "Collaborator Removed" });
    };

    return (
        <AppShell title="My Collaborators">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Collaborator Network</CardTitle>
                        <CardDescription>Manage your team of guest collaborators who sell products on your behalf.</CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Collaborator
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader><DialogTitle>Add New Collaborator</DialogTitle></DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2"><Label htmlFor="collaborator-name">Collaborator Name</Label><Input id="collaborator-name" value={newCollaborator.name} onChange={(e) => setNewCollaborator(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" /></div>
                                <div className="space-y-2"><Label htmlFor="collaborator-phone">Phone Number</Label><Input id="collaborator-phone" value={newCollaborator.phone} onChange={(e) => setNewCollaborator(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" /></div>
                                <div className="space-y-2"><Label htmlFor="collaborator-email">Email (Optional)</Label><Input id="collaborator-email" type="email" value={newCollaborator.email} onChange={(e) => setNewCollaborator(p => ({ ...p, email: e.target.value }))} placeholder="collaborator@example.com" /></div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddCollaborator}>Save Collaborator</Button>
                                <DialogClose asChild><Button variant="outline" id="close-add-collaborator-dialog">Cancel</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {collaborators.length > 0 ? collaborators.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{c.phone}</TableCell>
                                    <TableCell>{c.email}</TableCell>
                                    <TableCell>{c.status}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleRemoveCollaborator(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">You haven't added any collaborators yet.</TableCell>
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
