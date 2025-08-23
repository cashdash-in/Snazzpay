
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PackageSearch, PackageCheck, UserCog, Info, Package, RefreshCw, Truck, LogOut, PlusCircle, UserPlus, Bike, Car, DollarSign, Map, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type SecureOrder = {
    orderId: string;
    customer: string;
    address: string;
    amount: string;
    status: 'Pending Assignment' | 'Pickup Scheduled' | 'Cash Collected';
    assignedTo: string;
}

const initialOrders: SecureOrder[] = [
    { orderId: '#LS-2001', customer: 'Amit Singh', address: '12, MG Road, Bangalore', amount: '750.00', status: 'Pickup Scheduled', assignedTo: 'Delhivery' },
    { orderId: '#LS-2002', customer: 'Sunita Patil', address: '45, Jubilee Hills, Hyderabad', amount: '1500.00', status: 'Pending Assignment', assignedTo: 'Not Assigned' },
    { orderId: '#LS-1998', customer: 'Vijay Raj', address: '8, Anna Salai, Chennai', amount: '999.00', status: 'Cash Collected', assignedTo: 'Delhivery' },
    { orderId: '#LS-1995', customer: 'Meera Desai', address: '110, Sector 17, Chandigarh', amount: '2100.00', status: 'Cash Collected', assignedTo: 'BlueDart' },
];

type Agent = {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'Bike' | 'Van';
  cashOnHand: number;
  pickupsToday: number;
  status: 'Active' | 'On-Leave' | 'Inactive';
};

const initialAgents: Agent[] = [
    { id: 'AGENT-01', name: 'Rajesh Kumar', phone: '9876543210', vehicleType: 'Bike', cashOnHand: 750.00, pickupsToday: 1, status: 'Active' },
    { id: 'AGENT-02', name: 'Suresh Raina', phone: '9123456789', vehicleType: 'Bike', cashOnHand: 0, pickupsToday: 0, status: 'Active' },
    { id: 'AGENT-03', name: 'Anjali Mehta', phone: '9988776655', vehicleType: 'Van', cashOnHand: 2100.00, pickupsToday: 2, status: 'Inactive' },
];


