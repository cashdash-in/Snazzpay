
'use client';

import { useState, DragEvent, ClipboardEvent } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PackagePlus, Wand2, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { createProductFromText } from '@/ai/flows/create-product-from-text';
import { saveDocument } from '@/services/firestore';


export default function AdminProductDropsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isPasting, setIsPasting] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageDataUris, setImageDataUris] = useState<string[]>([]);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [createdProduct, setCreatedProduct] = useState<ProductDrop | null>(null);
    
    const handleFiles = (files: FileList | File[]) => {
        const newPreviews: string[] = [];
        const newDataUris: string[] = [];
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                newPreviews.push(result);
                newDataUris.push(result);

                if (newPreviews.length === Array.from(files).filter(f => f.type.startsWith('image/')).length) {
                    setImagePreviews(prev => [...prev, ...newPreviews]);
                    setImageDataUris(prev => [...prev, ...newDataUris]);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            handleFiles(files);
        }
    };

    const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
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
    };
    
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files) {
            handleFiles(files);
            toast({ title: 'Image(s) Dropped!', description: 'The image has been added to your product.' });
        }
    };
    
    const handleSendDrop = async () => {
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
            vendorId: 'admin_snazzify', // Special ID for admin drops
            vendorName: 'Snazzify Official',
            title,
            description,
            costPrice: parseFloat(costPrice),
            imageDataUris,
            createdAt: new Date().toISOString(),
        };

        try {
            await saveDocument('product_drops', newDrop, newDrop.id);
            
            toast({
                title: 'Product Drop Sent!',
                description: 'Your new product has been made available to all sellers in the network.',
            });
            
            setCreatedProduct(newDrop);
            setShowShareDialog(true);

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

    const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.trim().length < 10) return;

        // Prevent the image paste handler from also firing
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
        <AppShell title="Create Admin Product Drop">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>New Admin Product Drop</CardTitle>
                    <CardDescription>
                        Share a new product with the entire seller network. This is useful for general promotions or products sourced directly by Snazzify.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative space-y-2">
                        <Label htmlFor="magic-paste">Magic Paste Box (AI-Powered)</Label>
                        {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                        <Textarea 
                            id="magic-paste"
                            placeholder="Paste a WhatsApp chat or raw product text here and watch the AI fill the fields below..."
                            onPaste={handleMagicPaste}
                            className="bg-purple-50/50 border-purple-200 focus-visible:ring-purple-400"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Product Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Special Edition Snazzify T-Shirt"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Product Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Include all product details for sellers." rows={5}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="costPrice">Cost Price for Sellers (INR)</Label>
                        <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g., 199"/>
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
                        <Button className="w-full" onClick={handleSendDrop} disabled={isLoading || !title || !description || imageDataUris.length === 0}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackagePlus className="mr-2 h-4 w-4"/>}
                            Create & Share Product Drop
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
