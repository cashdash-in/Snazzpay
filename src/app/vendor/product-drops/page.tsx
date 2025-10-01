
'use client';

import { useState } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, PackagePlus } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';

export interface ProductDrop {
    id: string;
    vendorId: string;
    vendorName: string;
    title: string;
    description: string;
    costPrice: number;
    imageDataUris: string[];
    createdAt: string;
}

export default function VendorProductDropsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageDataUris, setImageDataUris] = useState<string[]>([]);
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newPreviews: string[] = [];
            const newDataUris: string[] = [];
            Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    newPreviews.push(result);
                    newDataUris.push(result);

                    if (newPreviews.length === files.length) {
                        setImagePreviews(prev => [...prev, ...newPreviews]);
                        setImageDataUris(prev => [...prev, ...newDataUris]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const handleSendDrop = () => {
        if (!title || !description || !costPrice || imageDataUris.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill out all fields and upload at least one image.',
            });
            return;
        }
        if (!user) {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create a drop.' });
            return;
        }

        setIsLoading(true);

        const newDrop: ProductDrop = {
            id: uuidv4(),
            vendorId: user.uid,
            vendorName: user.displayName || 'Unknown Vendor',
            title,
            description,
            costPrice: parseFloat(costPrice),
            imageDataUris,
            createdAt: new Date().toISOString(),
        };

        try {
            const existingDrops = JSON.parse(localStorage.getItem('product_drops') || '[]');
            localStorage.setItem('product_drops', JSON.stringify([newDrop, ...existingDrops]));
            
            toast({
                title: 'Product Drop Sent!',
                description: 'Your new product has been made available to all sellers in your network.',
            });

            // Reset form
            setTitle('');
            setDescription('');
            setCostPrice('');
            setImagePreviews([]);
            setImageDataUris([]);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Drop',
                description: error.message || 'An error occurred while saving the product drop.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppShell title="Create Product Drop">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>New Product Drop</CardTitle>
                    <CardDescription>
                        Share a new product with your network of sellers. They will be able to see this information and start selling.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Product Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Premium Cotton Summer T-Shirt"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Product Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Include details like material, available sizes, colors, and key features." rows={5}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="costPrice">Your Cost Price (INR)</Label>
                        <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g., 250"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="product-images">Product Images</Label>
                        <Input id="product-images" type="file" accept="image/*" onChange={handleImageChange} multiple className="cursor-pointer"/>
                        {imagePreviews.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-4 p-4 border-dashed border-2 rounded-lg">
                                {imagePreviews.map((src, index) => (
                                    <Image key={index} src={src} alt={`Preview ${index + 1}`} width={150} height={150} className="object-contain rounded-md aspect-square"/>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSendDrop} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackagePlus className="mr-2 h-4 w-4"/>}
                        Send Product Drop to My Sellers
                    </Button>
                </CardFooter>
            </Card>
        </AppShell>
    );
}
