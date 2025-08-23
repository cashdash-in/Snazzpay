
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, Handshake, Info, PlusCircle, Printer, Download, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";


// Mock Data - Replace with real data later
const mockOrders = [
    { id: '#SC-1001', customer: 'Ravi Kumar', partner: 'Gupta General Store', coinCode: 'SNC-A1B2-C3D4', amount: '499.00', status: 'Paid' },
    { id: '#SC-1002', customer: 'Priya Sharma', partner: 'Pooja Mobile Recharge', coinCode: 'SNC-E5F6-G7H8', amount: '1250.00', status: 'Paid' },
];

const mockPartners = [
    { id: 'PNR-001', name: 'Gupta General Store', location: 'Jaipur, Rajasthan', contact: '9988776655', totalCollected: '15,450.00', status: 'Active' },
    { id: 'PNR-002', name: 'Pooja Mobile Recharge', location: 'Pune, Maharashtra', contact: '9876543210', totalCollected: '22,100.00', status: 'Active' },
     { id: 'PNR-003', name: 'Anil Kirana', location: 'Patna, Bihar', contact: '9123456789', totalCollected: '8,200.00', status: 'Inactive' },
];

const initialMockBatches = [
    { id: 'BCH-001', denomination: '500', count: 100, date: '2024-05-20', status: 'Distributed' },
    { id: 'BCH-002', denomination: '1000', count: 50, date: '2024-05-20', status: 'Distributed' },
    { id: 'BCH-003', denomination: '100', count: 200, date: '2024-05-22', status: 'In Stock' },
];


