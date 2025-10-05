
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Loader2, PlusCircle, Trash2, Save, MessageSquare, CreditCard, Ban, CircleDollarSign, Factory, Store, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { sanitizePhoneNumber } from "@/lib/utils";
import { getCollection, saveDocument, deleteDocument, getDocument } from "@/services/firestore";
import Image from 'next/image';

export type EditableOrder = {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerAddress: string;
  pincode: string;
  contactNo: string;
  productOrdered: string;
  quantity: number;
  size?: string;
  color?: string;
  price: string;
  paymentStatus: string;
  date: string;
  sellerId?: string;
  sellerName?: string;
  vendorId?: string;
  vendorName?: string;
  cancellationFee?: string;
  paymentMethod?: 'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery';
  // Fields from other tabs
  trackingNumber?: string;
  courierCompanyName?: string;
  deliveryStatus?: 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';
  estDelivery?: string;
  readyForDispatchDate?: string;
  cancellationId?: string;
  cancellationReason?: string;
  cancellationStatus?: 'Pending' | 'Processed' | 'Failed';
  refundAmount?: string;
  refundReason?: string;
  refundStatus?: 'Pending' | 'Processed' | 'Failed';
  source?: 'Shopify' | 'Manual' | 'Seller' | 'Catalogue' | 'SmartMagazine';
  // Guest vendor fields
  guestVendorName?: string;
  guestFulfillmentToken?: string;
  packageImageUrls?: string[];
  imageDataUris?: string[]; // Added for compatibility
  vendorPaymentReceived?: 'Yes' | 'No';
};

type PaymentInfo = {
    paymentId: string;
    orderId: string; 
    razorpayOrderId: string;
    signature: string;
    status: string;
    authorizedAt: string;
};


const TEST_ORDER_ID = '#TEST-1001';

