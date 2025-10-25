
'use client';

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DollarSign, ShoppingCart, Activity, Star, Factory, Sparkles, PackagePlus, Coins, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, getCollection, saveDocument, createChat } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { SellerProduct } from "@/app/seller/ai-product-uploader/page";
import type { EditableOrder } from "@/app/orders/page";
import { getCookie } from "cookies-next";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { getRazorpayKeyId } from "@/app/actions";
import { useRouter } from "next/navigation";

const AI_UPLOADER_LIMIT = 50;

const limitIncreaseOptions = [
    { type: 'ai' as const, label: '+50 AI Uploads', increaseAmount: 50, cost: 250 },
    { type: 'ai' as const, label: '+200 AI Uploads', increaseAmount: 200, cost: 800 },
];

export function SellerDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [sellerInfo, setSellerInfo] = useState<SellerUser | null>(null);
    const [usage, setUsage] = useState({ aiUploads: 0 });
    const [limits, setLimits] = useState({ aiUploadLimit: AI_UPLOADER_LIMIT });
    const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [isToppingUp, setIsToppingUp] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSellerInfo() {
            setLoading(true);
            if (user) {
                const [info, products, permissions, keyId, allOrders] = await Promise.all([
                    getDocument<SellerUser>('seller_users', user.uid),
                    getCollection<SellerProduct>('seller_products'),
                    getDocument<{ aiUploadLimit?: number }>('user_permissions', user.uid),
                    getRazorpayKeyId(),
                    getCollection<EditableOrder>('orders'),
                ]);

                setRazorpayKeyId(keyId);

                if (info) {
                    setSellerInfo(info);
                }

                const sellerProducts = products.filter(p => p.sellerId === user.uid);
                setUsage({ aiUploads: sellerProducts.length });

                const sellerOrders = allOrders.filter(o => o.sellerId === user.uid && o.paymentStatus === 'Paid');
                setStats({
                    totalOrders: sellerOrders.length,
                    totalRevenue: sellerOrders.reduce((sum, o) => sum + parseFloat(o.price), 0),
                });


                if (permissions) {
                    setLimits({
                        aiUploadLimit: permissions.aiUploadLimit || AI_UPLOADER_LIMIT,
                    });
                }
            }
            setLoading(false);
        }
        loadSellerInfo();
    }, [user]);

    const handleRequestLimitIncrease = async (option: typeof limitIncreaseOptions[0]) => {
         if (!user || !razorpayKeyId) {
            toast({ variant: 'destructive', title: 'Error', description: 'User details or Razorpay key not available. The admin may need to configure it in settings.' });
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
                        userName: user.displayName || 'Unknown Seller',
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
    
    const handleChatWithAdmin = async () => {
        if (!user || !sellerInfo) {
            toast({ variant: 'destructive', title: "Not logged in" });
            return;
        }
        try {
            const chatId = `admin_${user.uid}`;
            const participantNames = {
                'admin': 'Admin',
                [user.uid]: sellerInfo.companyName,
            };
            await createChat(chatId, ['admin', user.uid], participantNames);
            router.push('/chat-integration-info');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to start chat.' });
        }
    };


    return (
        <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome, <span className="font-bold">{sellerInfo?.companyName || 'Seller'}</span>!</CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                        {sellerInfo?.vendorName ? (
                            <span className="flex items-center gap-2">
                                <Factory className="h-4 w-4" />
                                Your approved vendor is <span className="font-bold">{sellerInfo.vendorName}</span>
                            </span>
                        ) : (
                            "This is your dedicated dashboard. From here you can manage your products, view your orders, and track your performance."
                        )}
                        </div>
                         <Button variant="outline" onClick={handleChatWithAdmin} className="mt-2 sm:mt-0">
                            <MessageSquare className="mr-2 h-4 w-4" /> Chat with Admin
                        </Button>
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">From all completed sales.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                         <p className="text-xs text-muted-foreground">Number of successful orders.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2"><Sparkles /> AI Uploader</CardTitle>
                            <CardDescription>Generate product listings using AI.</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${usage.aiUploads} / ${limits.aiUploadLimit}`}</p>
                            <p className="text-xs text-muted-foreground">Generations Used</p>
                        </div>
                    </CardHeader>
                    <CardFooter>
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="w-full">Request Limit Increase</Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Increase AI Uploader Limit</DialogTitle>
                                    <DialogDescription>Purchase more AI generation credits. Your new limit will be active after admin approval.</DialogDescription>
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
            </div>
        </div>
    );
}
