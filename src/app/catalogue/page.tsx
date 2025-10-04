
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShoppingCart, User, Phone, Mail as MailIcon, Home, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveDocument } from '@/services/firestore';
import type { EditableOrder } from '@/app/orders/page';
import { v4 as uuidv4 } from 'uuid';

type CustomerDetails = {
    name: string;
    email: string;
    contact: string;
    address: string;
    pincode: string;
};

function CatalogueOrderPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState({
        id: '',
        title: 'Product',
        description: 'No description available.',
        price: 0,
        image: 'https://placehold.co/600x400',
        sellerName: 'Snazzify',
        sellerId: '',
        sizes: [] as string[],
        colors: [] as string[],
    });

    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery'>('Secure Charge on Delivery');
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);


    useEffect(() => {
        const productData = {
            id: searchParams.get('id') || '',
            title: searchParams.get('title') || 'Product',
            description: searchParams.get('description') || 'No description available.',
            price: parseFloat(searchParams.get('price') || '0'),
            image: searchParams.get('image') || 'https://placehold.co/600x400',
            sellerName: searchParams.get('sellerName') || 'Snazzify',
            sellerId: searchParams.get('sellerId') || '',
            sizes: searchParams.get('sizes')?.split(',') || [],
            colors: searchParams.get('colors')?.split(',') || [],
        };
        setProduct(productData);
        setTotalPrice(productData.price);
    }, [searchParams]);

    useEffect(() => {
        setTotalPrice(product.price * quantity);
    }, [quantity, product.price]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, contact, address, pincode } = customerDetails;
        
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out your name, contact, address, and pincode." });
            return;
        }

        setIsSubmitting(true);
        const leadId = uuidv4();
        const newLead: EditableOrder = {
            id: leadId,
            orderId: `#SMRT-${Math.floor(1000 + Math.random() * 9000)}`,
            customerName: name,
            customerEmail: customerDetails.email,
            customerAddress: address,
            pincode,
            contactNo: contact,
            productOrdered: product.title,
            quantity,
            size: selectedSize,
            color: selectedColor,
            price: totalPrice.toString(),
            date: new Date().toISOString(),
            paymentStatus: 'Lead',
            paymentMethod,
            source: 'Catalogue',
            sellerId: product.sellerId,
            sellerName: product.sellerName,
        };

        try {
            await saveDocument('leads', newLead, leadId);
            toast({
                title: 'Order Request Sent!',
                description: `The seller, ${product.sellerName}, has received your request and will contact you shortly to confirm.`,
            });
            router.push('/customer/login'); // Redirect to a confirmation or login page
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
            setIsSubmitting(false);
        }
    };


    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                 <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold">{product.title}</CardTitle>
                        <CardDescription>Order from {product.sellerName}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                             <Image
                                src={product.image}
                                alt={product.title}
                                width={500}
                                height={500}
                                className="rounded-lg object-cover w-full aspect-square shadow-md"
                            />
                            <div>
                                <h3 className="font-semibold text-lg">Product Description</h3>
                                <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg">Your Details</h3>
                                <div className="space-y-4 mt-2">
                                     <div className="space-y-2">
                                         <Label htmlFor="name">Full Name</Label>
                                         <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="pl-9" /></div>
                                    </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="contact">Contact Number</Label>
                                         <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="contact" type="tel" required value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="pl-9" /></div>
                                    </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="email">Email Address</Label>
                                         <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" value={customerDetails.email} onChange={e => setCustomerDetails({...customerDetails, email: e.target.value})} className="pl-9" /></div>
                                    </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="address">Full Delivery Address</Label>
                                         <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="address" required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="pl-9" /></div>
                                    </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="pincode">Pincode</Label>
                                         <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="pincode" required value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="pl-9" /></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} min="1"/>
                                    </div>
                                    {product.sizes.length > 0 && (
                                         <div className="space-y-2">
                                            <Label htmlFor="size">Size</Label>
                                            <Select onValueChange={setSelectedSize} value={selectedSize}><SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger><SelectContent>{product.sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    )}
                                     {product.colors.length > 0 && (
                                        <div className="space-y-2">
                                            <Label htmlFor="color">Color</Label>
                                            <Select onValueChange={setSelectedColor} value={selectedColor}><SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger><SelectContent>{product.colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    )}
                                </div>
                                <div className="text-3xl font-bold">
                                    Total: ₹{totalPrice.toFixed(2)}
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <Label>Payment Method</Label>
                                <RadioGroup defaultValue="Secure Charge on Delivery" onValueChange={(value: 'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery') => setPaymentMethod(value)} className="flex flex-wrap gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Prepaid" id="r1" /><Label htmlFor="r1">Prepaid</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Secure Charge on Delivery" id="r2" /><Label htmlFor="r2">Secure COD</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Cash on Delivery" id="r3" /><Label htmlFor="r3">Cash on Delivery</Label></div>
                                </RadioGroup>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                            Place Order Request
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default function CatalogueOrderPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <CatalogueOrderPageContent />
        </Suspense>
    );
}
