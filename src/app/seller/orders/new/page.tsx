
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveDocument, getDocument } from '@/services/firestore';
import type { EditableOrder } from '../page';
import { useAuth } from '@/hooks/use-auth';
import type { SellerUser } from '@/app/seller-accounts/page';
import type { Vendor } from '@/app/vendors/page';


export default function NewSellerOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [order, setOrder] = useState({
        orderId: `#${Math.floor(Math.random() * 9000) + 1000}`,
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        pincode: '',
        contactNo: '',
        productOrdered: '',
        quantity: 1,
        size: '',
        color: '',
        price: '0.00',
        paymentMethod: 'Cash on Delivery' as EditableOrder['paymentMethod'],
        date: format(new Date(), 'yyyy-MM-dd'),
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setOrder(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (field: keyof typeof order, value: string) => {
        setOrder(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSave = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: "Authentication Error", description: "You must be logged in to create an order." });
            return;
        }

        try {
            const sellerDoc = await getDocument<SellerUser>('seller_users', user.uid);
            if (!sellerDoc || !sellerDoc.vendorId) {
                throw new Error("Your account is not configured with a vendor. Please contact admin.");
            }
            
            const id = uuidv4();
            const newOrder: EditableOrder = {
                ...order,
                id,
                sellerId: user.uid,
                vendorId: sellerDoc.vendorId, // Include vendor ID
                paymentStatus: 'Pending',
                source: 'Seller'
            };
        
            await saveDocument('orders', newOrder, id);
            toast({
                title: "Order Created",
                description: "The new order has been saved and is ready to be pushed to your vendor.",
            });

            // Send notification to vendor
            const vendor = await getDocument<Vendor>('vendors', sellerDoc.vendorId);
            if(vendor?.email) {
                await fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'internal_alert',
                        recipientEmail: vendor.email,
                        subject: `New Order from ${sellerDoc.companyName}`,
                        body: `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                                <h2>New Order Alert!</h2>
                                <p>Your seller, ${sellerDoc.companyName}, has created a new manual order for you to fulfill.</p>
                                <ul>
                                    <li><strong>Customer:</strong> ${newOrder.customerName}</li>
                                    <li><strong>Product:</strong> ${newOrder.productOrdered}</li>
                                    <li><strong>Value:</strong> ₹${newOrder.price}</li>
                                </ul>
                                <p>Please log in to your dashboard to view the full order details in the "Orders from Sellers" section.</p>
                            </div>
                        `
                    })
                });
            }

            router.push('/seller/orders');
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Error Creating Order",
                description: error.message || "Could not save the order to the database.",
            });
        }
    };

    return (
        <AppShell title="Add New Order">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-4'>
                            <Link href="/seller/orders">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <CardTitle>Add a New Order</CardTitle>
                                <CardDescription>Manually enter the details for a new order. It will be added to your order list for vendor fulfillment.</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="orderId">Order ID</Label>
                        <Input id="orderId" value={order.orderId} onChange={handleInputChange} placeholder="#1005" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input id="customerName" value={order.customerName} onChange={handleInputChange} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input id="customerEmail" type="email" value={order.customerEmail} onChange={handleInputChange} placeholder="customer@example.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNo">Contact No.</Label>
                        <Input id="contactNo" value={order.contactNo} onChange={handleInputChange} placeholder="+1234567890" />
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                        <Label htmlFor="customerAddress">Address</Label>
                        <Input id="customerAddress" value={order.customerAddress} onChange={handleInputChange} placeholder="123 Main St, Anytown, USA" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input id="pincode" value={order.pincode} onChange={handleInputChange} placeholder="12345" />
                    </div>
                    
                    <div className="space-y-2 lg:col-span-3">
                        <Label htmlFor="productOrdered">Product(s)</Label>
                        <Input id="productOrdered" value={order.productOrdered} onChange={handleInputChange} placeholder="T-Shirt, Mug" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" value={order.quantity} onChange={(e) => setOrder(p => ({...p, quantity: parseInt(e.target.value, 10)}))} min="1" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input id="size" value={order.size} onChange={handleInputChange} placeholder="e.g., L, 42" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <Input id="color" value={order.color} onChange={handleInputChange} placeholder="e.g., Blue" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" value={order.price} onChange={handleInputChange} placeholder="99.99" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select value={order.paymentMethod} onValueChange={(value) => handleSelectChange('paymentMethod', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                            <SelectItem value="Prepaid">Prepaid</SelectItem>
                            <SelectItem value="Secure Charge on Delivery">Secure Charge on Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" value={order.date} onChange={handleInputChange} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave}>Save Order</Button>
                </CardFooter>
            </Card>
        </AppShell>
    );
}
