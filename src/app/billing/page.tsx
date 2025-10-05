
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, Send, Settings, Save, History, Check, Briefcase } from "lucide-react";
import { getCollection, saveDocument, getDocument } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { Vendor } from "@/app/vendors/page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CollaboratorBillingPage } from "@/components/collaborator-billing";

type UsageStat = {
    id: string;
    name: string;
    totalValue: number;
    commission: number;
    aiUploads?: number;
    aiUploadLimit?: number;
    productDrops?: number;
    productDropLimit?: number;
};

type LimitIncreaseRequest = {
    id: string;
    userId: string;
    userName: string;
    featureType: 'ai' | 'drops';
    increaseAmount: number;
    cost: number;
    paymentId: string;
    status: 'Pending Approval' | 'Approved';
    requestDate: string;
};

export default function BillingPage() {
    const { toast } = useToast();
    const [sellerUsage, setSellerUsage] = useState<UsageStat[]>([]);
    const [vendorUsage, setVendorUsage] = useState<UsageStat[]>([]);
    const [limitRequests, setLimitRequests] = useState<LimitIncreaseRequest[]>([]);
    const [history, setHistory] = useState<LimitIncreaseRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadBillingData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sellers, vendors, orders, permissions, requests] = await Promise.all([
                getCollection<SellerUser>('seller_users'),
                getCollection<Vendor>('vendors'),
                getCollection<any>('orders'),
                getCollection<{ id: string; aiUploadLimit?: number, productDropLimit?: number }>('user_permissions'),
                getCollection<LimitIncreaseRequest>('limitIncreaseRequests')
            ]);

            const permissionsMap = new Map(permissions.map(p => [p.id, p]));
            setLimitRequests(requests);

            const approvedSellers = sellers.filter(s => s.status === 'approved');
            const approvedVendors = vendors.filter(v => v.status === 'approved');

            const sellerData = approvedSellers.map(seller => {
                const sellerOrders = orders.filter(o => o.sellerId === seller.id && o.paymentStatus === 'Paid');
                const totalValue = sellerOrders.reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
                const commission = totalValue * 0.025;
                const perms = permissionsMap.get(seller.id);

                return {
                    id: seller.id,
                    name: seller.companyName,
                    totalValue,
                    commission,
                    aiUploads: seller.aiUploads || 0,
                    aiUploadLimit: perms?.aiUploadLimit || 50,
                };
            });

             const vendorData = approvedVendors.map(vendor => {
                const vendorOrders = orders.filter(o => o.vendorId === vendor.id && o.paymentStatus === 'Paid');
                const totalValue = vendorOrders.reduce((sum, o) => sum + parseFloat(o.price || '0'), 0);
                const commission = totalValue * 0.025;
                const perms = permissionsMap.get(vendor.id);
                
                return {
                    id: vendor.id,
                    name: vendor.name,
                    totalValue,
                    commission,
                    productDrops: vendor.dropCount || 0,
                    productDropLimit: perms?.productDropLimit || 50,
                };
            });

            setSellerUsage(sellerData);
            setVendorUsage(vendorData);

        } catch (error) {
            console.error("Error loading billing data:", error);
            toast({ variant: "destructive", title: "Failed to load billing data" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadBillingData();
    }, [loadBillingData]);

    const handleFieldChange = (id: string, field: keyof UsageStat, value: string, type: 'seller' | 'vendor') => {
        const listToUpdate = type === 'seller' ? sellerUsage : vendorUsage;
        const setList = type === 'seller' ? setSellerUsage : setVendorUsage;

        const updatedList = listToUpdate.map(item => {
            if (item.id === id) {
                return { ...item, [field]: parseFloat(value) || 0 };
            }
            return item;
        });
        setList(updatedList);
    };

    const handleSave = async (id: string, type: 'seller' | 'vendor') => {
        const listToUpdate = type === 'seller' ? sellerUsage : vendorUsage;
        const item = listToUpdate.find(i => i.id === id);
        if (!item) return;

        try {
            console.log(`Saving ${type} ${id}:`, { totalValue: item.totalValue, commission: item.commission });
            toast({ title: "Data Saved", description: `Billing info for ${item.name} has been updated.` });
        } catch (error) {
             toast({ variant: "destructive", title: "Failed to save" });
        }
    };
    
    const showHistory = (userId: string) => {
        const userHistory = limitRequests.filter(req => req.userId === userId).sort((a, b) => parseISO(b.requestDate).getTime() - parseISO(a.requestDate).getTime());
        setHistory(userHistory);
    };

    const handleApproveRequest = async (request: LimitIncreaseRequest) => {
        try {
            const permissions = await getDocument<any>('user_permissions', request.userId) || { id: request.userId, aiUploadLimit: 50, productDropLimit: 50 };
            
            if (request.featureType === 'ai') {
                permissions.aiUploadLimit = (permissions.aiUploadLimit || 50) + request.increaseAmount;
            } else if (request.featureType === 'drops') {
                permissions.productDropLimit = (permissions.productDropLimit || 50) + request.increaseAmount;
            }

            await saveDocument('user_permissions', permissions, request.userId);
            await saveDocument('limitIncreaseRequests', { ...request, status: 'Approved' }, request.id);
            
            toast({ title: 'Request Approved!', description: `${request.userName}'s limit has been increased.` });
            loadBillingData();

        } catch (error) {
            console.error("Error approving request:", error);
            toast({ variant: 'destructive', title: 'Approval Failed' });
        }
    };

    return (
        <AppShell title="Billing & Usage Management">
            <Tabs defaultValue="sellers">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="sellers">Seller Usage</TabsTrigger>
                    <TabsTrigger value="vendors">Vendor Usage</TabsTrigger>
                    <TabsTrigger value="collaborators">Collaborator Billing</TabsTrigger>
                    <TabsTrigger value="requests">Limit Requests <Badge className="ml-2">{limitRequests.filter(r=> r.status === 'Pending Approval').length}</Badge></TabsTrigger>
                </TabsList>
                <TabsContent value="sellers" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seller Billing & Usage</CardTitle>
                            <CardDescription>Track feature usage, transaction values, and commissions for all approved sellers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seller Name</TableHead>
                                        <TableHead>AI Uploads</TableHead>
                                        <TableHead>Total Value (INR)</TableHead>
                                        <TableHead>Platform Commission (2.5%)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {sellerUsage.map(seller => (
                                       <TableRow key={seller.id}>
                                            <TableCell>{seller.name}</TableCell>
                                            <TableCell><Sparkles className="inline h-4 w-4 mr-1"/>{seller.aiUploads} / {seller.aiUploadLimit}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={seller.totalValue} 
                                                    onChange={(e) => handleFieldChange(seller.id, 'totalValue', e.target.value, 'seller')}
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={seller.commission}
                                                    onChange={(e) => handleFieldChange(seller.id, 'commission', e.target.value, 'seller')} 
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Dialog>
                                                    <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => showHistory(seller.id)}><History className="mr-2 h-4 w-4" />History</Button></DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Limit Increase History for {seller.name}</DialogTitle></DialogHeader>
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Feature</TableHead><TableHead>Amount</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {history.map(h => <TableRow key={h.id}><TableCell>{format(parseISO(h.requestDate), 'PP')}</TableCell><TableCell>{h.featureType}</TableCell><TableCell>+{h.increaseAmount}</TableCell><TableCell>₹{h.cost}</TableCell><TableCell><Badge variant={h.status === 'Approved' ? 'default' : 'secondary'}>{h.status}</Badge></TableCell></TableRow>)}
                                                                {history.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No history found.</TableCell></TableRow>}
                                                            </TableBody>
                                                        </Table>
                                                    </DialogContent>
                                                </Dialog>
                                                <Button size="sm" variant="outline" onClick={() => handleSave(seller.id, 'seller')}><Save className="mr-2 h-4 w-4" />Save</Button>
                                            </TableCell>
                                       </TableRow>
                                   ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="vendors" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendor Billing & Usage</CardTitle>
                            <CardDescription>Track feature usage, transaction values, and commissions for all approved vendors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor Name</TableHead>
                                        <TableHead>Product Drops</TableHead>
                                        <TableHead>Total Value (INR)</TableHead>
                                        <TableHead>Platform Commission (2.5%)</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendorUsage.map(vendor => (
                                       <TableRow key={vendor.id}>
                                            <TableCell>{vendor.name}</TableCell>
                                            <TableCell><Send className="inline h-4 w-4 mr-1"/>{vendor.productDrops} / {vendor.productDropLimit}</TableCell>
                                             <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={vendor.totalValue} 
                                                    onChange={(e) => handleFieldChange(vendor.id, 'totalValue', e.target.value, 'vendor')}
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={vendor.commission}
                                                    onChange={(e) => handleFieldChange(vendor.id, 'commission', e.target.value, 'vendor')} 
                                                    className="w-32"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Dialog>
                                                    <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => showHistory(vendor.id)}><History className="mr-2 h-4 w-4" />History</Button></DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Limit Increase History for {vendor.name}</DialogTitle></DialogHeader>
                                                         <Table>
                                                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Feature</TableHead><TableHead>Amount</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {history.map(h => <TableRow key={h.id}><TableCell>{format(parseISO(h.requestDate), 'PP')}</TableCell><TableCell>{h.featureType}</TableCell><TableCell>+{h.increaseAmount}</TableCell><TableCell>₹{h.cost}</TableCell><TableCell><Badge variant={h.status === 'Approved' ? 'default' : 'secondary'}>{h.status}</Badge></TableCell></TableRow>)}
                                                                {history.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No history found.</TableCell></TableRow>}
                                                            </TableBody>
                                                        </Table>
                                                    </DialogContent>
                                                </Dialog>
                                                <Button size="sm" variant="outline" onClick={() => handleSave(vendor.id, 'vendor')}><Save className="mr-2 h-4 w-4" />Save</Button>
                                            </TableCell>
                                       </TableRow>
                                   ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="collaborators" className="mt-4">
                    <CollaboratorBillingPage />
                </TabsContent>
                <TabsContent value="requests" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Limit Increase Requests</CardTitle>
                            <CardDescription>Approve paid requests to increase usage limits for sellers and vendors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Request</TableHead><TableHead>Amount Paid</TableHead><TableHead>Payment ID</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {limitRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>{format(parseISO(req.requestDate), 'PPp')}</TableCell>
                                            <TableCell>{req.userName}</TableCell>
                                            <TableCell>+{req.increaseAmount} {req.featureType === 'ai' ? 'AI Uploads' : 'Product Drops'}</TableCell>
                                            <TableCell>₹{req.cost.toFixed(2)}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.paymentId}</TableCell>
                                            <TableCell><Badge variant={req.status === 'Approved' ? 'default' : 'secondary'}>{req.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleApproveRequest(req)} disabled={req.status === 'Approved'}>
                                                    {req.status === 'Approved' ? 'Approved' : <><Check className="h-4 w-4 mr-1"/>Approve</>}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {limitRequests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24">No pending requests.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
