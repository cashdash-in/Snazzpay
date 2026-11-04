
'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { 
    DollarSign, ShoppingCart, Activity, Star, Factory, Sparkles, 
    PackagePlus, Coins, Loader2, MessageSquare, Scan, Layers, FileUp, ShieldCheck 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, getCollection, saveDocument, createChat } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { SellerProduct } from "@/app/seller/ai-product-uploader/page";
import type { EditableOrder } from "@/app/orders/page";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
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
    
    // File Input Refs for Mobile Interaction Stability
    const bulkSnapRef = useRef<HTMLInputElement>(null);
    const billAiRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadSellerInfo() {
            setLoading(true);
            if (user) {
                const [info, products, permissions, keyIdData, allOrders] = await Promise.all([
                    getDocument<SellerUser>('seller_users', user.uid),
                    getCollection<SellerProduct>('seller_products'),
                    getDocument<{ aiUploadLimit?: number }>('user_permissions', user.uid),
                    fetch('/api/get-key').then(res => res.json()),
                    getCollection<EditableOrder>('orders'),
                ]);

                setRazorpayKeyId(keyIdData.keyId);

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
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[32px]">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-xl font-black italic uppercase">Welcome, {sellerInfo?.companyName || 'Store Owner'}</CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-2 font-bold text-slate-500 uppercase text-[10px]">
                            <Factory className="h-3 w-3" /> Supply Partner: {sellerInfo?.vendorName || 'Direct'}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleChatWithAdmin} className="rounded-xl h-10 border-2 font-bold uppercase text-[10px]">
                            <MessageSquare className="mr-2 h-4 w-4" /> Chat with Admin
                        </Button>
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="rounded-[24px] bg-emerald-600 text-white border-none p-6 flex flex-col gap-2 transform active:scale-95 transition-all cursor-pointer" onClick={() => router.push('/seller/ai-product-uploader')}>
                            <Scan className="h-8 w-8 opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Quick Sell</p>
                            <h4 className="text-xl font-black italic uppercase">Scan to Sell</h4>
                        </Card>
                        <Card className="rounded-[24px] bg-blue-600 text-white border-none p-6 flex flex-col gap-2 transform active:scale-95 transition-all cursor-pointer" onClick={() => bulkSnapRef.current?.click()}>
                            <Layers className="h-8 w-8 opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Intake</p>
                            <h4 className="text-xl font-black italic uppercase">Bulk Snap</h4>
                        </Card>
                        <Card className="rounded-[24px] bg-indigo-600 text-white border-none p-6 flex flex-col gap-2 transform active:scale-95 transition-all cursor-pointer" onClick={() => billAiRef.current?.click()}>
                            <FileUp className="h-8 w-8 opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Logistics</p>
                            <h4 className="text-xl font-black italic uppercase">Bill AI</h4>
                        </Card>
                        <Card className="rounded-[24px] bg-purple-600 text-white border-none p-6 flex flex-col gap-2 transform active:scale-95 transition-all cursor-pointer" onClick={() => router.push('/seller/products')}>
                            <ShieldCheck className="h-8 w-8 opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-100">Inventory</p>
                            <h4 className="text-xl font-black italic uppercase">Shelf Audit</h4>
                        </Card>
                    </div>
                    
                    <input ref={bulkSnapRef} type="file" className="hidden" accept="image/*" multiple onChange={() => toast({ title: "Processing Intake..." })} />
                    <input ref={billAiRef} type="file" className="hidden" accept="image/*" onChange={() => toast({ title: "Analyzing Bill..." })} />
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Card className="rounded-[28px] shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black italic">₹{stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Life-time Earnings</p>
                    </CardContent>
                </Card>
                 <Card className="rounded-[28px] shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black italic">{stats.totalOrders}</div>
                         <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Paid Transactions</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[28px] shadow-sm border-none bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">AI Snap Credit</CardTitle>
                            <CardDescription className="text-[9px] uppercase font-bold">Generative Power</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black italic">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${usage.aiUploads} / ${limits.aiUploadLimit}`}</p>
                        </div>
                    </CardHeader>
                    <CardFooter>
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="w-full rounded-xl h-10 font-bold uppercase text-[10px]">Request Limit Increase</Button>
                            </DialogTrigger>
                             <DialogContent className="rounded-[32px]">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black italic uppercase">Increase AI Power</DialogTitle>
                                    <DialogDescription>Purchase more AI generation credits to keep your stock moving.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    {limitIncreaseOptions.map(opt => (
                                        <Card key={opt.label} className="rounded-2xl border-2 border-slate-100 hover:border-primary transition-all">
                                            <CardContent className="p-5 flex justify-between items-center">
                                                <p className="font-black italic uppercase text-sm">{opt.label}</p>
                                                <Button onClick={() => handleRequestLimitIncrease(opt)} disabled={isToppingUp} className="rounded-xl h-10 px-6 font-bold">
                                                    {isToppingUp ? <Loader2 className="h-4 w-4 animate-spin"/> : `Pay ₹${opt.cost}`}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <DialogFooter><DialogClose asChild><Button id="close-limit-dialog" variant="outline" className="rounded-xl">Close</Button></DialogClose></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

