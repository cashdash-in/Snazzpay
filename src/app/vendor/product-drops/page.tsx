
'use client';

import { useState, useEffect, DragEvent, ClipboardEvent } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PackagePlus, Lock, Wand2, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { createProductFromText } from '@/ai/flows/create-product-from-text';

export interface ProductDrop {
    id: string;
    vendorId: string;
    vendorName: string;
    title: string;
    description: string;
    costPrice: number;
    category?: string;
    imageDataUris: string[];
    createdAt: string;
}

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
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [resizedImageDataUris, setResizedImageDataUris] = useState<string[]>([]);
    const [usageCount, setUsageCount] = useState(0);
    const [limit, setLimit] = useState(PRODUCT_DROP_LIMIT);
    const [isLimitReached, setIsLimitReached] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [createdProduct, setCreatedProduct] = useState<ProductDrop | null>(null);

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
                    // Force JPEG format with 70% quality for significant size reduction
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
            newPreviews.push(URL.createObjectURL(file)); // Use blob URL for previews to save memory
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
    
    const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = event.clipboardData?.getData('text');
      // If clipboard contains files, let the image handler take it.
      if (event.clipboardData.files.length > 0) {
        event.preventDefault();
        handleFiles(event.clipboardData.files);
        toast({ title: 'Image(s) Pasted!', description: 'The image has been added to your product.' });
        return;
      }
      // If it's just text, let the default magic paste handler do its job (defined on the Textarea)
      if (!pastedText) {
          const items = event.clipboardData?.items;
          if (!items) return;
          const files = [];
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                files.push(file);
              }
            }
          }
          if(files.length > 0) {
            event.preventDefault();
            handleFiles(files);
            toast({ title: 'Image(s) Pasted!', description: 'The image has been added to your product.' });
          }
      }
    };
    
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files) {
            handleFiles(files);
            toast({ title: 'Image(s) Dropped!', description: 'The image has been added to your product.' });
        }
    };
    
    useEffect(() => {
        async function checkUsage() {
            if (user) {
                const role = getCookie('userRole');
                if (role === 'admin') {
                    setIsLimitReached(false);
                    setLimit(Infinity); // Admin has infinite limit
                    return;
                }

                const permissions = await getDocument<{productDropLimit?: number}>('user_permissions', user.uid);
                const currentLimit = permissions?.productDropLimit || PRODUCT_DROP_LIMIT;
                setLimit(currentLimit);

                const drops = await getCollection<ProductDrop>('product_drops');
                const vendorDrops = drops.filter(d => d.vendorId === user.uid);
                const count = vendorDrops.length;
                setUsageCount(count);
                setIsLimitReached(count >= currentLimit);
            }
        }
        checkUsage();
    }, [user]);
    
    const handleSendDrop = async () => {
        if (!title || !description || !costPrice || resizedImageDataUris.length === 0) {
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

        if (isLimitReached) {
            toast({
                variant: 'destructive',
                title: 'Product Drop Limit Reached',
                description: `You have used your quota of ${limit} product drops. Please contact the admin to upgrade.`,
            });
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
            imageDataUris: resizedImageDataUris, // Use resized data
            createdAt: new Date().toISOString(),
        };

        try {
            await saveDocument('product_drops', newDrop, newDrop.id);
            setUsageCount(prev => prev + 1);
            
            toast({
                title: 'Product Drop Sent!',
                description: 'Your new product has been made available to all sellers in your network.',
            });

            setCreatedProduct(newDrop);
            setShowShareDialog(true);
            
            // Reset form
            setTitle('');
            setDescription('');
            setCostPrice('');
            setImagePreviews([]);
            setResizedImageDataUris([]);

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

    const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
         // Check if clipboard contains files, if so, let the other handler take care of it.
        if (e.clipboardData.files.length > 0) {
            return;
        }
        if (pastedText.trim().length < 10) return;

        e.preventDefault();
        e.stopPropagation();

        setIsPasting(true);
        try {
            const result = await createProductFromText({ text: pastedText });
            setTitle(result.title);
            setDescription(result.description);
            toast({
                title: "AI Parsing Complete!",
                description: "Product title and description have been filled in.",
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'AI Parsing Failed',
                description: error.message || 'Could not process the pasted text.',
            });
        } finally {
            setIsPasting(false);
        }
    };


    return (
        <AppShell title="Create Product Drop">
             {isLimitReached && (
                <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto">
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Feature Limit Reached</AlertTitle>
                    <AlertDescription>
                        You have reached your limit of {limit} product drops. Please contact the administrator to upgrade your plan for a higher limit.
                    </AlertDescription>
                </Alert>
            )}
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>New Product Drop</CardTitle>
                    <CardDescription>
                        Share a new product with your network of sellers. It will automatically be added to your "My Products" page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative space-y-2">
                        <Label htmlFor="magic-paste">Magic Paste Box (AI-Powered)</Label>
                        {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                        <Textarea 
                            id="magic-paste"
                            placeholder="Paste a WhatsApp chat here to auto-fill the form."
                            onPaste={handleMagicPaste}
                            className="bg-purple-50/50 border-purple-200 focus-visible:ring-purple-400"
                        />
                    </div>
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
                        <Label>Product Images</Label>
                          <div 
                            className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50"
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => document.getElementById('product-image-input')?.click()}
                          >
                              <div className="text-center">
                                <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                              </div>
                          </div>
                           <Textarea 
                            placeholder="Or paste images here." 
                            onPaste={handlePaste} 
                            className="text-center placeholder:text-muted-foreground"
                            rows={2}
                          />
                          <Input
                            id="product-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            multiple
                          />
                        {imagePreviews.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                                {imagePreviews.map((src, index) => (
                                    <Image key={index} src={src} alt={`Preview ${index + 1}`} width={150} height={150} className="object-contain rounded-md aspect-square"/>
                                ))}
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
                         {createdProduct && (
                            <ShareComposerDialog product={createdProduct} />
                        )}
                    </Dialog>
                </CardFooter>
            </Card>
        </AppShell>
    );
}
