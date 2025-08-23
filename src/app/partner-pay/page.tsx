
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, Handshake, Info, PlusCircle, Printer, Download, Loader2, QrCode } from 'lucide-react';
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
import { v4 as uuidv4 } from 'uuid';


// Mock Data - Replace with real data later
const mockOrders = [
    { id: '#PP-1001', customer: 'Ravi Kumar', partner: 'Gupta General Store', coinCode: 'SNZ-A1B2-C3D4', amount: '499.00', status: 'Paid' },
    { id: '#PP-1002', customer: 'Priya Sharma', partner: 'Pooja Mobile Recharge', coinCode: 'SNZ-E5F6-G7H8', amount: '1250.00', status: 'Paid' },
];

const mockPartners = [
    { id: 'PNR-001', name: 'Gupta General Store', location: 'Jaipur, Rajasthan', contact: '9988776655', totalCollected: '15,450.00', balance: '2500.00', status: 'Active' },
    { id: 'PNR-002', name: 'Pooja Mobile Recharge', location: 'Pune, Maharashtra', contact: '9876543210', totalCollected: '22,100.00', balance: '5000.00', status: 'Active' },
    { id: 'PNR-003', name: 'Anil Kirana', location: 'Patna, Bihar', contact: '9123456789', totalCollected: '8,200.00', balance: '0.00', status: 'Inactive' },
];

const initialMockCodes = [
    { id: 'SNC-A1B2-C3D4', value: '499.00', date: '2024-05-23', partner: 'Gupta General Store', status: 'Used' },
    { id: 'SNC-E5F6-G7H8', value: '1250.00', date: '2024-05-23', partner: 'Pooja Mobile Recharge', status: 'Used' },
    { id: 'SNC-J9K0-L1M2', value: '100.00', date: '2024-05-22', partner: 'Gupta General Store', status: 'Unused' },
];


export default function PartnerPayPage() {
    const { toast } = useToast();
    const [codes, setCodes] = useState(initialMockCodes);
    const [newCodeValue, setNewCodeValue] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');


    const handleGenerateCode = () => {
        if (!newCodeValue || !selectedPartner) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please select a partner and enter a value for the code.",
            });
            return;
        }

        const newCode = {
            id: `SNC-${uuidv4().substring(0, 4).toUpperCase()}-${uuidv4().substring(4, 8).toUpperCase()}`,
            value: parseFloat(newCodeValue).toFixed(2),
            date: format(new Date(), 'yyyy-MM-dd'),
            partner: mockPartners.find(p => p.id === selectedPartner)?.name || 'Unknown Partner',
            status: 'Unused'
        };

        setCodes(prevCodes => [newCode, ...prevCodes]);

        toast({
            title: "Digital Code Generated!",
            description: `Successfully created code ${newCode.id} for ₹${newCode.value}.`,
        });

        // Reset fields
        setNewCodeValue('');
        setSelectedPartner('');
    };
    
    const handleExport = () => {
         toast({
            title: "Export Started",
            description: `Your full transaction code export will be downloaded shortly.`,
        });
    };

    return (
        <AppShell title="Partner Pay System">
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
                    <TabsTrigger value="codes">
                        <QrCode className="mr-2 h-4 w-4" /> Digital Codes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                     <Card>
                        <CardHeader>
                            <CardTitle>Snazzify Coin: The Digital Cash Ecosystem</CardTitle>
                            <CardDescription>A revolutionary system empowering local shopkeepers to act as cash collection and delivery hubs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>The Win-Win-Win Business Model</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-2 mt-2">
                                        <li><b>Shopkeeper Onboarding:</b> A local shopkeeper (Partner) signs up with their business documents and bank details. After paying a small tie-up fee, they receive a digital credit balance of "Snazzify Coins" on their dedicated mobile app.</li>
                                        <li><b>Customer Pays with Cash:</b> A customer without digital payment options pays the partner cash for their online order.</li>
                                        <li><b>Digital Code Generation:</b> The partner uses their app to instantly generate a unique, single-use "Snazzify Coin" code for the exact transaction amount. The partner's coin balance is debited.</li>
                                        <li><b>Code Sharing:</b> The partner shares this secure code with the customer via SMS, WhatsApp, or a simple printed receipt from their thermal printer.</li>
                                        <li><b>Customer Confirms Order:</b> The customer uses this code on the Snazzify website or via a phone call to finalize their purchase. The order is marked as 'Paid' and is dispatched.</li>
                                        <li><b>Logistics & Delivery Hub:</b> Logistics partners can use the trusted shopkeeper's location as a secure drop-off and pickup point for parcels in the area, creating an additional revenue stream for the partner.</li>
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
                            <CardDescription>View all orders placed and secured using the Snazzify Coin digital code system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Collection Partner</TableHead>
                                        <TableHead>Digital Code Used</TableHead>
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
                                <CardDescription>Manage your network of trusted shopkeepers and their digital coin balances.</CardDescription>
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
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="balance" className="text-right">
                                                Initial Balance
                                            </Label>
                                            <Input id="balance" type="number" placeholder="e.g., 10000" className="col-span-3" />
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
                                        <TableHead>Balance</TableHead>
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
                                            <TableCell>₹{partner.balance}</TableCell>
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
                                                            <p><strong>Current Balance:</strong> ₹{partner.balance}</p>
                                                            <p><strong>Total Collected All-Time:</strong> ₹{partner.totalCollected}</p>
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
                 <TabsContent value="codes">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Generate Digital Code</CardTitle>
                                    <CardDescription>Create a unique payment code for a cash transaction.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="partner">Select Partner</Label>
                                        <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                                            <SelectTrigger id="partner">
                                                <SelectValue placeholder="Select a partner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mockPartners.filter(p=>p.status==='Active').map(p => (
                                                  <SelectItem key={p.id} value={p.id}>{p.name} (Balance: ₹{p.balance})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="count">Transaction Value (INR)</Label>
                                        <Input id="count" type="number" placeholder="e.g., 499.00" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full">Generate Code</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Code Generation</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will generate a new digital payment code and may debit the partner's balance. Are you sure you want to proceed?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleGenerateCode}>Yes, Generate Code</AlertDialogAction>
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
                                        <CardTitle>Generated Digital Codes</CardTitle>
                                        <CardDescription>Track all generated payment codes.</CardDescription>
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
                                                <TableHead>Code</TableHead>
                                                <TableHead>Value</TableHead>
                                                <TableHead>Partner</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {codes.map(code => (
                                                <TableRow key={code.id}>
                                                    <TableCell className="font-mono text-xs">{code.id}</TableCell>
                                                    <TableCell>₹{code.value}</TableCell>
                                                    <TableCell>{code.partner}</TableCell>
                                                    <TableCell>{code.date}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={code.status === 'Used' ? 'secondary' : 'default'}>{code.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                         <Button variant="ghost" size="icon">
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
