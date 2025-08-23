
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck, CheckCircle, Copy, User, Phone, Home, Truck, Map, UserCheck } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';

const mockFleet = [
    { id: 'AGENT-01', name: 'Rajesh Kumar', phone: '9876543210', status: 'Active', cashOnHand: 1500.00, pickupsToday: 3 },
    { id: 'AGENT-02', name: 'Sunita Devi', phone: '9123456789', status: 'Active', cashOnHand: 450.50, pickupsToday: 1 },
    { id: 'AGENT-03', name: 'Anil Singh', phone: '9988776655', status: 'Inactive', cashOnHand: 0.00, pickupsToday: 0 },
];

const mockPickups = [
    { id: '#SNZ-PICKUP-001', customer: 'Amit Sharma', address: '123, Rose Villa, Mumbai', amount: 1500.00, status: 'Pending Assignment' },
    { id: '#SNZ-PICKUP-002', customer: 'Priya Mehta', address: '456, Orchid Heights, Pune', amount: 450.50, status: 'Assigned to AGENT-02' },
    { id: '#SNZ-PICKUP-003', customer: 'Rina Patel', address: '789, Tulip Gardens, Delhi', amount: 800.00, status: 'Pending Assignment' },
];

export default function LogisticsDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [fleet, setFleet] = useState(mockFleet);
    const [pickups, setPickups] = useState(mockPickups);

    const handleLogout = () => {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/logistics-secure/login');
    };

    const handleSettleCash = (agentId: string) => {
        setFleet(fleet.map(agent => 
            agent.id === agentId ? { ...agent, cashOnHand: 0 } : agent
        ));
        toast({ title: "Cash Settled", description: `Cash for agent ${agentId} has been marked as settled.` });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Truck className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Logistics Partner Dashboard</h1>
                            <p className="text-muted-foreground">Manage your fleet, cash collections, and pickups.</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </header>

                <main>
                    <Tabs defaultValue="fleet">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="fleet"><UserCheck className="mr-2 h-4 w-4" /> My Fleet</TabsTrigger>
                            <TabsTrigger value="pickups"><Package className="mr-2 h-4 w-4" /> Pending Pickups</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fleet">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Fleet Management & Live Cash Tracking</CardTitle>
                                    <CardDescription>Monitor your delivery agents and their real-time cash collections.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Agent ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Live Cash on Hand</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fleet.map(agent => (
                                                <TableRow key={agent.id}>
                                                    <TableCell className="font-mono">{agent.id}</TableCell>
                                                    <TableCell><div className="font-medium">{agent.name}</div><div className="text-xs text-muted-foreground">{agent.phone}</div></TableCell>
                                                    <TableCell className="font-semibold">₹{agent.cashOnHand.toFixed(2)}</TableCell>
                                                    <TableCell><Badge variant={agent.status === 'Active' ? 'default' : 'secondary'}>{agent.status}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <Button size="sm" onClick={() => handleSettleCash(agent.id)} disabled={agent.cashOnHand === 0}>Settle Daily Cash</Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="pickups">
                             <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Cash Pickup Assignments</CardTitle>
                                    <CardDescription>Assign and manage pending cash collections for your agents.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Order ID</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pickups.map(pickup => (
                                                <TableRow key={pickup.id}>
                                                    <TableCell className="font-mono">{pickup.id}</TableCell>
                                                    <TableCell><div className="font-medium">{pickup.customer}</div><div className="text-xs text-muted-foreground">{pickup.address}</div></TableCell>
                                                    <TableCell>₹{pickup.amount.toFixed(2)}</TableCell>
                                                    <TableCell><Badge variant="outline">{pickup.status}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="outline" disabled={pickup.status !== 'Pending Assignment'}>Assign Agent</Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader><DialogTitle>Assign Pickup for {pickup.id}</DialogTitle></DialogHeader>
                                                                <p>Select an agent to assign this pickup of ₹{pickup.amount.toFixed(2)}.</p>
                                                                {/* In a real app this would be a dropdown */}
                                                                <DialogFooter>
                                                                    <DialogClose asChild><Button>Assign</Button></DialogClose>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
