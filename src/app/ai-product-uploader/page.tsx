'use client';

import { useState, useEffect, DragEvent, ClipboardEvent } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProductListing } from '@/ai/flows/create-product-listing';
import { type ProductListingOutput } from '@/ai/schemas/product-listing';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Sparkles,
  Upload,
  Rocket,
  Wand2,
  CheckCircle,
  ImagePlus,
  Factory,
} from 'lucide-react';
import Image from 'next/image';
import { createProductFromText } from '@/ai/flows/create-product-from-text';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { ProductDrop } from '@/app/vendor/product-drops/page';

const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing


export default function AiProductUploaderPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [resizedImageDataUris, setResizedImageDataUris] = useState<string[]>([]);
  const [vendorDescription, setVendorDescription] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('100'); // Default 100% margin
  const [generatedListing, setGeneratedListing] =
    useState<ProductListingOutput | null>(null);
  const [vendorName, setVendorName] = useState('Snazzify AI');

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
          // For admin uploader, we can use the resized URI for preview directly
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


  const handleGenerateListing = async () => {
    if (
      resizedImageDataUris.length === 0 ||
      !vendorDescription ||
      !cost ||
      !margin
    ) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description:
          'Please provide at least one image, a description, cost, and margin.',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedListing(null);

    try {
      const result = await createProductListing({
        imageDataUris: resizedImageDataUris,
        description: vendorDescription,
        cost: parseFloat(cost),
        margin: parseFloat(margin),
      });
      setGeneratedListing(result);
      toast({
        title: 'Listing Generated!',
        description: 'Review the AI-generated details on the right.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description:
          error.message ||
          'An unexpected error occurred while generating the listing.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToShopify = async () => {
    if (!generatedListing) return;
    setIsPushing(true);

    try {
        const newProductDrop: ProductDrop = {
            id: uuidv4(),
            vendorId: 'admin_snazzify',
            vendorName: vendorName || 'Snazzify Official',
            title: generatedListing.title,
            description: generatedListing.description,
            costPrice: generatedListing.price,
            imageDataUris: resizedImageDataUris,
            createdAt: new Date().toISOString(),
            category: generatedListing.category,
            sizes: generatedListing.sizes,
            colors: generatedListing.colors,
        };

        await saveDocument('product_drops', newProductDrop, newProductDrop.id);

        const productData = {
            title: generatedListing.title,
            body_html: generatedListing.description,
            product_type: generatedListing.category,
            vendor: vendorName || 'Snazzify AI',
            variants: [{ price: generatedListing.price }],
             images: resizedImageDataUris.map(uri => ({ // Use resized data
                attachment: uri.split(',')[1] // Send base64 data only
            })),
        };
        
        const response = await fetch('/api/shopify/products/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || "An unknown error occurred while communicating with Shopify.");
        }
        
        toast({
            title: 'Product Pushed to Shopify!',
            description: `Successfully created "${result.product.title}" and saved it to "My Products".`,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Shopify Push Failed',
            description: error.message, // This will now show the more detailed error
        });
    } finally {
        setIsPushing(false);
    }
  };

  const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.trim().length < 10) return;

    // Prevent the image paste handler from also firing
    if (e.clipboardData.files.length > 0) return;

    e.preventDefault();
    e.stopPropagation();

    setIsPasting(true);
    try {
      const result = await createProductFromText({ text: pastedText });
      setVendorDescription(
        (prev) => prev + (prev ? '\n\n' : '') + result.description
      );
      toast({
        title: 'AI Parsing Complete!',
        description: 'Product description has been extracted from the pasted text.',
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
    <AppShell title="AI Product Uploader">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Provide Product Details</CardTitle>
            <CardDescription>
              Upload images and fill in the product details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="relative space-y-2">
                <Label htmlFor="magic-paste">Magic Paste Box (AI-Powered)</Label>
                {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                <Textarea
                    id="magic-paste"
                    placeholder="Paste a WhatsApp chat here to auto-fill title & description."
                    onPaste={handleMagicPaste}
                    className="bg-purple-50/50 border-purple-200 focus-visible:ring-purple-400"
                />
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
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg border p-4">
                  {imagePreviews.map((src, index) => (
                     <Image
                        key={index}
                        src={src}
                        alt={`Product preview ${index + 1}`}
                        width={150}
                        height={150}
                        className="object-contain rounded-md aspect-square"
                      />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-description">Vendor Description</Label>
              <Textarea
                id="vendor-description"
                placeholder="Paste raw text from WhatsApp, etc. e.g., 'Pure cotton shirt new stock full sleeves all sizes (M, L, XL) available colors red blue price 499 only'"
                value={vendorDescription}
                onChange={(e) => setVendorDescription(e.target.value)}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Your Cost (INR)</Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="e.g., 250"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin">Profit Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  placeholder="e.g., 100"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                 <div className="relative">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="vendorName" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g., Snazzify Official" className="pl-9"/>
                 </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleGenerateListing}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate Listing with AI
            </Button>
          </CardFooter>
        </Card>
        <Card
          className={
            !generatedListing && !isLoading ? 'flex items-center justify-center' : ''
          }
        >
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              <h3 className="text-xl font-semibold">AI is at work...</h3>
              <p className="text-muted-foreground">
                Analyzing your images and text to craft the perfect product
                listing. This might take a moment.
              </p>
            </div>
          )}
          {!isLoading && !generatedListing && (
             <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
                <Sparkles className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold text-muted-foreground">Generated Listing Will Appear Here</h3>
                <p className="text-muted-foreground">Fill out the details on the left and let AI do the rest.</p>
            </div>
          )}
          {generatedListing && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" />
                  2. Review & Push to Shopify
                </CardTitle>
                <CardDescription>
                  Your AI-generated listing is ready. Make any changes needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generated-title">Product Title</Label>
                  <Input
                    id="generated-title"
                    value={generatedListing.title}
                    onChange={(e) =>
                      setGeneratedListing((p) =>
                        p ? { ...p, title: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generated-description">
                    Product Description (Markdown enabled)
                  </Label>
                  <Textarea
                    id="generated-description"
                    value={generatedListing.description}
                    onChange={(e) =>
                      setGeneratedListing((p) =>
                        p ? { ...p, description: e.target.value } : null
                      )
                    }
                    rows={8}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="generated-sizes">Sizes</Label>
                    <Input
                      id="generated-sizes"
                      value={generatedListing.sizes.join(', ')}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generated-colors">Colors</Label>
                    <Input
                      id="generated-colors"
                      value={generatedListing.colors.join(', ')}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="generated-category">Category</Label>
                    <Input
                        id="generated-category"
                        value={generatedListing.category}
                        onChange={(e) =>
                        setGeneratedListing((p) =>
                            p ? { ...p, category: e.target.value } : null
                        )
                        }
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="generated-price">Selling Price (INR)</Label>
                    <Input
                        id="generated-price"
                        type="number"
                        value={generatedListing.price}
                        onChange={(e) =>
                        setGeneratedListing((p) =>
                            p
                            ? { ...p, price: parseFloat(e.target.value) || 0 }
                            : null
                        )
                        }
                    />
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button onClick={handlePushToShopify} className="w-full" disabled={isPushing}>
                  {isPushing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="mr-2 h-4 w-4" />
                  )}
                  Push to Shopify & Save to My Products
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
