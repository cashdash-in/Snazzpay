'use client';

import { useState, useEffect, DragEvent, ClipboardEvent } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PackagePlus, ImagePlus, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { createProductFromText } from '@/ai/flows/create-product-from-text';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProductDrop } from '@/types/product';

const PRODUCT_DROP_LIMIT = 50;
const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing

export default function VendorProductDropsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isPasting, setIsPasting] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [sizes, setSizes] = useState('');
    const [colors, setColors] = useState('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [resizedImageDataUris, setResizedImageDataUris] = useState<string[]>([]);
    const [usageCount, setUsageCount] = useState(0);
    const [limit, setLimit] = useState(PRODUCT_DROP_LIMIT);
    const [isLimitReached, setIsLimitReached] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [createdProduct, setCreatedProduct] = useState<ProductDrop | null>(null);
    const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<('Secure COD' | 'Cash on Delivery' | 'Prepaid')[]>(['Secure COD', 'Cash on Delivery', 'Prepaid']);
    const [isEastIndianLugra, setIsEastIndianLugra] = useState(false);
    const [isTryOnEnabled, setIsTryOnEnabled] = useState(false);

    const handlePaymentMethodChange = (method: 'Secure COD' | 'Cash on Delivery' | 'Prepaid', checked: boolean) => {
        setAllowedPaymentMethods(prev => {
            if (checked) {
                return [...prev, method];
            } else {
                return prev.filter(m => m !== method);
            }
        });
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
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };
    
    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileArray.length === 0) return;

        toast({ title: 'Processing images...', description: 'Resizing and compressing images before upload.' });
        
        const newPreviews: string[] = [];
        const newDataUris: string[] = [];

        for (const file of fileArray) {
            const resizedDataUri = await resizeImage(file);
            newPreviews.push(resizedDataUri);
            newDataUris.push(resizedDataUri);
        }
        
        setImagePreviews(prev => [...prev, ...newPreviews]);
        setResizedImageDataUris(prev => [...prev, ...newDataUris]);
        
        toast({ title: 'Images added!', description: 'The compressed images have been added.' });
    }


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
           handleFiles(files);
        }
    };
    
    const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const pastedText = event.clipboardData?.getData('text');
      if (event.clipboardData.files.length > 0) {
        event.preventDefault();
        handleFiles(event.clipboardData.files);
        toast({ title: 'Image(s) Pasted!' });
        return;
      }
      if (!pastedText) {
          const items = event.clipboardData?.items;
          if (!items) return;
          const files = [];
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) files.push(file);
            }
          }
          if(files.length > 0) {
            event.preventDefault();
            handleFiles(files);
            toast({ title: 'Image(s) Pasted!' });
          }
      }
    };
    
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files) {
            handleFiles(files);
            toast({ title: 'Image(s) Dropped!' });
        }
    };
    
    useEffect(() => {
        async function checkUsage() {
            if (user) {
                const role = getCookie('userRole');
                if (role === 'admin') {
                    setIsLimitReached(false);
                    setLimit(Infinity);
                    return;
                }
                const permissions = await getDocument<{productDropLimit?: number}>('user_permissions', user.uid);
                const currentLimit = permissions?.productDropLimit || PRODUCT_DROP_LIMIT;
                setLimit(currentLimit);
                const drops = await getCollection<ProductDrop>('product_drops');
                const count = drops.filter(d => d.vendorId === user.uid).length;
                setUsageCount(count);
                setIsLimitReached(count >= currentLimit);
            }
        }
        checkUsage();
    }, [user]);
    
    const handleSendDrop = async () => {
        if (!title || !description || !costPrice || resizedImageDataUris.length === 0) {
            toast({ variant: 'destructive', title: 'Missing Information' });
            return;
        }
        if (!user) return;
        if (isLimitReached) return;

        setIsLoading(true);
        const newDrop: ProductDrop = {
            id: uuidv4(),
            vendorId: user.uid,
            vendorName: user.displayName || 'Unknown Vendor',
            title,
            description,
            costPrice: parseFloat(costPrice),
            imageDataUris: resizedImageDataUris,
            createdAt: new Date().toISOString(),
            sizes: sizes.split(',').map(s => s.trim()).filter(s => s),
            colors: colors.split(',').map(c => c.trim()).filter(c => c),
            allowedPaymentMethods,
            isEastIndianLugra,
            isTryOnEnabled,
        };

        try {
            await saveDocument('product_drops', newDrop, newDrop.id);
            setUsageCount(prev => prev + 1);
            setCreatedProduct(newDrop);
            setShowShareDialog(true);
            setTitle(''); setDescription(''); setCostPrice(''); setSizes(''); setColors(''); setImagePreviews([]); setResizedImageDataUris([]); setIsEastIndianLugra(false); setIsTryOnEnabled(false);
            toast({ title: 'Product Drop Sent!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Send Drop' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.trim().length < 10 || e.clipboardData.files.length > 0) return;
        e.preventDefault();
        e.stopPropagation();
        setIsPasting(true);
        try {
            const result = await createProductFromText({ text: pastedText });
            setTitle(result.title);
            setDescription(result.description);
            toast({ title: "AI Parsing Complete!" });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'AI Parsing Failed' });
        } finally {
            setIsPasting(false);
        }
    };

    return (
        <AppShell title="Create Product Drop">
             {isLimitReached && (
                <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto">
                    <AlertTitle>Feature Limit Reached</AlertTitle>
                    <AlertDescription>You have reached your limit of {limit} product drops.</AlertDescription>
                </Alert>
            )}
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>New Product Drop</CardTitle>
                    <CardDescription>Share a new product with your network of sellers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative space-y-2">
                        <Label htmlFor="magic-paste">Magic Paste Box (AI-Powered)</Label>
                        {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                        <Textarea id="magic-paste" placeholder="Paste product details here..." onPaste={handleMagicPaste} className="bg-purple-50/50 border-purple-200" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Product Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Product Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="costPrice">Your Cost Price (INR)</Label>
                            <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="lugra-check" checked={isEastIndianLugra} onCheckedChange={(val) => setIsEastIndianLugra(val as boolean)} />
                                <Label htmlFor="lugra-check" className="flex items-center gap-1 font-bold text-primary">
                                    <ShieldCheck className="h-4 w-4" /> Is East Indian Lugra?
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="tryon-check" checked={isTryOnEnabled} onCheckedChange={(val) => setIsTryOnEnabled(val as boolean)} />
                                <Label htmlFor="tryon-check" className="flex items-center gap-1 font-bold text-indigo-600">
                                    <Sparkles className="h-4 w-4" /> Enable Virtual Try-On
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                            <Input id="sizes" value={sizes} onChange={(e) => setSizes(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="colors">Colors (comma-separated)</Label>
                            <Input id="colors" value={colors} onChange={(e) => setColors(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Allowed Payment Methods</Label>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="secure-cod" onCheckedChange={(checked) => handlePaymentMethodChange('Secure COD', checked as boolean)} checked={allowedPaymentMethods.includes('Secure COD')} />
                                <Label htmlFor="secure-cod">Secure COD</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="cod" onCheckedChange={(checked) => handlePaymentMethodChange('Cash on Delivery', checked as boolean)} checked={allowedPaymentMethods.includes('Cash on Delivery')} />
                                <Label htmlFor="cod">Cash on Delivery</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="prepaid" onCheckedChange={(checked) => handlePaymentMethodChange('Prepaid', checked as boolean)} checked={allowedPaymentMethods.includes('Prepaid')} />
                                <Label htmlFor="prepaid">Prepaid</Label>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Product Images</Label>
                          <div className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('product-image-input')?.click()}>
                              <div className="text-center">
                                <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">Click or drag images</p>
                              </div>
                          </div>
                          <Input id="product-image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" multiple />
                        {imagePreviews.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                                {imagePreviews.map((src, index) => <Image key={index} src={src} alt="p" width={150} height={150} className="object-contain aspect-square"/>)}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                     <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                        <Button className="w-full" onClick={handleSendDrop} disabled={isLoading || isLimitReached || !title || !description || resizedImageDataUris.length === 0}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isLimitReached ? <Lock className="mr-2 h-4 w-4"/> : <PackagePlus className="mr-2 h-4 w-4"/>}
                            {isLimitReached ? 'Limit Reached' : 'Create & Share Product Drop'}
                        </Button>
                         {createdProduct && <ShareComposerDialog product={createdProduct} />}
                    </Dialog>
                </CardFooter>
            </Card>
        </AppShell>
    );
}
