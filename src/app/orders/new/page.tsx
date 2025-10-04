
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
import { saveDocument } from '@/services/firestore';
import type { EditableOrder } from '../page';

export default function NewOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState({
        orderId: `MANUAL-${uuidv4().substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
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
        paymentStatus: 'Pending',
        date: format(new Date(), 'yyyy-MM-dd'),
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setOrder(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (value: string) => {
        setOrder(prev => ({ ...prev, paymentStatus: value }));
    };
    
    const handleSave = async () => {
        const id = uuidv4();
        const newOrder: EditableOrder = {
            ...order,
            id,
            source: 'Manual'
        };
        
        try {
            await saveDocument('orders', newOrder, id);
            toast({
                title: "Order Created",
                description: "The new order has been saved successfully.",
            });
            router.push('/orders');
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Error Creating Order",
                description: "Could not save the order to the database.",
            });
        }
    };

    return (
        <AppShell title="Create New Order">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-4'>
                            <Link href="/orders">
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
                        <Label htmlFor="paymentStatus">Payment Status</Label>
                        <Select value={order.paymentStatus} onValueChange={handleSelectChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Intent Verified">Intent Verified</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Refunded">Refunded</SelectItem>
                            <SelectItem value="Authorized">Authorized</SelectItem>
                            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                            <SelectItem value="Voided">Voided</SelectItem>
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
