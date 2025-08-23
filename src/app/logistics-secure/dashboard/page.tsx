
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck, CheckCircle, Copy, User, Phone, Home, Truck, Map, UserCheck, Users, Upload, Crown, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Agent = {
    id: string;
    name: string;
    phone: string;
    status: 'Active' | 'Inactive';
    cashOnHand: number;
    pickupsToday: number;
};

type Pickup = {
    id: string;
    customer: string;
    address: string;
    amount: number;
    status: 'Pending Assignment' | 'Assigned' | 'Cash Collected';
    aiVerification: 'Pending' | 'Verified';
    assignedTo?: string;
};

export default function LogisticsDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [partnerName, setPartnerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [fleet, setFleet] = useState<Agent[]>([]);
    const [pickups, setPickups] = useState<Pickup[]>([]);
    const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);

    useEffect(() => {
        const loggedInPartnerId = localStorage.getItem('loggedInLogisticsPartnerId');
        const loggedInPartnerName = localStorage.getItem('loggedInLogisticsPartnerName');

        if (!loggedInPartnerId || !loggedInPartnerName) {
            toast({ variant: 'destructive', title: "Access Denied", description: "You must be logged in to view this page." });
            router.push('/logistics-secure/login');
            return;
        }
        setPartnerName(loggedInPartnerName);
        
        // Load or initialize data from localStorage
        const storedFleet = localStorage.getItem(`logistics_fleet_${loggedInPartnerId}`);
        const storedPickups = localStorage.getItem(`logistics_pickups_${loggedInPartnerId}`);

        if (storedFleet) {
            setFleet(JSON.parse(storedFleet));
        } else {
            // Mock initial data for a new partner
            const initialFleet = [
                { id: `AGENT-${loggedInPartnerId}-01`, name: 'Rajesh Kumar', phone: '9876543210', status: 'Active', cashOnHand: 0, pickupsToday: 0 },
                { id: `AGENT-${loggedInPartnerId}-02`, name: 'Sunita Devi', phone: '9123456789', status: 'Active', cashOnHand: 0, pickupsToday: 0 },
            ];
            setFleet(initialFleet);
            localStorage.setItem(`logistics_fleet_${loggedInPartnerId}`, JSON.stringify(initialFleet));
        }

        if (storedPickups) {
            setPickups(JSON.parse(storedPickups));
        } else {
             const initialPickups = [
                { id: '#SNZ-PICKUP-001', customer: 'Amit Sharma', address: '123, Rose Villa, Mumbai', amount: 1500.00, status: 'Pending Assignment', aiVerification: 'Pending' },
                { id: '#SNZ-PICKUP-002', customer: 'Priya Mehta', address: '456, Orchid Heights, Pune', amount: 450.50, status: 'Pending Assignment', aiVerification: 'Pending' },
            ];
            setPickups(initialPickups);
            localStorage.setItem(`logistics_pickups_${loggedInPartnerId}`, JSON.stringify(initialPickups));
        }

        setLoading(false);
    }, [router, toast]);
    
    useEffect(() => {
        // Persist changes to localStorage
        const partnerId = localStorage.getItem('loggedInLogisticsPartnerId');
        if (partnerId && !loading) {
            localStorage.setItem(`logistics_fleet_${partnerId}`, JSON.stringify(fleet));
            localStorage.setItem(`logistics_pickups_${partnerId}`, JSON.stringify(pickups));
        }
    }, [fleet, pickups, loading]);

    const handleLogout = () => {
        localStorage.removeItem('loggedInLogisticsPartnerId');
        localStorage.removeItem('loggedInLogisticsPartnerName');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/logistics-secure/login');
    };

    const handleSettleCash = (agentId: string) => {
        setFleet(fleet.map(agent => 
            agent.id === agentId ? { ...agent, cashOnHand: 0 } : agent
        ));
        toast({ title: "Cash Settled", description: `Cash for agent ${agentId} has been marked as settled.` });
    };
    
    const handleAssignAgent = (pickupId: string, agentId: string) => {
        const agent = fleet.find(a => a.id === agentId);
        if (!agent) return;
        
        setPickups(pickups.map(p => p.id === pickupId ? {...p, status: 'Assigned', assignedTo: agent.name} : p));
        toast({ title: "Pickup Assigned", description: `Pickup ${pickupId} assigned to ${agent.name}.` });
    };

    const handleConfirmCashCollection = (pickupId: string) => {
        const pickup = pickups.find(p => p.id === pickupId);
        if (!pickup || !pickup.assignedTo) {
             toast({ variant: 'destructive', title: "Assignment Needed", description: "Please assign an agent before confirming collection." });
            return;
        }

        const agentName = pickup.assignedTo;
        setFleet(fleet.map(f => f.name === agentName ? {...f, cashOnHand: f.cashOnHand + pickup.amount, pickupsToday: f.pickupsToday + 1} : f));
        setPickups(pickups.map(p => p.id === pickupId ? {...p, status: 'Cash Collected'} : p));
        
        toast({ title: "Cash Collection Confirmed", description: `Status for ${pickupId} updated.` });
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Truck className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{partnerName}</h1>
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
                                                    <TableCell className="font-mono text-xs">{agent.id}</TableCell>
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
                                                    <TableCell><Badge variant="outline">{pickup.status === 'Assigned' ? `To: ${pickup.assignedTo}` : pickup.status}</Badge></TableCell>
                                                     <TableCell><Badge variant={pickup.aiVerification === 'Verified' ? 'default' : 'secondary'}>{pickup.aiVerification}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <Dialog onOpenChange={(open) => !open && setSelectedPickup(null)}>
                                                            <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setSelectedPickup(pickup)}>Manage</Button></DialogTrigger>
                                                            {selectedPickup && selectedPickup.id === pickup.id && (
                                                            <DialogContent>
                                                                <DialogHeader><DialogTitle>Manage Pickup: {selectedPickup.id}</DialogTitle></DialogHeader>
                                                                <div className="py-4 space-y-4">
                                                                    <p>Amount to Collect: <span className="font-bold">₹{selectedPickup.amount.toFixed(2)}</span> from {selectedPickup.customer}.</p>
                                                                    <div className="space-y-2">
                                                                        <Label>Assign to Agent</Label>
                                                                        <Select onValueChange={(agentId) => handleAssignAgent(selectedPickup.id, agentId)}>
                                                                            <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
                                                                            <SelectContent>{fleet.filter(a => a.status === 'Active').map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-2"><Label>Upload Proof of Pickup (Photo)</Label><Input type="file" /></div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <DialogClose asChild><Button variant="secondary" onClick={() => handleConfirmCashCollection(selectedPickup.id)} disabled={selectedPickup.status === 'Cash Collected'}>Confirm Cash Collected</Button></DialogClose>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                            )}
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
