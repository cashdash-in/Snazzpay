

'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Trash2, PlusCircle, Save, Loader2 as ButtonLoader, Mail, Copy, MessageSquare, Facebook, Instagram, Store, Factory, ShoppingCart } from "lucide-react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { sanitizePhoneNumber } from "@/lib/utils";
import { getCollection, saveDocument, deleteDocument } from "@/services/firestore";
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";

type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';
const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing


export default function DeliveryTrackingPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingState, setSendingState] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchAndSetOrders = useCallback(async () => {
        setLoading(true);
        try {
            const allOrders = await getCollection<EditableOrder>('orders');
            const filteredOrders = allOrders.filter(o => o.paymentStatus !== 'Intent Verified');

            const sortedOrders = filteredOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setOrders(sortedOrders);

        } catch (error) {
            console.error("Failed to load orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading delivery data",
                description: "Could not load orders from Firestore.",
            });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchAndSetOrders();
    }, [fetchAndSetOrders]);

    const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string) => {
        const updatedOrders = orders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        );
        setOrders(updatedOrders);
    };

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    if (width > height) {
                        if (width > MAX_IMAGE_SIZE_PX) {
                            height *= MAX_IMAGE_SIZE_PX / width;
                            width = MAX_IMAGE_SIZE_PX;
                        }
                    } else {
                        if (height > MAX_IMAGE_SIZE_PX) {
                            width *= MAX_IMAGE_SIZE_PX / height;
                            height = MAX_IMAGE_SIZE_PX;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImagePaste = async (e: ClipboardEvent, orderId: string) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    const resizedDataUri = await resizeImage(file);
                    setOrders(prevOrders => prevOrders.map(order =>
                        order.id === orderId ? { ...order, imageDataUris: [resizedDataUri] } : order
                    ));
                    toast({ title: "Image Pasted & Resized!", description: "Image added. Click save to persist." });
                }
            }
        }
    };

    const handleSave = async (orderId: string) => {
        const orderToSave = orders.find(o => o.id === orderId);
        if (!orderToSave) return;
        
        try {
            await saveDocument('orders', orderToSave, orderToSave.id);
            toast({
                title: "Delivery Info Saved",
                description: `Details for order ${orderToSave.orderId} have been updated.`,
            });
        } catch(e) {
            toast({ variant: 'destructive', title: 'Error Saving' });
        }
    };
    
    const handleRemoveOrder = async (orderId: string) => {
        try {
            await deleteDocument('orders', orderId);
            setOrders(prev => prev.filter(order => order.id !== orderId));
            toast({
                variant: 'destructive',
                title: "Order Removed",
                description: "The order has been removed from delivery tracking.",
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error Removing Order',
                description: 'Could not remove order from the database.',
            });
        }
    };

    const sendAuthLink = async (order: EditableOrder, method: 'email') => {
        setSendingState(order.id);
        try {
            const response = await fetch('/api/send-auth-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, method }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast({
                title: "Link Sent Successfully!",
                description: result.message,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: `Error Sending Link`,
                description: error.message,
            });
        } finally {
            setSendingState(null);
        }
    };

    const getSecureUrl = (order: EditableOrder) => {
        const baseUrl = window.location.origin;
        const params = new URLSearchParams({
            amount: order.price,
            name: order.productOrdered,
            order_id: order.orderId,
        });

        if (order.size) {
            params.set('sizes', order.size);
        }
        if (order.color) {
            params.set('colors', order.color);
        }
        
        return `${baseUrl}/secure-cod?${params.toString()}`;
    };

    const copyAuthLink = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        navigator.clipboard.writeText(secureUrl);
        toast({
            title: "Link Copied!",
            description: "The secure COD authorization link has been copied to your clipboard.",
        });
    };
    
    const sendWhatsAppNotification = (order: EditableOrder) => {
        let message = '';
        if (order.deliveryStatus === 'dispatched' && order.trackingNumber) {
            message = `Great news, ${order.customerName}! Your Snazzify order #${order.orderId} has been shipped with ${order.courierCompanyName || 'our courier'}, tracking no. ${order.trackingNumber}.`;
        } else {
             const secureUrl = getSecureUrl(order);
             message = `Hi ${order.customerName}! Thanks for your order #${order.orderId} from Snazzify. Please click this link to confirm your payment with our modern & secure COD process. Your funds are held in a Trust Wallet and only released on dispatch for 100% safety. ${secureUrl}`;
        }
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${sanitizePhoneNumber(order.contactNo)}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const shareToFacebook = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(secureUrl)}`;
        window.open(facebookShareUrl, '_blank', 'width=600,height=400');
    };
    
    const shareToInstagram = (order: EditableOrder) => {
        const secureUrl = getSecureUrl(order);
        navigator.clipboard.writeText(secureUrl);
        toast({
            title: "Link Copied for Instagram!",
            description: "Paste this link into your Instagram message.",
        });
    };

  return (
    <AppShell title="Delivery Tracking">
      <Card>
        <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Delivery Management</CardTitle>
                    <CardDescription>Manage all orders, their delivery status, and send payment links. Click an Order ID to see full details.</CardDescription>
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
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Source / Actors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-[550px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                      const imageUrl = order.imageDataUris?.[0];
                      let sourceName = order.source || 'Manual';
                      if (sourceName === 'Catalogue') sourceName = 'Smart Magazine';


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
                            <span className="text-xs max-w-24 truncate">{order.productOrdered}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.customerName}
                            onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)}
                            className="w-40"
                            placeholder="Customer Name"
                        />
                      </TableCell>
                      <TableCell>
                          <Badge variant={order.paymentMethod === 'Cash on Delivery' ? 'secondary' : 'outline'}>
                            {order.paymentMethod || 'Prepaid'}
                          </Badge>
                      </TableCell>
                       <TableCell>
                         <div className="space-y-1 text-xs">
                           <div className="flex items-center gap-1 font-medium">
                                <ShoppingCart className="h-3 w-3" />
                                {sourceName}
                           </div>
                           {order.vendorName && (
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Factory className="h-3 w-3" /> {order.vendorName}
                                </div>
                            )}
                            {order.sellerName && (
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Store className="h-3 w-3" /> {order.sellerName}
                                </div>
                            )}
                            {sourceName === 'Manual' && !order.sellerName && !order.vendorName && (
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Store className="h-3 w-3" /> Snazzify
                                </div>
                            )}
                        </div>
                      </TableCell>
                       <TableCell>
                        <Select
                            value={order.deliveryStatus || 'pending'}
                            onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'deliveryStatus', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="failed">Delivery Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="secondary" size="sm" onClick={() => shareToFacebook(order)} title="Share to Facebook"><Facebook className="h-4 w-4" /></Button>
                        <Button variant="secondary" size="sm" onClick={() => shareToInstagram(order)} title="Copy Link for Instagram"><Instagram className="h-4 w-4" /></Button>
                        <Button variant="secondary" size="sm" onClick={() => sendWhatsAppNotification(order)} disabled={!order.contactNo} title={!order.contactNo ? "Contact number is required" : "Send WhatsApp Notification"}><MessageSquare className="h-4 w-4" /></Button>
                        <Button variant="default" size="sm" onClick={() => sendAuthLink(order, 'email')} disabled={sendingState === order.id || !order.customerEmail} title={!order.customerEmail ? "Customer email is required" : "Send Authorization Link via Email"}>
                          {sendingState === order.id ? <ButtonLoader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => copyAuthLink(order)} title="Copy Payment Link"><Copy className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => handleSave(order.id)} title="Save Changes"><Save className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)} title="Remove Order"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

    