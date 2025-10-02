
'use client';

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DollarSign, ShoppingCart, Activity, Star, Sparkles, PackagePlus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, getCollection, saveDocument } from "@/services/firestore";
import type { Vendor } from "@/app/vendors/page";
import type { ProductDrop } from "@/app/vendor/product-drops/page";
import { getCookie } from "cookies-next";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { getRazorpayKeyId } from "@/app/actions";

const PRODUCT_DROP_LIMIT = 50;

const limitIncreaseOptions = [
    { type: 'drops' as const, label: '+50 Product Drops', increaseAmount: 50, cost: 250 },
    { type: 'drops' as const, label: '+200 Product Drops', increaseAmount: 200, cost: 800 },
];

export function VendorDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [vendorInfo, setVendorInfo] = useState<Vendor | null>(null);
    const [usage, setUsage] = useState({ drops: 0 });
    const [limit, setLimit] = useState(PRODUCT_DROP_LIMIT);
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [isToppingUp, setIsToppingUp] = useState(false);

    useEffect(() => {
        async function loadVendorInfo() {
            if (user) {
                 getRazorpayKeyId().then(setRazorpayKeyId);

                const [info, drops, permissions] = await Promise.all([
                    getDocument<Vendor>('vendors', user.uid),
                    getCollection<ProductDrop>('product_drops'),
                    getDocument<{ productDropLimit?: number }>('user_permissions', user.uid)
                ]);

                if (info) {
                    setVendorInfo(info);
                }

                const vendorDrops = drops.filter(d => d.vendorId === user.uid);
                setUsage({ drops: vendorDrops.length });

                if (permissions?.productDropLimit) {
                    setLimit(permissions.productDropLimit);
                }
            }
        }
        loadVendorInfo();
    }, [user]);

    const handleRequestLimitIncrease = async (option: typeof limitIncreaseOptions[0]) => {
         if (!user || !razorpayKeyId) {
            toast({ variant: 'destructive', title: 'Error', description: 'User details or Razorpay key not available.' });
            return;
        }
        setIsToppingUp(true);

        try {
            const response = await fetch('/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: option.cost, customerName: user.displayName, isLimitIncrease: true })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            const rzpOptions = {
                key: razorpayKeyId,
                order_id: result.order_id,
                amount: option.cost * 100,
                name: "Snazzify Limit Increase",
                description: `Purchase ${option.label}`,
                handler: async (response: any) => {
                    const newRequest = {
                        id: uuidv4(),
                        userId: user.uid,
                        userName: user.displayName || 'Unknown Vendor',
                        featureType: option.type,
                        increaseAmount: option.increaseAmount,
                        cost: option.cost,
                        paymentId: response.razorpay_payment_id,
                        status: 'Pending Approval',
                        requestDate: new Date().toISOString(),
                    };
                    await saveDocument('limitIncreaseRequests', newRequest, newRequest.id);
                    toast({ title: "Payment Successful!", description: `Your request for ${option.label} has been sent for admin approval.` });
                    setIsToppingUp(false);
                    document.getElementById('close-limit-dialog')?.click();
                },
                prefill: { name: user.displayName, email: user.email },
                theme: { color: "#5a31f4" },
                modal: { ondismiss: () => setIsToppingUp(false) }
            };
            const rzp = new (window as any).Razorpay(rzpOptions);
            rzp.open();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsToppingUp(false);
        }
    };

    return (
        <div className="grid gap-8">
             <Card>
                <CardHeader>
                    <CardTitle>Welcome, <span className="font-bold">{vendorInfo?.name || 'Vendor'}</span>!</CardTitle>
                    <CardDescription>
                        This is your dedicated dashboard. Manage your product drops and see an overview of your activity.
                    </CardDescription>
                </CardHeader>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2"><PackagePlus /> Product Drops</CardTitle>
                        <CardDescription>Share new products with your seller network.</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{usage.drops} / {limit}</p>
                        <p className="text-xs text-muted-foreground">Drops Used</p>
                    </div>
                </CardHeader>
                <CardFooter>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="secondary" className="w-full">Request Limit Increase</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Increase Product Drop Limit</DialogTitle>
                                <DialogDescription>Purchase more product drop credits. Your new limit will be active after admin approval.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                {limitIncreaseOptions.map(opt => (
                                    <Card key={opt.label}>
                                        <CardContent className="p-4 flex justify-between items-center">
                                            <p className="font-bold text-lg">{opt.label}</p>
                                            <Button onClick={() => handleRequestLimitIncrease(opt)} disabled={isToppingUp}>
                                                {isToppingUp ? <Loader2 className="h-4 w-4 animate-spin"/> : `Pay ₹${opt.cost}`}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <DialogFooter><DialogClose asChild><Button id="close-limit-dialog" variant="outline">Close</Button></DialogClose></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,250</div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹8,50,000</div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sellers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">42</div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
