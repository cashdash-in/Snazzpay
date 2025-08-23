'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, Check, PackageSearch, PackageCheck, Send, MessageSquare } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const mockPartner = {
    name: 'Gupta General Store',
    balance: 7500.00,
    totalEarnings: 1250.00
};

const mockTransactions = [
    { id: 'SNC-A1B2', customerId: 'CUST-001', value: 500, date: '2024-05-24 10:30 AM' },
    { id: 'SNC-E5F6', customerId: 'CUST-002', value: 1200, date: '2024-05-24 02:15 PM' },
];

const mockParcels = [
    { id: '#SNZ-9876', customer: 'Priya S.', status: 'Waiting for Pickup' },
    { id: '#SNZ-9875', customer: 'Amit K.', status: 'Picked Up' },
];


export default function PartnerPayDashboardPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [partner] = useState(mockPartner);
    const [transactions, setTransactions] = useState(mockTransactions);
    const [parcels, setParcels] = useState(mockParcels);
    const [generatedCode, setGeneratedCode] = useState('');
    const [transactionValue, setTransactionValue] = useState('');

    const handleLogout = () => {
        // In a real app, you'd clear session/token
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/partner-pay/login');
    };

    const handleGenerateCode = () => {
        if (!transactionValue || parseFloat(transactionValue) <= 0) {
            toast({ variant: 'destructive', title: "Invalid Value", description: "Please enter a valid transaction amount." });
            return;
        }
        const code = `SNZ-${uuidv4().substring(0, 8).toUpperCase()}`;
        setGeneratedCode(code);
        toast({ title: "Code Generated", description: `New code for ₹${transactionValue} created.` });
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        toast({ title: "Copied!", description: "The code has been copied to your clipboard." });
    };
    
     const handleNotifyCustomer = (parcelId: string) => {
        toast({
            title: "Notification Sent!",
            description: `A WhatsApp & SMS has been sent to the customer for parcel ${parcelId}.`
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome, {partner.name}</h1>
                        <p className="text-muted-foreground">Your Partner Pay Dashboard.</p>
                    </div>
                     <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </header>
                
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <Card className="shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Snazzify Coin Balance</CardTitle>
                                <Wallet className="h-6 w-6 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">₹{partner.balance.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Your available digital credit.</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>Generate Payment Code</CardTitle>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tx-value">Cash Collected (₹)</Label>
                                    <Input id="tx-value" type="number" placeholder="e.g., 500" value={transactionValue} onChange={(e) => setTransactionValue(e.target.value)} />
                                </div>
                                {generatedCode && (
                                    <div className="p-4 bg-muted rounded-lg text-center space-y-2">
                                        <Label>Your One-Time Code</Label>
                                        <p className="text-2xl font-bold font-mono tracking-widest">{generatedCode}</p>
                                        <Button size="sm" variant="outline" onClick={handleCopyCode} className="w-full">
                                            <Clipboard className="mr-2 h-4 w-4" /> Copy Code
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={handleGenerateCode}>
                                    <QrCode className="mr-2 h-4 w-4" /> Generate Code
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                         <Tabs defaultValue="logistics" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="logistics"><Package className="mr-2 h-4 w-4" /> Logistics Hub</TabsTrigger>
                                <TabsTrigger value="transactions"><Wallet className="mr-2 h-4 w-4" /> Transactions</TabsTrigger>
                            </TabsList>
                            <TabsContent value="logistics">
                                 <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Parcel Management</CardTitle>
                                        <CardDescription>Manage incoming and outgoing parcels for customers.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Parcel ID</TableHead>
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parcels.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">{p.id}</TableCell>
                                                        <TableCell>{p.customer}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={p.status === 'Picked Up' ? 'default' : 'secondary'} className={p.status === 'Picked Up' ? 'bg-green-100 text-green-800' : ''}>
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {p.status === 'Waiting for Pickup' && (
                                                                <Button size="sm" onClick={() => handleNotifyCustomer(p.id)}>
                                                                    <MessageSquare className="mr-2 h-4 w-4" /> Notify Customer
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                             <TabsContent value="transactions">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Recent Transactions</CardTitle>
                                        <CardDescription>History of codes generated from your account.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code ID</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                 {transactions.map(tx => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="font-mono">{tx.id}</TableCell>
                                                        <TableCell>₹{tx.value}</TableCell>
                                                        <TableCell>{tx.date}</TableCell>
                                                    </TableRow>
                                                 ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
}