export default function SnazzifyCoinPage() {
    const { toast } = useToast();
    const [batches, setBatches] = useState(initialMockBatches);
    const [newDenomination, setNewDenomination] = useState('');
    const [newCount, setNewCount] = useState('');

    const handlePrint = (batchId: string) => {
        toast({
            title: "Print Job Initiated",
            description: `A print job for batch ${batchId} has been sent.`,
        });
    };
    
    const handleExport = () => {
         toast({
            title: "Export Started",
            description: `Your full coin inventory export will be downloaded shortly.`,
        });
    };

    const handleGenerateBatch = () => {
        if (!newDenomination || !newCount) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please select a coin value and enter the number of coins.",
            });
            return;
        }

        const newBatch = {
            id: `BCH-00${batches.length + 1}`,
            denomination: newDenomination,
            count: parseInt(newCount, 10),
            date: format(new Date(), 'yyyy-MM-dd'),
            status: 'In Stock'
        };

        setBatches(prevBatches => [newBatch, ...prevBatches]);

        toast({
            title: "Batch Generated!",
            description: `Successfully created batch ${newBatch.id} with ${newBatch.count} coins of ₹${newBatch.denomination}.`,
        });

        // Reset fields
        setNewDenomination('');
        setNewCount('');
    };

    return (
        <AppShell title="Snazzify Coin System">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
                    <TabsTrigger value="overview">
                        <Info className="mr-2 h-4 w-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="orders">
                        <Package className="mr-2 h-4 w-4" /> Orders
                    </TabsTrigger>
                    <TabsTrigger value="partners">
                        <Handshake className="mr-2 h-4 w-4" /> Partners
                    </TabsTrigger>
                    <TabsTrigger value="inventory">
                        <Coins className="mr-2 h-4 w-4" /> Coin Inventory
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                     <Card>
                        <CardHeader>
                            <CardTitle>Snazzify Coin: Physical-to-Digital Payments</CardTitle>
                            <CardDescription>Manage your network of local shopkeepers who act as cash collection points using a physical scratch-card system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>How It Works</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-2 mt-2">
                                        <li><b>You distribute physical "Snazzify Coin" scratch cards to your trusted local shopkeepers (Partners).</b></li>
                                        <li><b>A customer pays the partner cash for their order.</b></li>
                                        <li><b>The partner gives the customer a scratch card of equivalent value.</b></li>
                                        <li><b>The customer uses the code on the card to confirm their payment, often via a simple phone call (IVR).</b></li>
                                        <li><b>The order is marked as 'Paid' in your system, and you can dispatch it. You settle the cash with your partner later.</b></li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Snazzify Coin Orders</CardTitle>
                            <CardDescription>View all orders placed and secured using the Snazzify Coin system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Collection Partner</TableHead>
                                        <TableHead>Coin Code Used</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.id}</TableCell>
                                            <TableCell>{order.customer}</TableCell>
                                            <TableCell>{order.partner}</TableCell>
                                            <TableCell className="font-mono text-xs">{order.coinCode}</TableCell>
                                            <TableCell>₹{order.amount}</TableCell>
                                            <TableCell><Badge>{order.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="partners">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Partner Network</CardTitle>
                                <CardDescription>Manage your network of trusted shopkeepers.</CardDescription>
                            </div>
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Partner
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New Partner</DialogTitle>
                                        <DialogDescription>
                                            Enter the details of the new partner shopkeeper. Click save when you're done.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right">
                                                Name
                                            </Label>
                                            <Input id="name" placeholder="e.g., Gupta General Store" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="location" className="text-right">
                                                Location
                                            </Label>
                                            <Input id="location" placeholder="e.g., Jaipur, Rajasthan" className="col-span-3" />
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="contact" className="text-right">
                                                Contact No.
                                            </Label>
                                            <Input id="contact" placeholder="e.g., 9988776655" className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                             <Button type="submit">Save Partner</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Partner ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Total Collected</TableHead>
                                        <TableHead>Status</TableHead>
                                         <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockPartners.map(partner => (
                                        <TableRow key={partner.id}>
                                            <TableCell className="font-medium">{partner.id}</TableCell>
                                            <TableCell>{partner.name}</TableCell>
                                            <TableCell>{partner.location}</TableCell>
                                            <TableCell>₹{partner.totalCollected}</TableCell>
                                            <TableCell>
                                                <Badge variant={partner.status === 'Active' ? 'default' : 'secondary'} className={partner.status === 'Active' ? 'bg-green-100 text-green-800' : ''}>
                                                    {partner.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">View Details</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Partner Details: {partner.name}</DialogTitle>
                                                            <DialogDescription>
                                                                Viewing details for partner {partner.id}.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-2 text-sm">
                                                            <p><strong>Location:</strong> {partner.location}</p>
                                                            <p><strong>Contact:</strong> {partner.contact}</p>
                                                            <p><strong>Total Collected:</strong> ₹{partner.totalCollected}</p>
                                                            <p><strong>Status:</strong> {partner.status}</p>
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button>Close</Button>
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
                 <TabsContent value="inventory">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Generate New Coin Batch</CardTitle>
                                    <CardDescription>Create a new batch of physical scratch cards.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="denomination">Coin Value (Denomination)</Label>
                                        <Select value={newDenomination} onValueChange={setNewDenomination}>
                                            <SelectTrigger id="denomination">
                                                <SelectValue placeholder="Select a value" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="100">₹100</SelectItem>
                                                <SelectItem value="250">₹250</SelectItem>
                                                <SelectItem value="500">₹500</SelectItem>
                                                <SelectItem value="1000">₹1,000</SelectItem>
                                                <SelectItem value="2000">₹2,000</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="count">Number of Coins</Label>
                                        <Input id="count" type="number" placeholder="e.g., 100" value={newCount} onChange={(e) => setNewCount(e.target.value)} />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full">Generate Batch</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Batch Generation</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will generate a new batch of unique coin codes. Are you sure you want to proceed?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleGenerateBatch}>Yes, Generate</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Coin Inventory & Batches</CardTitle>
                                        <CardDescription>Track and manage generated scratch cards.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                         <Button variant="outline" size="sm" onClick={handleExport}>
                                            <Download className="mr-2 h-4 w-4" /> Export All
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Batch ID</TableHead>
                                                <TableHead>Denomination</TableHead>
                                                <TableHead>Count</TableHead>
                                                <TableHead>Date Generated</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batches.map(batch => (
                                                <TableRow key={batch.id}>
                                                    <TableCell className="font-medium">{batch.id}</TableCell>
                                                    <TableCell>₹{batch.denomination}</TableCell>
                                                    <TableCell>{batch.count}</TableCell>
                                                    <TableCell>{batch.date}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={batch.status === 'Distributed' ? 'secondary' : 'default'}>{batch.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="outline" size="icon" onClick={() => handlePrint(batch.id)}>
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </AppShell>
    )
}
