

'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2, MessageSquare, Send, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/app/orders/page';
import { Badge } from "@/components/ui/badge";
import { sanitizePhoneNumber } from "@/lib/utils";
import { getCollection, saveDocument, deleteDocument } from "@/services/firestore";
import Image from 'next/image';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSellerOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allOrders = await getCollection<EditableOrder>('orders');
      const sellerOrders = allOrders.filter(o => o.sellerId === user.uid);
      setOrders(sellerOrders);

    } catch (error) {
      console.error("Failed to load seller orders:", error);
      toast({
        variant: 'destructive',
        title: "Error loading your orders",
        description: "Could not load orders from Firestore.",
      });
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    fetchSellerOrders();
  }, [fetchSellerOrders]);

  const handleRemoveOrder = async (orderId: string) => {
    if (!user) return;
    try {
        await deleteDocument('orders', orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        toast({
            variant: 'destructive',
            title: "Order Removed",
            description: "The order has been removed successfully.",
        });
    } catch(e) {
         toast({ variant: 'destructive', title: "Error Removing Order" });
    }
  };
  
  const handlePushToVendor = async (orderToPush: EditableOrder) => {
    if (!user) return;
    
    // The vendorId should already be on the order object when it was created
    const vendorId = orderToPush.vendorId;
    
    if (!vendorId) {
        toast({
            variant: 'destructive',
            title: "Vendor Not Assigned",
            description: "This order doesn't have a vendor assigned. Please contact admin.",
        });
        return;
    }

    try {
        const orderForVendor = { ...orderToPush, vendorId: vendorId };
        await saveDocument('vendor_orders', orderForVendor, orderToPush.id);

        const updatedOrder = { ...orderToPush, paymentStatus: 'Pushed to Vendor' };
        await saveDocument('orders', { paymentStatus: 'Pushed to Vendor' }, orderToPush.id);
        
        setOrders(prev => prev.map(o => o.id === orderToPush.id ? updatedOrder : o));

        toast({
            title: "Order Pushed to Vendor!",
            description: `${orderToPush.orderId} has been sent for fulfillment.`,
        });

    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: "Failed to Push Order",
            description: e.message || "Could not push the order to the vendor.",
        });
    }
  };

  const handleSendPaymentLink = (order: EditableOrder, method: 'whatsapp' | 'email') => {
    const baseUrl = `${window.location.origin}/payment`;
    const finalUrl = `${baseUrl}?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.id)}&seller_id=${user?.uid}&prepaid=true`;
    const message = `Hi ${order.customerName}, your order for "${order.productOrdered}" (₹${order.price}) is ready. Please complete your payment securely using this link: ${finalUrl}`;
      
    if (method === 'whatsapp') {
      if (!order.contactNo) {
        toast({ variant: 'destructive', title: 'Customer Contact Missing' });
        return;
      }
      const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else { // email
      if (!order.customerEmail) {
        toast({ variant: 'destructive', title: 'Customer Email Missing' });
        return;
      }
      handleSendEmail(order);
    }
  };

  const handleSendEmail = async (order: EditableOrder) => {
    setProcessingId(order.id);
    try {
      const response = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: order.price,
          customerName: order.customerName,
          customerContact: order.contactNo,
          customerEmail: order.customerEmail,
          orderId: order.orderId,
          productName: order.productOrdered
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({
        title: "Email Sent!",
        description: result.message
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Failed to Send Email",
        description: error.message
      });
    } finally {
      setProcessingId(null);
    }
  }


  return (
    <AppShell title="My Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>My Orders</CardTitle>
              <CardDescription>Add new orders and track their status as they are processed by the admin.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href="/seller/orders/new">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Order
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
                    <TableHead>Product(s)</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const isCOD = (order as any).paymentMethod === 'Cash on Delivery';
                      const canPush = (order.paymentStatus === 'Paid' || order.paymentStatus === 'Authorized' || isCOD);
                      const imageUrl = order.imageDataUris?.[0];

                      return (
                        <TableRow key={order.id}>
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
                                        <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">No Img</div>
                                    )}
                                    <span className="font-medium max-w-xs truncate">{order.productOrdered}</span>
                                </div>
                            </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>₹{order.price}</TableCell>
                           <TableCell>
                            <Badge variant={isCOD ? "secondary" : "outline"}>{(order as any).paymentMethod || 'Prepaid'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={canPush || order.paymentStatus === "Pushed to Vendor" ? 'default' : 'secondary'} className={
                                order.paymentStatus === 'Paid' || order.paymentStatus === 'Authorized' ? 'bg-green-100 text-green-800' :
                                order.paymentStatus === 'Pushed to Vendor' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }>
                                {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                              {canPush && (
                                  <Button size="sm" onClick={() => handlePushToVendor(order)} disabled={order.paymentStatus === 'Pushed to Vendor'}>
                                      <Send className="mr-2 h-4 w-4" /> {order.paymentStatus === 'Pushed to Vendor' ? 'Pushed' : 'Push to Vendor'}
                                  </Button>
                              )}
                              {!isCOD && (
                                <>
                                  <Button variant="secondary" size="sm" onClick={() => handleSendPaymentLink(order, 'whatsapp')}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleSendEmail(order)} disabled={!order.customerEmail || processingId === order.id}>
                                    {processingId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                                  </Button>
                                </>
                              )}
                            <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        You haven't added any orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
