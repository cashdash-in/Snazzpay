
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

export default function NewOrderPage() {
    const router = useRouter();
    const [order, setOrder] = useState({
        orderId: '',
        customerName: '',
        customerAddress: '',
        pincode: '',
        contactNo: '',
        productOrdered: '',
        quantity: 1,
        price: '0.00',
        paymentStatus: 'Pending',
        date: format(new Date(), 'yyyy-MM-dd'),
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setOrder(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSave = () => {
        // Here you would typically save the order to your database.
        // For now, we'll just log it and navigate back.
        console.log("Saving order:", order);
        router.push('/orders');
    };

    return (
        <AppShell title="Create New Order">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-4'>
                            <Link href="/orders" passHref>
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <CardTitle>Create New Order</CardTitle>
                                <CardDescription>Manually enter the details for a new order.</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="orderId">Order ID</Label>
                        <Input id="orderId" value={order.orderId} onChange={handleInputChange} placeholder="#1005" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input id="customerName" value={order.customerName} onChange={handleInputChange} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="customerAddress">Address</Label>
                        <Input id="customerAddress" value={order.customerAddress} onChange={handleInputChange} placeholder="123 Main St, Anytown, USA" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input id="pincode" value={order.pincode} onChange={handleInputChange} placeholder="12345" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNo">Contact No.</Label>
                        <Input id="contactNo" value={order.contactNo} onChange={handleInputChange} placeholder="+1234567890" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="productOrdered">Product(s)</Label>
                        <Input id="productOrdered" value={order.productOrdered} onChange={handleInputChange} placeholder="T-Shirt, Mug" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" value={order.quantity} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" value={order.price} onChange={handleInputChange} placeholder="99.99" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="paymentStatus">Payment Status</Label>
                        <Input id="paymentStatus" value={order.paymentStatus} onChange={handleInputChange} />
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