export default function OrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingChargeId, setProcessingChargeId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAndSetOrders = useCallback(async () => {
    setLoading(true);
    try {
        const allOrders = await getCollection<EditableOrder>('orders');
        
        const sortedOrders = allOrders
            .filter(o => o.paymentStatus !== 'Intent Verified')
            .sort((a, b) => {
                 try {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                } catch(e) { return 0; }
            });
            
        setOrders(sortedOrders);

    } catch(error) {
        console.error("Failed to load orders:", error);
        toast({
            variant: 'destructive',
            title: "Error loading orders",
            description: "Could not load orders from Firestore.",
        });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string | number) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };

  const handleImagePaste = async (e: ClipboardEvent, orderId: string) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        setOrders(prevOrders => prevOrders.map(order =>
                            order.id === orderId ? { ...order, imageDataUris: [result] } : order
                        ));
                         toast({ title: "Image Pasted!", description: "Image added to the order. Remember to save." });
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
  };
  
  const handleSaveOrder = async (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;
    
    try {
        await saveDocument('orders', orderToSave, orderToSave.id);
        toast({
            title: "Changes Saved",
            description: `Order ${orderToSave?.orderId} has been updated.`,
        });
    } catch(e) {
         toast({
            variant: 'destructive',
            title: "Error Saving Order",
        });
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    try {
        await deleteDocument('orders', orderId);
        setOrders(prev => prev.filter(order => order.id !== orderId));
        toast({
            variant: 'destructive',
            title: "Order Removed",
            description: "The order has been removed from the database.",
        });
    } catch(e) {
        toast({ variant: 'destructive', title: "Error Removing Order" });
    }
  };

  const sendWhatsAppNotification = (order: EditableOrder) => {
    let message = '';
    const secureUrl = `${window.location.origin}/secure-cod?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}`;

    if (order.paymentStatus === 'Pending') {
        message = `Hi ${order.customerName}! Thanks for your order #${order.orderId} from Snazzify. Please click this link to confirm your payment with our modern & secure COD process. Your funds are held in a Trust Wallet and only released on dispatch for 100% safety. ${secureUrl}`;
    } else if (order.deliveryStatus === 'dispatched' && order.trackingNumber) {
        message = `Great news, ${order.customerName}! Your Snazzify order #${order.orderId} has been shipped with ${order.courierCompanyName || 'our courier'}, tracking no. ${order.trackingNumber}. Your secure payment has now been finalized. Thank you for shopping with us!`;
    } else if (order.cancellationStatus === 'Processed' || order.paymentStatus === 'Voided') {
        message = `Hi ${order.customerName}, this confirms the cancellation of your Snazzify order #${order.orderId}. Your payment authorization has been voided. We hope to see you again!`;
    } else if (order.refundStatus === 'Processed' || order.paymentStatus === 'Refunded') {
        message = `Hi ${order.customerName}, your refund for order #${order.orderId} has been processed. You should see the amount in your account within 5-7 business days.`;
    } else {
        message = `Hi ${order.customerName}, this is a notification regarding your Snazzify order #${order.orderId}.`;
    }

    const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

    const handleQuickCapture = async (order: EditableOrder) => {
        setProcessingChargeId(order.id);
        const paymentInfo = await getDocument<PaymentInfo>('payment_info', order.orderId);
        
        if (!paymentInfo) {
            toast({
                variant: 'destructive',
                title: "Payment Info Not Found",
                description: `Cannot charge order ${order.orderId}. No payment authorization found. Please process from the Order Details page.`,
            });
            setProcessingChargeId(null);
            return;
        }
        
        try {
            const response = await fetch('/api/charge-mandate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: paymentInfo.paymentId,
                    amount: parseFloat(order.price)
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to charge payment.');

            const updatedOrder = {...order, paymentStatus: 'Paid'};
            await saveDocument('orders', updatedOrder, order.id);
            setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

            toast({
                title: "Charge Successful!",
                description: `Successfully charged ₹${order.price} for order ${order.orderId}.`,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Charge Failed",
                description: error.message,
            });
        } finally {
            setProcessingChargeId(null);
        }
    };

  return (
    <AppShell title="All Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>View and manage all orders. Click an Order ID to see full details.</CardDescription>
            </div>
             <div className="flex gap-2">
                <Link href="/orders/new">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Order
                </Button>
                </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source / Actors</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                    const isAuthorized = order.paymentStatus === 'Authorized';
                    const isProcessing = processingChargeId === order.id;
                    const imageUrl = order.imageDataUris?.[0];

                    return (
                        <TableRow key={order.id} onPaste={(e) => handleImagePaste(e, order.id)}>
                            <TableCell>
                                <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline cursor-pointer">
                                    {order.orderId}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                   {imageUrl ? (
                                        <Image src={imageUrl} alt={order.productOrdered} width={40} height={40} className="rounded-md object-cover aspect-square"/>
                                    ) : (
                                        <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center p-1">Paste Image Here</div>
                                    )}
                                    <span className="font-medium max-w-xs truncate">{order.productOrdered}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Input 
                                    value={order.customerName} 
                                    onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)} 
                                    className="w-40 h-8"
                                />
                            </TableCell>
                            <TableCell>
                                <Input 
                                    value={order.price} 
                                    onChange={(e) => handleFieldChange(order.id, 'price', e.target.value)} 
                                    className="w-24 h-8" 
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <Input 
                                        value={order.paymentStatus} 
                                        onChange={(e) => handleFieldChange(order.id, 'paymentStatus', e.target.value)} 
                                        className="w-32 h-8" 
                                    />
                                    {order.cancellationStatus === 'Processed' && (
                                        <Badge variant="destructive" className="w-fit"><Ban className="mr-1 h-3 w-3"/>Cancelled</Badge>
                                    )}
                                    {order.refundStatus === 'Processed' && (
                                        <Badge variant="destructive" className="w-fit"><CircleDollarSign className="mr-1 h-3 w-3"/>Refunded</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Input 
                                    type="date" 
                                    value={order.date ? format(new Date(order.date), 'yyyy-MM-dd') : ''} 
                                    onChange={(e) => handleFieldChange(order.id, 'date', e.target.value)} 
                                    className="w-32 h-8" 
                                />
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    {order.vendorName && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Factory className="h-3 w-3" /> {order.vendorName}
                                        </div>
                                    )}
                                    {order.sellerName && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Store className="h-3 w-3" /> {order.sellerName}
                                        </div>
                                    )}
                                    {!order.sellerName && !order.vendorName && (
                                         <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Store className="h-3 w-3" /> Snazzify
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-center space-x-2">
                                {isAuthorized && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="outline" disabled={isProcessing} title="Capture Payment">
                                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Capture Payment for {order.orderId}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will charge the customer's authorized card for the full amount of ₹{order.price}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleQuickCapture(order)}>Yes, Charge Now</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Button 
                                    variant="secondary" 
                                    size="icon" 
                                    onClick={() => sendWhatsAppNotification(order)}
                                    disabled={!order.contactNo}
                                    title="Notify on WhatsApp"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleSaveOrder(order.id)}>
                                    <Save className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
