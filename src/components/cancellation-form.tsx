
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '@/app/orders/page';

function CancellationFormComponent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [orderId, setOrderId] = useState('');
    const [cancellationId, setCancellationId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'cancel') {
            setShowForm(true);
        } else {
            setShowForm(false);
        }
    }, [searchParams]);

    const handleCancelOrder = async () => {
        if (!orderId || !cancellationId) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please enter both your Order ID and the unique Cancellation ID.',
            });
            return;
        }
        setIsProcessing(true);

        try {
            // Find the order in localStorage to get payment details
            const manualOrdersJSON = localStorage.getItem('manualOrders');
            const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
            const orderToCancel = manualOrders.find(o => o.orderId === orderId && o.cancellationId === cancellationId);

            if (!orderToCancel) {
                 throw new Error("Order ID and Cancellation ID do not match our records. Please check your details and try again.");
            }
            
            const paymentInfoJSON = localStorage.getItem(`payment_info_${orderToCancel.orderId}`);
            if (!paymentInfoJSON) {
                // If there's no payment auth, just mark as cancelled locally.
                const updatedOrders = manualOrders.map(o => o.id === orderToCancel.id ? { ...o, paymentStatus: 'Voided', cancellationStatus: 'Processed' } : o);
                localStorage.setItem('manualOrders', JSON.stringify(updatedOrders));
                toast({
                    title: 'Order Cancelled',
                    description: 'Your order has been cancelled successfully.',
                });
                setIsProcessing(false);
                return;
            }

            const paymentInfo = JSON.parse(paymentInfoJSON);

            const response = await fetch('/api/cancel-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId: orderToCancel.orderId, 
                    cancellationId: orderToCancel.cancellationId,
                    paymentId: paymentInfo.paymentId,
                    amount: orderToCancel.price
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to process cancellation.');
            }
            
            // Update local storage
            const updatedOrders = manualOrders.map(o => o.id === orderToCancel.id ? { ...o, paymentStatus: 'Voided', cancellationStatus: 'Processed' } : o);
            localStorage.setItem('manualOrders', JSON.stringify(updatedOrders));
            localStorage.removeItem(`payment_info_${orderToCancel.orderId}`);

            toast({
                title: 'Cancellation Successful',
                description: result.message,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Cancellation Failed',
                description: error.message,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!showForm) {
        return null;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
                    <CardTitle>Request Order Cancellation</CardTitle>
                    <CardDescription>Enter your Order ID and the unique Cancellation ID provided by our support team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="order-id">Your Order ID</Label>
                        <Input 
                            id="order-id" 
                            placeholder="#1001" 
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cancellation-id">Unique Cancellation ID</Label>
                        <Input 
                            id="cancellation-id" 
                            placeholder="CNCL-XXXXXXXX" 
                            value={cancellationId}
                            onChange={(e) => setCancellationId(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" variant="destructive" onClick={handleCancelOrder} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Cancel My Order
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


export function CancellationForm() {
    return (
        <Suspense fallback={<div>Loading cancellation form...</div>}>
            <CancellationFormComponent />
        </Suspense>
    )
}
