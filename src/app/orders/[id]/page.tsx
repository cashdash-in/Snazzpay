'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, ExternalLink, CreditCard, Send, Loader2 as ButtonLoader, Mail, Printer, Copy, ShieldAlert, AlertTriangle, MessageSquare, Rocket, Facebook, Instagram, Share2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '@/types/order';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
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
} from "@/components/ui/alert-dialog"
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { sanitizePhoneNumber } from '@/lib/utils';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import Image from 'next/image';

type PaymentInfo = {
    paymentId: string;
    orderId: string; 
    authorizedAt: string;
    status: string;
}

function OrderDetailContent() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const orderIdParam = params.id as string;
    
    const [order, setOrder] = useState<EditableOrder | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCharging, setIsCharging] = useState(false);
    const [isSendingLink, setIsSendingLink] = useState(false);
    const [cancellationFee, setCancellationFee] = useState('');
    const [isProcessingFee, setIsProcessingFee] = useState(false);


    const loadOrderData = useCallback(async () => {
        if (!orderIdParam) return;
        setLoading(true);
        
        let foundOrder: EditableOrder | null = null;
        foundOrder = await getDocument<EditableOrder>('orders', orderIdParam);
        if (!foundOrder) foundOrder = await getDocument<EditableOrder>('leads', orderIdParam);

        if (foundOrder) {
             const payDoc = await getDocument<PaymentInfo>('payment_info', foundOrder.orderId || foundOrder.id);
             setPaymentInfo(payDoc);
        }
        
        setOrder(foundOrder);
        setLoading(false);
    }, [orderIdParam]);
    
    useEffect(() => {
        loadOrderData();
    }, [loadOrderData]);

    const handleInputChange = (field: keyof EditableOrder, value: string | number) => {
        setOrder(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = async () => {
        if (!order) return;
        const collectionName = order.paymentStatus === 'Lead' ? 'leads' : 'orders';
        try {
            await saveDocument(collectionName, order, order.id);
            toast({ title: "Order Saved" });
        } catch(e) {
            toast({ variant: 'destructive', title: "Error Saving" });
        }
    };
    
    const handleChargePayment = async () => {
        if (!paymentInfo || !order) return;
        setIsCharging(true);
        try {
            const response = await fetch('/api/charge-mandate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId: paymentInfo.paymentId, amount: parseFloat(order.price) })
            });
            if (!response.ok) throw new Error('Failed to charge');
            await saveDocument('orders', { paymentStatus: 'Paid' }, order.id);
            setOrder(prev => prev ? ({ ...prev, paymentStatus: 'Paid' }) : null);
            toast({ title: "Charge Successful!" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Charge Failed", description: error.message });
        } finally {
            setIsCharging(false);
        }
    };

    const getSecureUrl = (order: EditableOrder) => {
        const baseUrl = window.location.origin;
        const params = new URLSearchParams();
        params.set('order_id', order.id);
        return `${baseUrl}/secure-cod?${params.toString()}`;
    };
    
    const sendAuthLink = async (order: EditableOrder) => {
        setIsSendingLink(true);
        try {
            const response = await fetch('/api/send-auth-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, method: 'email' }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast({ title: "Link Sent!" });
        } catch (error: any) {
             toast({ variant: 'destructive', title: `Error Sending Link`, description: error.message });
        } finally {
            setIsSendingLink(false);
        }
    };

    const copyAuthLink = (order: EditableOrder) => {
        navigator.clipboard.writeText(getSecureUrl(order));
        toast({ title: "Link Copied!" });
    };
    
    const sendWhatsAppNotification = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        const message = `Hi ${order.customerName}! Confirm your order for ${order.productOrdered} here: ${secureUrl}`;
        window.open(`https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (loading) return <AppShell title="Loading..."><div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div></AppShell>;
    
    if (!order) return <AppShell title="Not Found"><Card><CardHeader><CardTitle>Order Not Found</CardTitle></CardHeader></Card></AppShell>;

    return (
        <AppShell title={`Order ${order.orderId}`}>
            <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className='flex items-center gap-4'>
                        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                        <h2 className="text-2xl font-bold">Order Details</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save</Button>
                    </div>
                </div>

                {order.paymentStatus === 'Authorized' && paymentInfo && (
                    <Card className="border-green-200 bg-green-50/50">
                        <CardHeader>
                            <CardTitle>Action Required: Charge Payment</CardTitle>
                            <CardDescription>Payment authorized on {format(new Date(paymentInfo.authorizedAt), "PPP p")}.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button onClick={handleChargePayment} disabled={isCharging} className="bg-green-600 hover:bg-green-700">
                                {isCharging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                Charge ₹{order.price} Now
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                <Card>
                    <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2"><Label>Customer</Label><Input value={order.customerName} onChange={e => handleInputChange('customerName', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Mobile</Label><Input value={order.contactNo} onChange={e => handleInputChange('contactNo', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Amount</Label><Input value={order.price} onChange={e => handleInputChange('price', e.target.value)} /></div>
                        <div className="space-y-2 md:col-span-3"><Label>Product</Label><Input value={order.productOrdered} onChange={e => handleInputChange('productOrdered', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Payment Status</Label>
                            <Select value={order.paymentStatus} onValueChange={v => handleInputChange('paymentStatus', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Authorized">Authorized</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => sendWhatsAppNotification(order)}><MessageSquare className="mr-2 h-4 w-4"/>WhatsApp</Button>
                        <Button variant="outline" size="sm" onClick={() => sendAuthLink(order)} disabled={isSendingLink}><Mail className="mr-2 h-4 w-4"/>Email Link</Button>
                        <Button variant="secondary" size="sm" onClick={() => copyAuthLink(order)}><Copy className="mr-2 h-4 w-4"/>Copy Link</Button>
                    </CardFooter>
                </Card>
            </div>
        </AppShell>
    );
}

export default function OrderDetailPage() {
    return <OrderDetailContent />;
}
