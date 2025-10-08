
'use client';

import { useState, DragEvent, ChangeEvent, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Sparkles,
  Rocket,
  Wand2,
  ImagePlus,
  Factory,
  Book,
} from 'lucide-react';
import Image from 'next/image';
import { createProductDescription } from '@/ai/flows/create-product-description';
import { type ProductListingOutput } from '@/ai/schemas/product-listing';
import { v4 as uuidv4 } from 'uuid';
import { saveDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';

type GeneratedProduct = ProductListingOutput & {
  id: string;
  imageDataUri: string;
  vendorName?: string;
  costPrice?: number;
};

const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing

export default function ImageBulkUploaderPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedProducts, setGeneratedProducts] = useState<GeneratedProduct[]>([]);
  const [defaultVendor, setDefaultVendor] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    setImageFiles(prev => [...prev, ...fileArray]);

    const newPreviews: string[] = [];
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === fileArray.length) {
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
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

  const handleGenerateListings = async () => {
    if (imageFiles.length === 0) {
      toast({ variant: 'destructive', title: 'No Images Selected' });
      return;
    }
    setIsProcessing(true);
    setGeneratedProducts([]);

    const productPromises = imageFiles.map(async (file, index) => {
      try {
        const resizedDataUri = await resizeImage(file);
        const result = await createProductDescription({
          imageDataUri: resizedDataUri,
        });
        
        return {
          id: `gen-${index}-${Date.now()}`,
          imageDataUri: resizedDataUri,
          title: result.title,
          description: result.description,
          category: result.category,
          price: 0,
          costPrice: 0,
          sizes: [],
          colors: [],
          vendorName: defaultVendor || 'Snazzify AI',
        };
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: `Failed to process image ${index + 1}`,
          description: e.message,
        });
        return null;
      }
    });

    const results = (await Promise.all(productPromises)).filter(Boolean) as GeneratedProduct[];
    setGeneratedProducts(results.map(p => ({
        ...p,
        vendorName: defaultVendor || p.vendorName,
        category: defaultCategory || p.category,
    })));
    setIsProcessing(false);
    setImageFiles([]);
    setImagePreviews([]);
    toast({ title: 'Processing Complete!', description: `${results.length} product listings generated.` });
  };

  const handleProductChange = (id: string, field: keyof GeneratedProduct, value: string | number | string[]) => {
    setGeneratedProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };
  
  const handlePushToShopify = async () => {
    if (generatedProducts.length === 0) return;
    setIsPushing(true);

    let successCount = 0;
    let errorCount = 0;

    for (const product of generatedProducts) {
        try {
             // Save to Firestore "My Products" (product_drops)
            const newProductDrop: ProductDrop = {
                id: uuidv4(),
                vendorId: 'admin_snazzify',
                vendorName: product.vendorName || 'SnazzifyOfficial',
                title: product.title,
                description: product.description,
                costPrice: product.costPrice || 0,
                imageDataUris: [product.imageDataUri],
                createdAt: new Date().toISOString(),
                category: product.category,
                sizes: product.sizes,
                colors: product.colors,
            };
            await saveDocument('product_drops', newProductDrop, newProductDrop.id);

            // Push to Shopify
             const productData = {
                title: product.title,
                body_html: product.description,
                product_type: product.category,
                vendor: product.vendorName || 'Snazzify AI',
                variants: [{ price: product.price, option1: product.sizes[0] || 'Default', option2: product.colors[0] || 'Default' }],
                options: [
                    { name: "Size", values: product.sizes.length > 0 ? product.sizes : ["Default"] },
                    { name: "Color", values: product.colors.length > 0 ? product.colors : ["Default"] },
                ],
                images: [{ attachment: product.imageDataUri.split(',')[1] }],
            };

            const response = await fetch('/api/shopify/products/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            successCount++;

        } catch (error: any) {
            errorCount++;
            console.error(`Failed to push product "${product.title}":`, error);
        }
    }

    toast({
        title: 'Shopify Push Complete!',
        description: `${successCount} products pushed successfully and saved to "My Products". ${errorCount} failed. Check console for details.`,
    });
    setGeneratedProducts([]);
    setIsPushing(false);
  };
  
  useEffect(() => {
    if (defaultVendor) {
        setGeneratedProducts(prev => prev.map(p => ({...p, vendorName: defaultVendor})))
    }
  }, [defaultVendor]);

   useEffect(() => {
    if (defaultCategory) {
        setGeneratedProducts(prev => prev.map(p => ({...p, category: defaultCategory})))
    }
  }, [defaultCategory]);

  return (
    <AppShell title="Image Bulk Uploader">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload Images</CardTitle>
          <CardDescription>
            Select or drag and drop multiple product images at once. Set default vendor and collection names to apply to all uploaded images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="relative flex flex-col items-center justify-center w-full min-h-[12rem] border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50 p-4"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('product-image-input')?.click()}
          >
            {imagePreviews.length === 0 ? (
              <div className="text-center">
                <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag & drop images
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {imagePreviews.map((src, index) => (
                  <Image key={index} src={src} alt={`preview ${index}`} width={100} height={100} className="object-cover rounded-md aspect-square" />
                ))}
              </div>
            )}
          </div>
          <Input id="product-image-input" type="file" accept="image/*" onChange={handleFileChange} className="hidden" multiple />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-vendor">Default Vendor Name</Label>
                <div className="relative">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="default-vendor" value={defaultVendor} onChange={e => setDefaultVendor(e.target.value)} placeholder="e.g., Snazzify Official" className="pl-9"/>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="default-category">Default Collection/Category</Label>
                 <div className="relative">
                    <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="default-category" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} placeholder="e.g., Summer Collection" className="pl-9"/>
                </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateListings} disabled={isProcessing || imageFiles.length === 0}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Generate {imageFiles.length > 0 ? imageFiles.length : ''} Listings with AI
          </Button>
        </CardFooter>
      </Card>

      {isProcessing && (
         <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <h3 className="text-xl font-semibold">AI is analyzing your images...</h3>
            <p className="text-muted-foreground">Generating titles and descriptions for each product. This may take a moment.</p>
        </div>
      )}

      {generatedProducts.length > 0 && (
         <Card className="mt-8">
             <CardHeader>
                <CardTitle>2. Review, Price & Push</CardTitle>
                <CardDescription>Adjust the AI-generated details and set your pricing for each product.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedProducts.map(p => (
                        <Card key={p.id}>
                            <CardHeader className="p-0">
                                <Image src={p.imageDataUri} alt={p.title} width={300} height={300} className="rounded-t-lg object-cover aspect-square w-full" />
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <div className="space-y-1">
                                    <Label htmlFor={`title-${p.id}`}>Title</Label>
                                    <Input id={`title-${p.id}`} value={p.title} onChange={e => handleProductChange(p.id, 'title', e.target.value)} />
                                </div>
                                 <div className="space-y-1">
                                    <Label htmlFor={`desc-${p.id}`}>Description</Label>
                                    <Textarea id={`desc-${p.id}`} value={p.description} onChange={e => handleProductChange(p.id, 'description', e.target.value)} rows={4} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <Label htmlFor={`cost-${p.id}`}>Cost Price</Label>
                                        <Input id={`cost-${p.id}`} type="number" value={p.costPrice} onChange={e => handleProductChange(p.id, 'costPrice', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`price-${p.id}`}>Selling Price</Label>
                                        <Input id={`price-${p.id}`} type="number" value={p.price} onChange={e => handleProductChange(p.id, 'price', Number(e.target.value))} />
                                    </div>
                                </div>
                                 <div className="space-y-1">
                                    <Label htmlFor={`category-${p.id}`}>Category</Label>
                                    <Input id={`category-${p.id}`} value={p.category} onChange={e => handleProductChange(p.id, 'category', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`vendor-${p.id}`}>Vendor</Label>
                                    <Input id={`vendor-${p.id}`} value={p.vendorName} onChange={e => handleProductChange(p.id, 'vendorName', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`sizes-${p.id}`}>Sizes (comma-separated)</Label>
                                    <Input id={`sizes-${p.id}`} value={p.sizes.join(', ')} onChange={e => handleProductChange(p.id, 'sizes', e.target.value.split(',').map(s=>s.trim()))} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`colors-${p.id}`}>Colors (comma-separated)</Label>
                                    <Input id={`colors-${p.id}`} value={p.colors.join(', ')} onChange={e => handleProductChange(p.id, 'colors', e.target.value.split(',').map(s=>s.trim()))} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
             <CardFooter>
                <Button onClick={handlePushToShopify} disabled={isPushing} size="lg">
                    {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                    Push All {generatedProducts.length} Products to Shopify
                </Button>
            </CardFooter>
         </Card>
      )}

    </AppShell>
  );
}
