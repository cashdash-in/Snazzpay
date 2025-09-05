
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
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '@/app/orders/page';
import { useAuth } from '@/hooks/use-auth';


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
        price: '0.00',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setOrder(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSave = () => {
        if (!user) {
            toast({ variant: 'destructive', title: "Not Authenticated", description: "You must be logged in to create an order." });
            return;
        }

        const newOrder: EditableOrder = {
            id: uuidv4(), // Unique ID for the order itself
            ...order,
            quantity: Number(order.quantity),
            date: format(new Date(), 'yyyy-MM-dd'),
            paymentStatus: 'Pending', // All seller orders start as pending for admin processing
            source: 'Seller', // Identify the order source
        };
        
        const existingOrdersJSON = localStorage.getItem('seller_orders');
        const existingOrders: EditableOrder[] = existingOrdersJSON ? JSON.parse(existingOrdersJSON) : [];
        const updatedOrders = [...existingOrders, newOrder];
        localStorage.setItem('seller_orders', JSON.stringify(updatedOrders));

        toast({
            title: "Order Submitted to Admin",
            description: "Your new order has been sent for processing.",
        });

        router.push('/seller/orders');
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
                                <CardDescription>Enter the details for your COD order to be processed by our Secure system.</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="orderId">Order ID</Label>
                        <Input id="orderId" value={order.orderId} onChange={handleInputChange} placeholder="A unique ID for your order" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input id="customerName" value={order.customerName} onChange={handleInputChange} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNo">Customer Contact No.</Label>
                        <Input id="contactNo" value={order.contactNo} onChange={handleInputChange} placeholder="9876543210" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerEmail">Customer Email (Optional)</Label>
                        <Input id="customerEmail" type="email" value={order.customerEmail} onChange={handleInputChange} placeholder="customer@example.com" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input id="pincode" value={order.pincode} onChange={handleInputChange} placeholder="400001" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="customerAddress">Customer Full Address</Label>
                        <Input id="customerAddress" value={order.customerAddress} onChange={handleInputChange} placeholder="123 Main St, Anytown" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="productOrdered">Product(s)</Label>
                        <Input id="productOrdered" value={order.productOrdered} onChange={handleInputChange} placeholder="e.g., T-Shirt, Mug" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" value={order.quantity} onChange={handleInputChange} min="1" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="price">Total Price (INR)</Label>
                        <Input id="price" value={order.price} onChange={handleInputChange} placeholder="999.00" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave}>Submit Order for Processing</Button>
                </CardFooter>
            </Card>
        </AppShell>
    );
}
