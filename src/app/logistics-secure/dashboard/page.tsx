
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck, CheckCircle, Copy, User, Phone, Home, Truck, Map, UserCheck, Users, Upload, Crown } from "lucide-react";
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
    { id: '#SNZ-PICKUP-001', customer: 'Amit Sharma', address: '123, Rose Villa, Mumbai', amount: 1500.00, status: 'Pending Assignment', aiVerification: 'Pending' },
    { id: '#SNZ-PICKUP-002', customer: 'Priya Mehta', address: '456, Orchid Heights, Pune', amount: 450.50, status: 'Assigned to AGENT-02', aiVerification: 'Pending' },
    { id: '#SNZ-PICKUP-003', customer: 'Rina Patel', address: '789, Tulip Gardens, Delhi', amount: 800.00, status: 'Pending Assignment', aiVerification: 'Pending' },
    { id: '#SNZ-PICKUP-004', customer: 'Vikram Singh', address: '101, Sun City, Jaipur', amount: 2500.00, status: 'Cash Collected', aiVerification: 'Verified' },
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
    
    const handleConfirmCashCollection = (pickupId: string) => {
        setPickups(pickups.map(p => p.id === pickupId ? {...p, status: 'Cash Collected'} : p));
        const pickup = pickups.find(p => p.id === pickupId);
        const agent = fleet.find(a => a.id === 'AGENT-01'); // Mock assignment
        if (pickup && agent) {
            setFleet(fleet.map(f => f.id === agent.id ? {...f, cashOnHand: f.cashOnHand + pickup.amount, pickupsToday: f.pickupsToday + 1} : f));
        }
        toast({ title: "Cash Collection Confirmed", description: `Status for ${pickupId} updated.` });
    }

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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="fleet"><Users className="mr-2 h-4 w-4" /> My Fleet</TabsTrigger>
                            <TabsTrigger value="pickups"><Package className="mr-2 h-4 w-4" /> Cash Pickups</TabsTrigger>
                            <TabsTrigger value="performance"><Crown className="mr-2 h-4 w-4" /> Performance</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fleet">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Fleet Management & Live Cash Tracking</CardTitle>
                                    <CardDescription>Monitor your delivery agents and their real-time cash collections.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Agent ID</TableHead><TableHead>Name</TableHead><TableHead>Live Cash on Hand</TableHead><TableHead>Pickups Today</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {fleet.map(agent => (
                                                <TableRow key={agent.id}>
                                                    <TableCell className="font-mono">{agent.id}</TableCell>
                                                    <TableCell><div className="font-medium">{agent.name}</div><div className="text-xs text-muted-foreground">{agent.phone}</div></TableCell>
                                                    <TableCell className="font-semibold">₹{agent.cashOnHand.toFixed(2)}</TableCell>
                                                    <TableCell className="font-medium text-center">{agent.pickupsToday}</TableCell>
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
                                <CardHeader><CardTitle>Cash Pickup Assignments</CardTitle><CardDescription>Manage pending cash collections. AI verification adds a layer of trust.</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>AI Verification</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {pickups.map(pickup => (
                                                <TableRow key={pickup.id}>
                                                    <TableCell className="font-mono">{pickup.id}</TableCell>
                                                    <TableCell><div className="font-medium">{pickup.customer}</div><div className="text-xs text-muted-foreground">{pickup.address}</div></TableCell>
                                                    <TableCell>₹{pickup.amount.toFixed(2)}</TableCell>
                                                    <TableCell><Badge variant="outline">{pickup.status}</Badge></TableCell>
                                                     <TableCell><Badge variant={pickup.aiVerification === 'Verified' ? 'default' : 'secondary'}>{pickup.aiVerification}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button size="sm" variant="outline">Manage</Button></DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader><DialogTitle>Manage Pickup: {pickup.id}</DialogTitle></DialogHeader>
                                                                <div className="py-4 space-y-4">
                                                                    <p>Amount to Collect: <span className="font-bold">₹{pickup.amount.toFixed(2)}</span> from {pickup.customer}.</p>
                                                                    <div className="space-y-2"><Label>Assign to Agent</Label><Select><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger><SelectContent>{fleet.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
                                                                    <div className="space-y-2"><Label>Upload Proof of Pickup (Photo)</Label><Input type="file" /></div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <DialogClose asChild><Button variant="secondary" onClick={() => handleConfirmCashCollection(pickup.id)} disabled={pickup.status === 'Cash Collected'}>Confirm Cash Collected</Button></DialogClose>
                                                                    <DialogClose asChild><Button>Assign & Upload</Button></DialogClose>
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
                         <TabsContent value="performance">
                            <div className="grid md:grid-cols-2 gap-8">
                                <Card className="shadow-lg">
                                    <CardHeader><CardTitle>Pickup Assignment Map</CardTitle><CardDescription>Visualize pending pickups and optimize routes.</CardDescription></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                            <p className="text-muted-foreground">Map View of Pending Pickups</p>
                                        </div>
                                        <Button className="w-full">Generate Optimized Route for Agent</Button>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-lg">
                                    <CardHeader><CardTitle>Top Agent Leaderboard</CardTitle><CardDescription>Daily performance of your delivery agents.</CardDescription></CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Agent</TableHead><TableHead className="text-right">Pickups</TableHead><TableHead className="text-right">Cash Collected</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {[...fleet].sort((a,b) => b.pickupsToday - a.pickupsToday).map((agent, index) => (
                                                    <TableRow key={agent.id}>
                                                        <TableCell className="font-bold">{index + 1}</TableCell>
                                                        <TableCell>{agent.name}</TableCell>
                                                        <TableCell className="text-right font-medium">{agent.pickupsToday}</TableCell>
                                                        <TableCell className="text-right font-medium">₹{agent.cashOnHand.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                         </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
