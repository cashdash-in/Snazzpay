
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
  Rocket,
  Wand2,
  CheckCircle,
  Lock,
  MessageSquare,
  ImagePlus,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { createProductFromText } from '@/ai/flows/create-product-from-text';

export interface SellerProduct extends ProductListingOutput {
    id: string;
    sellerId: string;
    imageDataUris: string[];
    createdAt: string;
}

const AI_UPLOADER_LIMIT = 50;

export default function AiProductUploaderPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDataUris, setImageDataUris] = useState<string[]>([]);
  const [vendorDescription, setVendorDescription] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('100'); // Default 100% margin
  const [generatedListing, setGeneratedListing] =
    useState<ProductListingOutput | null>(null);
    
  const [usageCount, setUsageCount] = useState(0);
  const [limit, setLimit] = useState(AI_UPLOADER_LIMIT);
  const [isLimitReached, setIsLimitReached] = useState(false);

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

  useEffect(() => {
    async function checkUsage() {
        if (user) {
            const role = getCookie('userRole');
            if (role === 'admin') {
                setIsLimitReached(false);
                setLimit(Infinity); // Admin has infinite limit
                return;
            }

            const permissions = await getDocument<{aiUploadLimit?: number}>('user_permissions', user.uid);
            const currentLimit = permissions?.aiUploadLimit || AI_UPLOADER_LIMIT;
            setLimit(currentLimit);

            const products = await getCollection<SellerProduct>('seller_products');
            const sellerProducts = products.filter(p => p.sellerId === user.uid);
            const count = sellerProducts.length;
            setUsageCount(count);
            setIsLimitReached(count >= currentLimit);
        }
    }
    checkUsage();
  }, [user]);

    useEffect(() => {
        const prefillDataJSON = localStorage.getItem('ai_uploader_prefill');
        if (prefillDataJSON) {
            try {
                const data = JSON.parse(prefillDataJSON);
                setVendorDescription(data.description || '');
                setCost(data.cost?.toString() || '');
                if (data.imageDataUris) {
                    setImageDataUris(data.imageDataUris);
                }
                 if (data.imagePreviews) {
                    setImagePreviews(data.imagePreviews);
                }
                toast({
                    title: "Product Data Pre-filled",
                    description: "Details from the product drop have been loaded into the form.",
                });
                // Clean up local storage after using the data
                localStorage.removeItem('ai_uploader_prefill');
            } catch (error) {
                console.error("Failed to parse prefill data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error pre-filling data',
                });
            }
        }
    }, [toast]);
  
  const saveGeneratedProduct = async (listing: ProductListingOutput) => {
    if (!user) return;
    try {
        const newSellerProduct: SellerProduct = {
            id: uuidv4(),
            sellerId: user.uid,
            ...listing,
            imageDataUris: imageDataUris,
            createdAt: new Date().toISOString(),
        };

        await saveDocument('seller_products', newSellerProduct, newSellerProduct.id);
        setUsageCount(prev => prev + 1);
    } catch(e) {
        console.error("Failed to save product to seller's catalog", e);
        toast({
            variant: 'destructive',
            title: 'Could not save to My Products',
            description: 'There was an error saving the generated listing to your catalog.',
        });
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
    if (isLimitReached) {
        toast({
            variant: 'destructive',
            title: 'AI Uploader Limit Reached',
            description: `You have used your quota of ${limit} AI generations. Please contact the admin to upgrade.`,
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
      setGeneratedListing(result);
      await saveGeneratedProduct(result);
      toast({
        title: 'Listing Generated!',
        description: "Review the details below. This has also been saved to your 'My Products' page.",
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

   const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.trim().length < 10) return;

        // Check if pasted content is an image, if so, do not process as text
        const items = e.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              return; // Let the image paste handler take care of it
            }
          }
        }

        e.preventDefault();
        e.stopPropagation();

        setIsPasting(true);
        try {
            const result = await createProductFromText({ text: pastedText });
            // For sellers, we only want to fill the description. They should provide their own title.
            setVendorDescription(result.description);
            toast({
                title: "AI Parsing Complete!",
                description: "Product description has been filled in from your pasted text.",
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
      {isLimitReached && (
          <Alert variant="destructive" className="mb-6">
            <Lock className="h-4 w-4" />
            <AlertTitle>Feature Limit Reached</AlertTitle>
            <AlertDescription>
                You have reached your limit of {limit} AI-generated products. Please contact the administrator to upgrade your plan for a higher limit.
            </AlertDescription>
          </Alert>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Provide Product Details</CardTitle>
            <CardDescription>
              Upload images and paste the raw description from your vendor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="relative space-y-2">
                <Label htmlFor="magic-paste">Magic Paste Box (AI-Powered)</Label>
                {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                <Textarea 
                    id="magic-paste"
                    placeholder="Paste a WhatsApp chat here to auto-fill description."
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
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleGenerateListing}
              disabled={isLoading || isLimitReached}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isLimitReached ? (
                <Lock className="mr-2 h-4 w-4" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isLimitReached ? 'Limit Reached' : 'Generate Listing with AI'}
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
                  2. Review & Share
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
                            <p>This feature is available for the Super Admin only.</p>
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

    