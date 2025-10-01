
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, Trash2, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/app/orders/page';
import { Badge } from "@/components/ui/badge";
import { sanitizePhoneNumber } from "@/lib/utils";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSellerOrders = useCallback(() => {
    if (!user) return;
    setLoading(true);
    try {
      const allSellerOrdersJSON = localStorage.getItem('seller_orders');
      const allSellerOrders: EditableOrder[] = allSellerOrdersJSON ? JSON.parse(allSellerOrdersJSON) : [];
      
      const userSellerOrders = allSellerOrders.filter(o => o.sellerId === user.uid);
      
      const unifiedOrders = userSellerOrders.map(order => {
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
        return { ...order, ...storedOverrides };
      });
      
      setOrders(unifiedOrders);

    } catch (error) {
      console.error("Failed to load seller orders:", error);
      toast({
        variant: 'destructive',
        title: "Error loading your orders",
        description: "Could not load orders from local storage.",
      });
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    fetchSellerOrders();
  }, [fetchSellerOrders]);

  const handleRemoveOrder = (orderId: string) => {
    if (!user) return;
    const ordersStorageKey = `seller_orders`;
    let allOrders = JSON.parse(localStorage.getItem(ordersStorageKey) || '[]');
    allOrders = allOrders.filter((order: EditableOrder) => order.id !== orderId);
    localStorage.setItem(ordersStorageKey, JSON.stringify(allOrders));
    setOrders(prev => prev.filter(o => o.id !== orderId));
    
    toast({
        variant: 'destructive',
        title: "Order Removed",
        description: "The order has been removed successfully.",
    });
  };
  
  const handlePushToVendor = (orderToPush: EditableOrder) => {
    if (!user) return;
    
    const approvedSellersJSON = localStorage.getItem('approved_sellers');
    const approvedSellers = approvedSellersJSON ? JSON.parse(approvedSellersJSON) : [];
    const sellerInfo = approvedSellers.find((s: any) => s.id === user.uid);
    const vendorId = sellerInfo?.vendorId;
    
    if (!vendorId) {
        toast({
            variant: 'destructive',
            title: "Vendor Not Assigned",
            description: "You do not have a vendor assigned to your account. Please contact admin.",
        });
        return;
    }

    const vendorOrdersKey = `vendor_orders`;
    const vendorOrdersJSON = localStorage.getItem(vendorOrdersKey);
    let vendorOrders = vendorOrdersJSON ? JSON.parse(vendorOrdersJSON) : [];
    
    if (!vendorOrders.some((o: EditableOrder) => o.id === orderToPush.id)) {
        vendorOrders.push({ ...orderToPush, vendorId: vendorId });
        localStorage.setItem(vendorOrdersKey, JSON.stringify(vendorOrders));
    }

    const updatedSellerOrders = orders.map(o => 
        o.id === orderToPush.id ? { ...o, paymentStatus: 'Pushed to Vendor' } : o
    );
    setOrders(updatedSellerOrders);
    
    const sellerOrdersKey = `seller_orders`;
    const allSellerOrders = JSON.parse(localStorage.getItem(sellerOrdersKey) || '[]');
    const finalSellerOrders = allSellerOrders.map((o: EditableOrder) => o.id === orderToPush.id ? { ...o, paymentStatus: 'Pushed to Vendor' } : o);
    localStorage.setItem(sellerOrdersKey, JSON.stringify(finalSellerOrders));
    
    toast({
        title: "Order Pushed to Vendor!",
        description: `${orderToPush.orderId} has been sent for fulfillment.`,
    });
  };

  const handleShareOnWhatsApp = (order: EditableOrder) => {
    if (!order.contactNo) {
        toast({
            variant: 'destructive',
            title: 'Customer Contact Missing',
            description: 'Cannot share on WhatsApp without a customer phone number.'
        });
        return;
    }
    
    if (order.paymentMethod === 'Cash on Delivery') {
        toast({
            title: 'COD Order',
            description: 'This is a Cash on Delivery order. No payment link is needed.',
        });
        return;
    }
    
    const isPrepaid = order.paymentMethod === 'Prepaid';
    const baseUrl = `${window.location.origin}/payment`;
    const finalUrl = `${baseUrl}?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}&seller_id=${user?.uid}&prepaid=${isPrepaid}`;
    
    const message = `Hi ${order.customerName}, your order for "${order.productOrdered}" (₹${order.price}) is ready. Please complete your payment securely using this link: ${finalUrl}`;
    const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(order.contactNo)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

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
                    <TableHead>Customer</TableHead>
                    <TableHead>Product(s)</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const isCOD = order.paymentMethod === 'Cash on Delivery';
                      const canPush = (order.paymentStatus === 'Paid' || order.paymentStatus === 'Authorized' || isCOD);

                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline cursor-pointer">
                              {order.orderId}
                            </Link>
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{order.productOrdered}</TableCell>
                          <TableCell>₹{order.price}</TableCell>
                           <TableCell>
                            <Badge variant={isCOD ? "secondary" : "outline"}>{order.paymentMethod}</Badge>
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
                            <Button variant="secondary" size="sm" onClick={() => handleShareOnWhatsApp(order)} disabled={isCOD}>
                              <MessageSquare className="mr-2 h-4 w-4" /> Share
                            </Button>
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

    