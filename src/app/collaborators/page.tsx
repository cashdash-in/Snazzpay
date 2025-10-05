
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Collaborator = {
    id: string;
    name: string;
    phone: string;
    email: string;
    status: 'active' | 'inactive';
    linkedTo: string; // ID of seller, vendor, or 'admin'
};

export default function CollaboratorsPage() {
    const { toast } = useToast();
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        // In a real app, this would be a Firestore call.
        // For the prototype, we simulate fetching from multiple local storage keys.
        try {
            let allCollaborators: Collaborator[] = [];
            
            // This is a simplified simulation. A real implementation would query
            // a single 'collaborators' collection in Firestore.
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('resellers_')) { // Using 'resellers_' as it was the previous name
                    const storedData = localStorage.getItem(key);
                    if (storedData) {
                        const ownerId = key.replace('resellers_', '');
                        const ownerName = 'User ' + ownerId.substring(0,4); // Placeholder
                        const parsedData: any[] = JSON.parse(storedData);
                        const mappedData = parsedData.map(d => ({...d, linkedTo: ownerName}));
                        allCollaborators = allCollaborators.concat(mappedData);
                    }
                }
            }
             // Add some dummy admin collaborators
            allCollaborators.push({id: 'c1', name: 'Ravi Sharma', phone: '1234567890', email: 'ravi@email.com', status: 'active', linkedTo: 'Admin'});

            setCollaborators(allCollaborators);

        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load collaborator data." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    return (
        <AppShell title="All Collaborators">
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
                            {collaborators.length > 0 ? collaborators.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{c.phone}</TableCell>
                                    <TableCell>{c.email}</TableCell>
                                    <TableCell>{c.linkedTo}</TableCell>
                                    <TableCell>{c.status}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No collaborators have signed up yet.</TableCell>
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
