
'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, CheckCircle, AlertTriangle, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '@/app/orders/page';
import { getDocument, saveDocument } from '@/services/firestore';
import Image from 'next/image';

function GuestFulfillmentPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const orderId = params.orderId as string;
    const token = searchParams.get('token');

    const [order, setOrder] = useState<EditableOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierCompany, setCourierCompany] = useState('');
    const [packageImage, setPackageImage] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId || !token) {
            setError("Invalid fulfillment link. Order ID or token is missing.");
            setIsLoading(false);
            return;
        }

        async function verifyAndLoadOrder() {
            const fetchedOrder = await getDocument<EditableOrder>('orders', orderId);
            if (!fetchedOrder) {
                setError("Order not found.");
            } else if (fetchedOrder.guestFulfillmentToken !== token) {
                setError("Invalid or expired fulfillment link.");
            } else {
                setOrder(fetchedOrder);
            }
            setIsLoading(false);
        }

        verifyAndLoadOrder();
    }, [orderId, token]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPackageImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!order || !trackingNumber || !courierCompany || !packageImage) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide all details, including a package image."});
            return;
        }
        setIsSubmitting(true);
        try {
            const updatedData: Partial<EditableOrder> = {
                trackingNumber,
                courierCompanyName: courierCompany,
                packageImageUrls: [packageImage],
                deliveryStatus: 'dispatched',
                readyForDispatchDate: new Date().toISOString().split('T')[0], // Set dispatch date to today
                guestFulfillmentToken: '', // Invalidate the token after use
            };

            await saveDocument('orders', updatedData, order.id);

            toast({ title: 'Dispatch Info Submitted!', description: "Thank you for fulfilling the order. The admin has been notified." });
            setIsSubmitted(true);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: "Could not save the dispatch information."});
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center h-screen bg-gray-50 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying fulfillment link...</p>
            </div>
        );
    }

    if (error) {
         return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (isSubmitted) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Submission Complete</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Thank you! The dispatch information has been saved. You may now close this window.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Package className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle>Fulfill Order #{order?.orderId}</CardTitle>
                                <CardDescription>Enter dispatch details for the customer order.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card className="bg-muted/50">
                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="sm:col-span-2">
                                    <h4 className="font-semibold">Shipping To:</h4>
                                    <p>{order?.customerName}</p>
                                    <p>{order?.customerAddress}</p>
                                    <p>{order?.pincode}</p>
                                    <hr className="my-2"/>
                                    <h4 className="font-semibold">Product Details:</h4>
                                    <p>{order?.productOrdered}</p>
                                    <p>Quantity: {order?.quantity}</p>
                                </div>
                                <div className="flex items-center justify-center">
                                    {order?.packageImageUrls?.[0] ? (
                                        <Image 
                                            src={order.packageImageUrls[0]} 
                                            alt={order.productOrdered} 
                                            width={150} 
                                            height={150} 
                                            className="rounded-md object-contain aspect-square bg-white shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 bg-white rounded-md flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                                            Product Image Not Available
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="courierCompany">Courier Company</Label>
                                <Input id="courierCompany" placeholder="e.g., Delhivery, BlueDart" value={courierCompany} onChange={e => setCourierCompany(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="trackingNumber">Tracking Number (AWB)</Label>
                                <Input id="trackingNumber" placeholder="Enter tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="packageImage">Upload Package Image</Label>
                            <div className="flex items-center gap-4">
                                <Input id="packageImage" type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer" required />
                                {packageImage && (
                                    <Image src={packageImage} alt="Package Preview" width={80} height={80} className="rounded-md object-cover aspect-square" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Upload a clear photo of the packed parcel with the shipping label visible.</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            Submit Dispatch Information
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}


export default function GuestFulfillmentWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <GuestFulfillmentPageContent />
        </Suspense>
    )
}
