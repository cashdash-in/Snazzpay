
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PackageSearch, PackageCheck, UserCog, Info, Package, RefreshCw, Truck, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


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


export default function LogisticsSecurePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<SecureOrder[]>(initialOrders);

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
                        <Card>
                            <CardHeader>
                                <CardTitle>Manage Your Fleet</CardTitle>
                                <CardDescription>View and manage your delivery agents. (Coming Soon)</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center text-muted-foreground py-16">
                                <Truck className="mx-auto h-12 w-12 mb-4" />
                                <p>This feature will allow you to add and manage your delivery agents,</p>
                                <p>assign pickups, and track their performance.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
