
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard, ShoppingCart, ShieldAlert, LogOut, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// Mock data for demonstration
const mockUser = {
    name: 'Ankit Sharma',
    mobile: '98XXXXXX01',
};

const mockWallet = {
    balance: 500.00,
};

const mockOrders = [
    { id: '#1005', date: '2024-05-20', item: 'Premium Leather Wallet', amount: 500.00, status: 'Authorized' },
    { id: '#1002', date: '2024-05-15', item: 'Stylish Sunglasses', amount: 1250.00, status: 'Delivered' },
];

export default function CustomerDashboardPage() {
    const { toast } = useToast();

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome, {mockUser.name}</h1>
                        <p className="text-muted-foreground">Here's an overview of your Snazzify account.</p>
                    </div>
                     <Link href="/secure-cod" passHref>
                        <Button variant="outline">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </Link>
                </header>
                
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-8">
                        <Card className="shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Snazzify Wallet</CardTitle>
                                <Wallet className="h-6 w-6 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Current Balance</p>
                                <p className="text-4xl font-bold">₹{mockWallet.balance.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Includes ₹1 verification + ₹499 for Order #1005</p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full">
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Add Funds (Coming Soon)
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="orders" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="orders">
                                    <ShoppingCart className="mr-2 h-4 w-4" /> My Orders
                                </TabsTrigger>
                                <TabsTrigger value="cancellations">
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Cancellations
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="orders">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Recent Orders</CardTitle>
                                        <CardDescription>Here are your most recent orders with us.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Order ID</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {mockOrders.map((order) => (
                                                    <TableRow key={order.id}>
                                                        <TableCell className="font-medium">{order.id}</TableCell>
                                                        <TableCell>{order.date}</TableCell>
                                                        <TableCell>{order.item}</TableCell>
                                                        <TableCell>₹{order.amount.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'} className={order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                                                {order.status === 'Delivered' ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
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
                             <TabsContent value="cancellations">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Request a Cancellation</CardTitle>
                                        <CardDescription>If you need to cancel an order, please input the unique ID provided by our support team.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         <div className="space-y-2">
                                            <Label htmlFor="order-id">Order ID to Cancel</Label>
                                            <Input id="order-id" placeholder="e.g., #1005" />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="cancellation-id">Unique Cancellation ID</Label>
                                            <Input id="cancellation-id" placeholder="Enter the ID from our email/SMS" />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="destructive">Submit Cancellation Request</Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
}
