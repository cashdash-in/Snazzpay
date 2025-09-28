'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export type Reseller = {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: 'active' | 'inactive';
};

export default function ResellersPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [resellers, setResellers] = useState<Reseller[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newReseller, setNewReseller] = useState({ name: '', phone: '', email: '' });

    const storageKey = user ? `resellers_${user.uid}` : '';

    useEffect(() => {
        if (!storageKey) {
            setIsLoading(false);
            return;
        }
        try {
            const storedResellers = localStorage.getItem(storageKey);
            if (storedResellers) {
                setResellers(JSON.parse(storedResellers));
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load resellers from local storage." });
        } finally {
            setIsLoading(false);
        }
    }, [storageKey, toast]);

    useEffect(() => {
        if (!isLoading && storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(resellers));
        }
    }, [resellers, isLoading, storageKey]);

    const handleAddReseller = () => {
        if (!newReseller.name || !newReseller.phone) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide a name and phone number for the reseller." });
            return;
        }

        const resellerToAdd: Reseller = {
            id: uuidv4(),
            ...newReseller,
            status: 'active'
        };

        setResellers(prev => [...prev, resellerToAdd]);
        setNewReseller({ name: '', phone: '', email: '' });
        toast({ title: "Reseller Added", description: `${resellerToAdd.name} is now in your network.` });
        document.getElementById('close-add-reseller-dialog')?.click();
    };

    const handleRemoveReseller = (id: string) => {
        setResellers(prev => prev.filter(r => r.id !== id));
        toast({ variant: 'destructive', title: "Reseller Removed" });
    };

    return (
        <AppShell title="My Resellers">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Reseller Network</CardTitle>
                        <CardDescription>Manage your team of resellers who sell products on your behalf.</CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Reseller
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader><DialogTitle>Add New Reseller</DialogTitle></DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2"><Label htmlFor="reseller-name">Reseller Name</Label><Input id="reseller-name" value={newReseller.name} onChange={(e) => setNewReseller(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" /></div>
                                <div className="space-y-2"><Label htmlFor="reseller-phone">Phone Number</Label><Input id="reseller-phone" value={newReseller.phone} onChange={(e) => setNewReseller(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" /></div>
                                <div className="space-y-2"><Label htmlFor="reseller-email">Email (Optional)</Label><Input id="reseller-email" type="email" value={newReseller.email} onChange={(e) => setNewReseller(p => ({ ...p, email: e.target.value }))} placeholder="reseller@example.com" /></div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddReseller}>Save Reseller</Button>
                                <DialogClose asChild><Button variant="outline" id="close-add-reseller-dialog">Cancel</Button></DialogClose>
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
                            {resellers.length > 0 ? resellers.map(reseller => (
                                <TableRow key={reseller.id}>
                                    <TableCell className="font-medium">{reseller.name}</TableCell>
                                    <TableCell>{reseller.phone}</TableCell>
                                    <TableCell>{reseller.email}</TableCell>
                                    <TableCell>{reseller.status}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleRemoveReseller(reseller.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">You haven't added any resellers yet.</TableCell>
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