export default function LogisticsSecurePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<SecureOrder[]>(initialOrders);
    const [agents, setAgents] = useState<Agent[]>(initialAgents);

    const handleConfirmCollection = (orderId: string) => {
        setOrders(prevOrders => prevOrders.map(order => 
            order.orderId === orderId ? { ...order, status: 'Cash Collected' } : order
        ));
        toast({
            title: "Cash Collection Confirmed!",
            description: `Order ${orderId} has been marked as 'Cash Collected'. The seller has been notified to dispatch the product.`,
        });
    };

    const handleLogout = () => {
        toast({ title: "Logged Out" });
        router.push('/logistics-secure/login');
    };

    const pendingPickups = orders.filter(o => o.status !== 'Cash Collected');
    const successfulCollections = orders.filter(o => o.status === 'Cash Collected');
    const activeAgents = agents.filter(a => a.status === 'Active');

    const leaderboard = [...agents].sort((a,b) => b.pickupsToday - a.pickupsToday);

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
             <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Logistics Dashboard</h1>
                        <p className="text-muted-foreground">Manage secure cash collections assigned to you.</p>
                    </div>
                     <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </header>

                <Tabs defaultValue="pending-pickups">
                    <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto">
                        <TabsTrigger value="pending-pickups">
                            <PackageSearch className="mr-2 h-4 w-4" /> Pending Pickups
                        </TabsTrigger>
                        <TabsTrigger value="collections">
                            <PackageCheck className="mr-2 h-4 w-4" /> Successful Collections
                        </TabsTrigger>
                        <TabsTrigger value="my-fleet">
                            <UserCog className="mr-2 h-4 w-4" /> My Fleet
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending-pickups" className="mt-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Pending Cash Pickups</CardTitle>
                                    <CardDescription>Orders waiting for your team to collect the cash payment from the customer.</CardDescription>
                                </div>
                                <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
                            </CardHeader>
                            <CardContent>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingPickups.map(order => (
                                            <TableRow key={order.orderId}>
                                                <TableCell className="font-medium">{order.orderId}</TableCell>
                                                <TableCell>{order.customer}</TableCell>
                                                <TableCell>{order.address}</TableCell>
                                                <TableCell>₹{order.amount}</TableCell>
                                                <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm">Manage</Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Confirm Cash Collection</DialogTitle>
                                                                <DialogDescription>
                                                                    Confirm that you have collected ₹{order.amount} in cash from {order.customer} for order {order.orderId}. This will notify the seller to dispatch the product.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter>
                                                                <DialogClose asChild>
                                                                     <Button variant="outline">Cancel</Button>
                                                                </DialogClose>
                                                                <DialogClose asChild>
                                                                    <Button onClick={() => handleConfirmCollection(order.orderId)}>Yes, Confirm Collection</Button>
                                                                </DialogClose>
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
                    <TabsContent value="collections" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Successful Collections</CardTitle>
                                <CardDescription>Orders where cash has been successfully collected. The seller has been notified to dispatch these items.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {successfulCollections.map(order => (
                                            <TableRow key={order.orderId}>
                                                <TableCell className="font-medium">{order.orderId}</TableCell>
                                                <TableCell>{order.customer}</TableCell>
                                                <TableCell>{order.address}</TableCell>
                                                <TableCell>₹{order.amount}</TableCell>
                                                <TableCell>
                                                    <Badge className='bg-green-100 text-green-800 hover:bg-green-100'>
                                                        <PackageCheck className="mr-1 h-3 w-3" />
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                               </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="my-fleet" className="mt-6">
                        <div className="grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                 <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Fleet Agents</CardTitle>
                                            <CardDescription>Manage your delivery agents and their cash balances.</CardDescription>
                                        </div>
                                         <Dialog>
                                            <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4"/>Add Agent</Button></DialogTrigger>
                                            <DialogContent><DialogHeader><DialogTitle>Add New Delivery Agent</DialogTitle></DialogHeader>
                                            {/* Add Agent Form would go here */}
                                            <p className="py-4">Agent creation form placeholder.</p>
                                            <DialogFooter><DialogClose asChild><Button>Save Agent</Button></DialogClose></DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Vehicle</TableHead><TableHead>Status</TableHead><TableHead>Cash on Hand</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {agents.map(agent => (
                                                    <TableRow key={agent.id}>
                                                        <TableCell><div className="font-medium">{agent.name}</div><div className="text-xs text-muted-foreground">{agent.phone}</div></TableCell>
                                                        <TableCell>{agent.vehicleType === 'Bike' ? <Bike className="h-5 w-5"/> : <Car className="h-5 w-5"/>}</TableCell>
                                                        <TableCell><Badge variant={agent.status === 'Active' ? 'default' : 'secondary'} className={agent.status === 'Active' ? 'bg-green-100 text-green-800' : ''}>{agent.status}</Badge></TableCell>
                                                        <TableCell className="font-mono">₹{agent.cashOnHand.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Dialog>
                                                                <DialogTrigger asChild><Button size="sm" variant="outline" disabled={agent.cashOnHand === 0}>Settle Cash</Button></DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader><DialogTitle>Settle Daily Cash</DialogTitle><DialogDescription>Confirm that you have received ₹{agent.cashOnHand.toFixed(2)} from {agent.name}. This will reset their cash-on-hand to zero for the next day.</DialogDescription></DialogHeader>
                                                                    <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><DialogClose asChild><Button>Confirm Settlement</Button></DialogClose></DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle>Pickup Assignment</CardTitle><CardDescription>Assign pending pickups to active agents.</CardDescription></CardHeader>
                                    <CardContent>
                                        <Image src="https://placehold.co/600x400.png" width={600} height={400} alt="Map of pickups" className="rounded-md" data-ai-hint="city map" />
                                        <div className="mt-4 space-y-2">
                                            <Label htmlFor="pickup-select">Select a Pickup</Label>
                                            <Select><SelectTrigger><SelectValue placeholder="Select pending order..."/></SelectTrigger><SelectContent>{pendingPickups.map(p=><SelectItem key={p.orderId} value={p.orderId}>{p.orderId} - {p.customer}</SelectItem>)}</SelectContent></Select>
                                            <Label htmlFor="agent-select">Assign to Agent</Label>
                                            <Select><SelectTrigger><SelectValue placeholder="Select an agent..."/></SelectTrigger><SelectContent>{activeAgents.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
                                            <Button className="w-full">Assign Pickup</Button>
                                            <Button variant="secondary" className="w-full">Generate Optimized Route</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                     <CardHeader><CardTitle>Top Agent Leaderboard</CardTitle><CardDescription>Today's top performing agents.</CardDescription></CardHeader>
                                     <CardContent>
                                        <div className="space-y-4">
                                            {leaderboard.map((agent, index) => (
                                                <div key={agent.id} className="flex items-center">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold mr-4">{index + 1}</div>
                                                    <div className="flex-1"><p className="font-medium">{agent.name}</p><p className="text-xs text-muted-foreground">{agent.pickupsToday} Pickups | ₹{agents.find(a => a.id === agent.id)?.cashOnHand.toFixed(2)} Collected</p></div>
                                                    {index === 0 && <Star className="h-5 w-5 text-yellow-400" />}
                                                </div>
                                            ))}
                                        </div>
                                     </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

    