
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Wallet, Package, QrCode, Clipboard, PackageCheck, Send, MessageSquare, AlertTriangle, FileUp, Edit, ShieldCheck, CheckCircle, Copy, User, Phone, Home, Truck, Map, UserCheck, Users, Upload, Crown, Loader2, PlusCircle, Trash2, MapPin, Search, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';
import type { ShaktiCardData } from '@/components/shakti-card';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

type Agent = {
    id: string;
    name: string;
    phone: string;
    status: 'Active' | 'Inactive';
    cashOnHand: number;
    pickupsToday: number;
    area: string;
    task: 'Idle' | 'On Pickup' | 'On Delivery';
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

type ServicePartner = {
    id: string;
    name: string;
    contact: string;
    coverageArea: string;
    status: 'Active' | 'On-Hold';
};

export type LogisticsPartnerData = {
    id: string;
    companyName: string;
    pan: string;
    aadhaar: string;
    address: string;
    phone: string;
    status: 'pending' | 'approved' | 'rejected';
};

function ReportsTab({ fleet, pickups, partnerName }: { fleet: Agent[], pickups: Pickup[], partnerName: string }) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleExport = (type: 'fleet' | 'pickups') => {
        setIsGenerating(true);
        try {
            let dataToExport: any[] = [];
            let fileName = `${partnerName.replace(/\s+/g, '_')}_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            let worksheet;

            if (type === 'fleet') {
                dataToExport = fleet.map(agent => ({
                    'Agent Name': agent.name,
                    'Phone': agent.phone,
                    'Area': agent.area,
                    'Cash on Hand (INR)': agent.cashOnHand,
                    'Pickups Today': agent.pickupsToday,
                    'Status': agent.status,
                    'Current Task': agent.task
                }));
                worksheet = XLSX.utils.json_to_sheet(dataToExport);
                fileName = `Fleet_Performance_${fileName}`;
            } else if (type === 'pickups') {
                 dataToExport = pickups.map(pickup => ({
                    'Pickup ID': pickup.id,
                    'Customer Name': pickup.customer,
                    'Address': pickup.address,
                    'Amount (INR)': pickup.amount,
                    'Status': pickup.status,
                    'Assigned To': pickup.assignedTo || 'N/A',
                    'AI Verification': pickup.aiVerification
                }));
                worksheet = XLSX.utils.json_to_sheet(dataToExport);
                fileName = `Pickup_History_${fileName}`;
            }

            if (dataToExport.length === 0) {
                toast({
                    variant: 'destructive',
                    title: "No Data Found",
                    description: "There is no data to export for this report type.",
                });
                setIsGenerating(false);
                return;
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
            XLSX.writeFile(workbook, fileName);

            toast({ title: "Report Generated", description: `${dataToExport.length} records exported to ${fileName}.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Generating Report', description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Logistics Reports</CardTitle>
                <CardDescription>Generate and download reports for your fleet and performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Fleet Performance Report</CardTitle>
                        <CardDescription>Export a summary of all your agents and their current performance metrics.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button onClick={() => handleExport('fleet')} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Fleet Data
                        </Button>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pickup History Report</CardTitle>
                        <CardDescription>Export a detailed history of all cash pickup assignments.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button onClick={() => handleExport('pickups')} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Pickup Data
                        </Button>
                    </CardFooter>
                </Card>
            </CardContent>
        </Card>
    );
}

export default function LogisticsDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [partnerName, setPartnerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [fleet, setFleet] = useState<Agent[]>([]);
    const [pickups, setPickups] = useState<Pickup[]>([]);
    const [servicePartners, setServicePartners] = useState<ServicePartner[]>([]);
    const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
    const [newAgent, setNewAgent] = useState({ name: '', phone: '', area: '' });
    const [newServicePartner, setNewServicePartner] = useState({ name: '', contact: '', coverageArea: '' });
    const [shaktiSearchPhone, setShaktiSearchPhone] = useState('');
    const [shaktiSearchResult, setShaktiSearchResult] = useState<ShaktiCardData | null | 'not_found'>(null);
    const [isSearchingShakti, setIsSearchingShakti] = useState(false);

    useEffect(() => {
        const loggedInPartnerId = localStorage.getItem('loggedInLogisticsPartnerId');
        const loggedInPartnerName = localStorage.getItem('loggedInLogisticsPartnerName');

        if (!loggedInPartnerId || !loggedInPartnerName) {
            toast({ variant: 'destructive', title: "Access Denied", description: "You must be logged in to view this page." });
            router.push('/logistics-secure/login');
            return;
        }
        setPartnerName(loggedInPartnerName);
        
        // Load data from localStorage
        const storedFleet = localStorage.getItem(`logistics_fleet_${loggedInPartnerId}`);
        const storedPickups = localStorage.getItem(`logistics_pickups_${loggedInPartnerId}`);
        const storedServicePartners = localStorage.getItem(`logistics_service_partners_${loggedInPartnerId}`);

        if (storedFleet) {
            setFleet(JSON.parse(storedFleet));
        } else {
            const initialFleet = [
                { id: `AGENT-${loggedInPartnerId}-01`, name: 'Rajesh Kumar', phone: '9876543210', status: 'Active', cashOnHand: 0, pickupsToday: 0, area: 'Mumbai South', task: 'Idle' },
                { id: `AGENT-${loggedInPartnerId}-02`, name: 'Sunita Devi', phone: '9123456789', status: 'Active', cashOnHand: 0, pickupsToday: 0, area: 'Pune Central', task: 'On Delivery' },
            ];
            setFleet(initialFleet);
        }

        if (storedPickups) {
            setPickups(JSON.parse(storedPickups));
        } else {
             const initialPickups = [
                { id: '#SNZ-PICKUP-001', customer: 'Amit Sharma', address: '123, Rose Villa, Mumbai', amount: 1500.00, status: 'Pending Assignment', aiVerification: 'Pending' },
                { id: '#SNZ-PICKUP-002', customer: 'Priya Mehta', address: '456, Orchid Heights, Pune', amount: 450.50, status: 'Pending Assignment', aiVerification: 'Pending' },
            ];
            setPickups(initialPickups);
        }
        
         if (storedServicePartners) {
            setServicePartners(JSON.parse(storedServicePartners));
        } else {
             const initialServicePartners = [
                { id: `SP-${loggedInPartnerId}-01`, name: 'Ganesh Logistics', contact: '9000011111', coverageArea: 'Rural Thane', status: 'Active' }
            ];
            setServicePartners(initialServicePartners);
        }

        setLoading(false);
    }, [router, toast]);
    
    useEffect(() => {
        // Persist changes to localStorage
        const partnerId = localStorage.getItem('loggedInLogisticsPartnerId');
        if (partnerId && !loading) {
            localStorage.setItem(`logistics_fleet_${partnerId}`, JSON.stringify(fleet));
            localStorage.setItem(`logistics_pickups_${partnerId}`, JSON.stringify(pickups));
            localStorage.setItem(`logistics_service_partners_${partnerId}`, JSON.stringify(servicePartners));
        }
    }, [fleet, pickups, servicePartners, loading]);

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

    const handleAddNewAgent = () => {
        if (!newAgent.name || !newAgent.phone || !newAgent.area) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in all details for the new agent.' });
            return;
        }
        const loggedInPartnerId = localStorage.getItem('loggedInLogisticsPartnerId');
        const newAgentData: Agent = {
            id: `AGENT-${loggedInPartnerId}-${uuidv4().substring(0, 4)}`,
            ...newAgent,
            status: 'Active',
            cashOnHand: 0,
            pickupsToday: 0,
            task: 'Idle'
        };
        setFleet(prev => [...prev, newAgentData]);
        setNewAgent({ name: '', phone: '', area: '' }); // Reset form
        toast({ title: 'Agent Added', description: `${newAgent.name} has been added to your fleet.` });
        document.getElementById('close-add-agent-dialog')?.click();
    };
    
    const handleAddNewServicePartner = () => {
        if (!newServicePartner.name || !newServicePartner.contact || !newServicePartner.coverageArea) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in all details for the new service partner.' });
            return;
        }
        const loggedInPartnerId = localStorage.getItem('loggedInLogisticsPartnerId');
        const newPartnerData: ServicePartner = {
            id: `SP-${loggedInPartnerId}-${uuidv4().substring(0, 4)}`,
            ...newServicePartner,
            status: 'Active',
        };
        setServicePartners(prev => [...prev, newPartnerData]);
        setNewServicePartner({ name: '', contact: '', coverageArea: '' }); // Reset form
        toast({ title: 'Service Partner Added', description: `${newServicePartner.name} has been added to your network.` });
        document.getElementById('close-add-sp-dialog')?.click();
    };

    const handleRemoveAgent = (agentId: string) => {
        setFleet(prev => prev.filter(agent => agent.id !== agentId));
        toast({ variant: 'destructive', title: 'Agent Removed', description: 'The agent has been removed from your fleet.' });
    };
    
     const handleRemoveServicePartner = (partnerId: string) => {
        setServicePartners(prev => prev.filter(sp => sp.id !== partnerId));
        toast({ variant: 'destructive', title: 'Service Partner Removed', description: 'The partner has been removed from your network.' });
    };

    const handleFieldChange = (agentId: string, field: keyof Agent, value: string) => {
        setFleet(prev => prev.map(agent => agent.id === agentId ? { ...agent, [field]: value } : agent));
    };

    const handleShaktiCardSearch = () => {
        if (!shaktiSearchPhone) return;
        setIsSearchingShakti(true);
        setShaktiSearchResult(null);
        setTimeout(() => {
            const allCards: ShaktiCardData[] = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
            const foundCard = allCards.find(c => c.customerPhone.includes(shaktiSearchPhone));
            if (foundCard) {
                setShaktiSearchResult(foundCard);
            } else {
                setShaktiSearchResult('not_found');
            }
            setIsSearchingShakti(false);
        }, 500);
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
                    <div className="flex gap-2 mt-4 sm:mt-0">
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline"><ShieldCheck className="mr-2 h-4 w-4" /> Shakti Card Lookup</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Shakti Card Search</DialogTitle>
                                    <DialogDescription>Check if a customer has a Shakti Card by their mobile number.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Input placeholder="Enter customer mobile" value={shaktiSearchPhone} onChange={e => setShaktiSearchPhone(e.target.value)} />
                                        <Button onClick={handleShaktiCardSearch} disabled={isSearchingShakti}>{isSearchingShakti ? <Loader2 className="animate-spin" /> : <Search />}</Button>
                                    </div>
                                    {shaktiSearchResult && (
                                        shaktiSearchResult === 'not_found' ? (
                                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm text-center">No Shakti Card found for this mobile number.</div>
                                        ) : (
                                            <div className="p-4 bg-green-50 text-green-800 rounded-md text-sm space-y-1">
                                                <p><strong className="text-green-900">Card Found:</strong> {shaktiSearchResult.customerName}</p>
                                                <p><strong className="text-green-900">Card Number:</strong> {shaktiSearchResult.cardNumber}</p>
                                                <p><strong className="text-green-900">Points:</strong> {shaktiSearchResult.points}</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </header>

                <main>
                    <Tabs defaultValue="fleet">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="fleet"><Users className="mr-2 h-4 w-4" /> My Fleet</TabsTrigger>
                            <TabsTrigger value="pickups"><Package className="mr-2 h-4 w-4" /> Cash Pickups</TabsTrigger>
                            <TabsTrigger value="service_partners"><UserCheck className="mr-2 h-4 w-4"/> Service Partners</TabsTrigger>
                            <TabsTrigger value="performance"><Crown className="mr-2 h-4 w-4" /> Performance</TabsTrigger>
                            <TabsTrigger value="reports"><FileSpreadsheet className="mr-2 h-4 w-4" /> Reports</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fleet">
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle>Fleet Management &amp; Live Cash Tracking</CardTitle>
                                        <CardDescription>Monitor your delivery agents and their real-time cash collections.</CardDescription>
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Agent</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Add New Fleet Agent</DialogTitle></DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div className="space-y-2"><Label htmlFor="agent-name">Agent Name</Label><Input id="agent-name" value={newAgent.name} onChange={(e) => setNewAgent(p => ({ ...p, name: e.target.value }))} /></div>
                                                <div className="space-y-2"><Label htmlFor="agent-phone">Agent Phone</Label><Input id="agent-phone" value={newAgent.phone} onChange={(e) => setNewAgent(p => ({ ...p, phone: e.target.value }))} /></div>
                                                <div className="space-y-2"><Label htmlFor="agent-area">Area of Operation</Label><Input id="agent-area" value={newAgent.area} onChange={(e) => setNewAgent(p => ({ ...p, area: e.target.value }))} /></div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleAddNewAgent}>Save Agent</Button>
                                                <DialogClose asChild><Button variant="outline" id="close-add-agent-dialog">Cancel</Button></DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Area of Operation</TableHead><TableHead>Current Task</TableHead><TableHead>Live Cash on Hand</TableHead><TableHead>Pickups Today</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {fleet.map(agent => (
                                                <TableRow key={agent.id}>
                                                    <TableCell><div className="font-medium">{agent.name}</div><div className="text-xs text-muted-foreground">{agent.phone}</div></TableCell>
                                                    <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /><Input className="h-8" value={agent.area} onChange={e => handleFieldChange(agent.id, 'area', e.target.value)} /></div></TableCell>
                                                    <TableCell>
                                                         <Select value={agent.task} onValueChange={(value: 'Idle' | 'On Pickup' | 'On Delivery') => handleFieldChange(agent.id, 'task', value)}>
                                                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                                            <SelectContent><SelectItem value="Idle">Idle</SelectItem><SelectItem value="On Pickup">On Pickup</SelectItem><SelectItem value="On Delivery">On Delivery</SelectItem></SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="font-semibold">₹{agent.cashOnHand.toFixed(2)}</TableCell>
                                                    <TableCell className="font-medium text-center">{agent.pickupsToday}</TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" onClick={() => handleSettleCash(agent.id)} disabled={agent.cashOnHand === 0}>Settle Cash</Button>
                                                        <Button size="icon" variant="destructive" onClick={() => handleRemoveAgent(agent.id)}><Trash2 className="h-4 w-4" /></Button>
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
                         <TabsContent value="service_partners">
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle>Service Partner Network</CardTitle>
                                        <CardDescription>Manage your network of sub-contracted service partners or freelancers for extended reach.</CardDescription>
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Service Partner</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Add New Service Partner</DialogTitle></DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div className="space-y-2"><Label>Partner Name</Label><Input value={newServicePartner.name} onChange={(e) => setNewServicePartner(p => ({ ...p, name: e.target.value }))} /></div>
                                                <div className="space-y-2"><Label>Partner Contact</Label><Input value={newServicePartner.contact} onChange={(e) => setNewServicePartner(p => ({ ...p, contact: e.target.value }))} /></div>
                                                <div className="space-y-2"><Label>Coverage Area</Label><Input value={newServicePartner.coverageArea} onChange={(e) => setNewServicePartner(p => ({ ...p, coverageArea: e.target.value }))} /></div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleAddNewServicePartner}>Save Partner</Button>
                                                <DialogClose asChild><Button id="close-add-sp-dialog" variant="outline">Cancel</Button></DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent>
                                     <Table>
                                        <TableHeader><TableRow><TableHead>Partner Name</TableHead><TableHead>Contact</TableHead><TableHead>Coverage Area</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {servicePartners.map(sp => (
                                                <TableRow key={sp.id}>
                                                    <TableCell className="font-medium">{sp.name}</TableCell>
                                                    <TableCell>{sp.contact}</TableCell>
                                                    <TableCell>{sp.coverageArea}</TableCell>
                                                    <TableCell><Badge variant={sp.status === 'Active' ? 'default' : 'secondary'}>{sp.status}</Badge></TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" variant="destructive" onClick={() => handleRemoveServicePartner(sp.id)}>Remove</Button>
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
                         <TabsContent value="reports">
                            <ReportsTab fleet={fleet} pickups={pickups} partnerName={partnerName} />
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
