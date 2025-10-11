'use client';

import { useState, useRef, ChangeEvent } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Sparkles,
  Rocket,
  Wand2,
  FileText,
  Percent,
  Calendar as CalendarIcon,
  Factory,
  Book,
} from 'lucide-react';
// import { type ProductListingOutput } from '@/ai/schemas/product-listing';
// import { parseWhatsAppChat } from '@/ai/flows/whatsapp-product-parser';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Textarea } from '@/components/ui/textarea';

// Placeholder types since schemas are removed
type ProductListingOutput = {
  title: string;
  description: string;
  category: string;
  price: number;
  sizes: string[];
  colors: string[];
};

type ParsedProduct = ProductListingOutput & {
    id: string; // Add a temporary client-side ID
    vendorName?: string;
};

export default function WhatsAppUploaderPage() {
  const { toast } = useToast();
  const [isParsing, setIsParsing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [chatContent, setChatContent] = useState<string>('');
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [bulkMargin, setBulkMargin] = useState<string>('0');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [defaultVendor, setDefaultVendor] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setChatContent(content);
        toast({ title: 'Chat File Loaded', description: 'Click the "Parse Chat" button to process the content.' });
      };
      reader.readAsText(file);
    }
  };

  const handleParseChat = async () => {
    toast({
        variant: 'destructive',
        title: 'Feature Disabled',
        description: 'The AI features have been temporarily disabled to ensure application stability.',
    });
    return;
  };

  const handleProductChange = (id: string, field: keyof ParsedProduct, value: string | number | string[]) => {
    setParsedProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };
  
  const applyBulkMargin = () => {
    if (parsedProducts.length === 0) {
        toast({ variant: 'destructive', title: 'No Products Parsed', description: 'Please parse products before applying a margin.' });
        return;
    }
    const margin = parseFloat(bulkMargin);
    if (isNaN(margin)) {
        toast({ variant: 'destructive', title: 'Invalid Margin', description: 'Margin must be a valid number.' });
        return;
    }

    const updatedProducts = parsedProducts.map(p => {
        const originalPrice = p.price;
        const newPrice = originalPrice * (1 + (margin / 100));
        return { ...p, price: Math.round(newPrice) };
    });
    setParsedProducts(updatedProducts);
    toast({ title: 'Prices Updated', description: \`All product prices have been recalculated with a \${margin}% margin.\` });
  };


  const handlePushToShopify = async () => {
    if (parsedProducts.length === 0) return;
    setIsPushing(true);

    let successCount = 0;
    let errorCount = 0;

    for (const product of parsedProducts) {
        try {
            const newProductDrop: ProductDrop = {
                id: uuidv4(),
                vendorId: 'admin_snazzify',
                vendorName: product.vendorName || 'SnazzifyOfficial',
                title: product.title,
                description: product.description,
                costPrice: product.price,
                imageDataUris: [], // No images from chat parser
                createdAt: new Date().toISOString(),
                category: product.category,
                sizes: product.sizes,
                colors: product.colors,
            };
            await saveDocument('product_drops', newProductDrop, newProductDrop.id);

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
            console.error(\`Failed to push product "\${product.title}":\`, error);
        }
    }

    toast({
        title: 'Shopify Push Complete!',
        description: \`\${successCount} products pushed successfully and saved to "My Products". \${errorCount} failed. Check console for details.\`,
    });
    setParsedProducts([]);
    setIsPushing(false);
  };

  return (
    <AppShell title="WhatsApp Bulk Uploader">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>1. Upload & Parse</CardTitle>
                    <CardDescription>Upload your exported WhatsApp chat (.txt) file. You can optionally filter by date.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="chat-file">WhatsApp Chat File (.txt)</Label>
                        <Input
                            id="chat-file"
                            type="file"
                            accept=".txt"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date-range">Optional: Filter by Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date-range"
                                    variant={"outline"}
                                    className={"w-full justify-start text-left font-normal"}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleParseChat} disabled={isParsing || !chatContent}>
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Parse Chat with AI
                    </Button>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>2. Bulk Edit</CardTitle>
                    <CardDescription>Apply settings to all products parsed from the chat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="default-vendor">Default Vendor Name</Label>
                        <div className="flex items-center gap-2">
                            <Factory className="h-5 w-5 text-muted-foreground" />
                            <Input id="default-vendor" value={defaultVendor} onChange={e => setDefaultVendor(e.target.value)} placeholder="e.g., Snazzify Official" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="default-category">Default Collection/Category</Label>
                        <div className="flex items-center gap-2">
                           <Book className="h-5 w-5 text-muted-foreground" />
                           <Input id="default-category" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} placeholder="e.g., Summer Collection" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bulk-margin">Set Margin for All Products</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="bulk-margin"
                                type="number"
                                placeholder="e.g., 100 for 100% margin"
                                value={bulkMargin}
                                onChange={(e) => setBulkMargin(e.target.value)}
                            />
                            <Percent className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={applyBulkMargin} variant="secondary" disabled={parsedProducts.length === 0}>
                        Apply Bulk Edits
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>3. Review, Edit & Push</CardTitle>
                    <CardDescription>Review the products parsed by the AI. You can edit the price and other details for each item before pushing them all to Shopify.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isParsing ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                            <h3 className="text-xl font-semibold">AI is analyzing the chat...</h3>
                            <p className="text-muted-foreground">Identifying products and extracting details. This may take a moment.</p>
                        </div>
                    ) : parsedProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {parsedProducts.map((p) => (
                                <Card key={p.id}>
                                    <CardHeader>
                                        <Input value={p.title} onChange={e => handleProductChange(p.id, 'title', e.target.value)} className="font-bold text-lg"/>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <Textarea value={p.description} onChange={e => handleProductChange(p.id, 'description', e.target.value)} rows={4} />
                                        <Label>Category</Label>
                                        <Input value={p.category} onChange={e => handleProductChange(p.id, 'category', e.target.value)} />
                                        <Label>Vendor</Label>
                                        <Input value={p.vendorName} onChange={e => handleProductChange(p.id, 'vendorName', e.target.value)} />
                                        <Label>Sizes (comma-separated)</Label>
                                        <Input value={p.sizes.join(', ')} onChange={e => handleProductChange(p.id, 'sizes', e.target.value.split(',').map(s=>s.trim()))} />
                                        <Label>Colors (comma-separated)</Label>
                                        <Input value={p.colors.join(', ')} onChange={e => handleProductChange(p.id, 'colors', e.target.value.split(',').map(c=>c.trim()))} />
                                        <div className="space-y-1 pt-2">
                                            <Label htmlFor={\`price-\${p.id}\`}>Selling Price</Label>
                                            <Input
                                                id={\`price-\${p.id}\`}
                                                type="number"
                                                value={p.price}
                                                onChange={(e) => handleProductChange(p.id, 'price', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-8">
                            <FileText className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Generated Products Will Appear Here</h3>
                            <p>Upload a chat file and click "Parse Chat with AI" to begin.</p>
                        </div>
                    )}
                </CardContent>
                {parsedProducts.length > 0 && (
                    <CardFooter>
                        <Button onClick={handlePushToShopify} disabled={isPushing} size="lg">
                            {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                            Push All {parsedProducts.length} Products to Shopify
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
      </div>
    </AppShell>
  );
}
