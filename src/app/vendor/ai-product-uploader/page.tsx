'use client';
import { useState, ClipboardEvent } from 'react';
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
  Rocket,
  Wand2,
  CheckCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { Checkbox } from '@/components/ui/checkbox';

type GeneratedListingWithPayments = ProductListingOutput & { 
    allowedPaymentMethods?: ('Secure COD' | 'Cash on Delivery' | 'Prepaid')[]
};


export default function VendorAiProductUploaderPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDataUris, setImageDataUris] = useState<string[]>([]);
  const [vendorDescription, setVendorDescription] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('100'); // Default 100% margin
  const [generatedListing, setGeneratedListing] =
    useState<GeneratedListingWithPayments | null>(null);

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

    toast({ title: 'Processing images...' });
    const newPreviews: string[] = [];
    const newDataUris: string[] = [];
    for (const file of fileArray) {
      const result = await resizeImage(file);
      newPreviews.push(result);
      newDataUris.push(result);
    }
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setImageDataUris(prev => [...prev, ...newDataUris]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handlePaste = async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) files.push(file);
        }
    }

    if (files.length > 0) {
        event.preventDefault();
        await handleFiles(files);
        toast({ title: 'Image(s) Pasted!' });
    }
  };

  const handleGenerateListing = async () => {
    if (imageDataUris.length === 0 || !vendorDescription || !cost || !margin) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide at least one image, a description, cost, and margin.',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedListing(null);

    try {
      const result = await createProductListing({
        imageDataUris,
        description: vendorDescription,
        cost: parseFloat(cost),
        margin: parseFloat(margin),
      });
      setGeneratedListing({...result, allowedPaymentMethods: ['Secure COD', 'Cash on Delivery', 'Prepaid']});
      toast({
        title: 'Listing Generated!',
        description: 'Review the AI-generated details below.',
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
  
    const handlePaymentMethodChange = (method: 'Secure COD' | 'Cash on Delivery' | 'Prepaid', checked: boolean) => {
        setGeneratedListing(prev => {
            if (!prev) return null;
            const currentMethods = prev.allowedPaymentMethods || [];
            if (checked) {
                return { ...prev, allowedPaymentMethods: [...currentMethods, method] };
            } else {
                return { ...prev, allowedPaymentMethods: currentMethods.filter(m => m !== method) };
            }
        });
    };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageDataUris(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <AppShell title="AI Product Uploader">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" onPaste={handlePaste}>
        <Card>
          <CardHeader>
            <CardTitle>1. Provide Product Details</CardTitle>
            <CardDescription>
              Upload or paste images and provide product description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-image">Product Images</Label>
              <div className="flex flex-col gap-2">
                <Input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                    multiple
                />
                <p className="text-[10px] text-muted-foreground italic">Tip: Paste images directly with Ctrl+V</p>
              </div>
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg border-dashed border-2 p-4">
                  {imagePreviews.map((src, index) => (
                     <div key={index} className="relative group">
                        <Image
                            src={src}
                            alt={`Product preview ${index + 1}`}
                            width={150}
                            height={150}
                            className="object-contain rounded-md aspect-square"
                        />
                        <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(index)}><X className="h-3 w-3"/></Button>
                     </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-description">Product Description</Label>
              <Textarea
                id="vendor-description"
                placeholder="Describe your product for the AI to parse..."
                value={vendorDescription}
                onChange={(e) => setVendorDescription(e.target.value)}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Base Cost (INR)</Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="e.g., 250"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin">Desired Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  placeholder="e.g., 100"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
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
                Analyzing your data...
              </p>
            </div>
          )}
          {!isLoading && !generatedListing && (
             <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
                <Sparkles className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold text-muted-foreground">Generated Listing Will Appear Here</h3>
            </div>
          )}
          {generatedListing && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" />
                  2. Review & Share
                </CardTitle>
                <CardDescription>
                  Your AI-generated listing is ready.
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
                    Product Description
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
                 <div className="space-y-2">
                    <Label>Allowed Payment Methods</Label>
                    <div className="flex flex-wrap gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="secure-cod" onCheckedChange={(checked) => handlePaymentMethodChange('Secure COD', checked as boolean)} checked={generatedListing.allowedPaymentMethods?.includes('Secure COD')} />
                            <Label htmlFor="secure-cod">Secure COD</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="cod" onCheckedChange={(checked) => handlePaymentMethodChange('Cash on Delivery', checked as boolean)} checked={generatedListing.allowedPaymentMethods?.includes('Cash on Delivery')} />
                            <Label htmlFor="cod">Cash on Delivery</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="prepaid" onCheckedChange={(checked) => handlePaymentMethodChange('Prepaid', checked as boolean)} checked={generatedListing.allowedPaymentMethods?.includes('Prepaid')} />
                            <Label htmlFor="prepaid">Prepaid</Label>
                        </div>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className="w-full" disabled>
                                <Rocket className="mr-2 h-4 w-4" />
                                Push to Shopify
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Super Admin Only</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full" variant="secondary">
                            <MessageSquare className="mr-2 h-4 w-4" /> Share on WhatsApp
                        </Button>
                    </DialogTrigger>
                    <ShareComposerDialog product={{...generatedListing, costPrice: parseFloat(cost), imageDataUris: imageDataUris, id: 'temp'}} />
                </Dialog>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

const MAX_IMAGE_SIZE_PX = 800;
