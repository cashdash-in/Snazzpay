
'use client';
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, saveDocument } from "@/services/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal, ImagePlus, Trash2 } from "lucide-react";
import Image from 'next/image';

type PaymentSettings = {
    razorpay_key_id: string;
    razorpay_key_secret: string;
    logoDataUri?: string;
};

export default function VendorSettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState<PaymentSettings>({ razorpay_key_id: '', razorpay_key_secret: '' });

    useEffect(() => {
        if (user) {
            getDocument<PaymentSettings>('vendors', user.uid).then(data => {
                if (data) {
                    setSettings({
                        razorpay_key_id: data.razorpay_key_id || '',
                        razorpay_key_secret: data.razorpay_key_secret || '',
                        logoDataUri: data.logoDataUri || undefined
                    });
                }
            });
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSettings(prev => ({ ...prev, logoDataUri: ev.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveSettings = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        try {
            await saveDocument('vendors', settings, user.uid);
            toast({ title: 'Settings Saved', description: 'Your vendor profile and payment settings have been updated.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Saving Settings', description: error.message });
        }
    };

  return (
    <AppShell title="My Settings">
       <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Vendor Profile & Brand</TabsTrigger>
                <TabsTrigger value="payments">Payment Gateway</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>Brand Identity</CardTitle>
                        <CardDescription>
                            Upload your professional logo. This will appear on all order pages for your products.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label>Vendor Brand Logo</Label>
                            <div className="flex items-center gap-6">
                                <div className="relative w-32 h-32 border-2 border-dashed rounded-2xl flex items-center justify-center bg-muted overflow-hidden">
                                    {settings.logoDataUri ? (
                                        <>
                                            <Image src={settings.logoDataUri} alt="Brand Logo" fill className="object-contain p-2" />
                                            <Button 
                                                size="icon" 
                                                variant="destructive" 
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                                onClick={() => setSettings({...settings, logoDataUri: undefined})}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </>
                                    ) : (
                                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                                    <p className="text-xs text-muted-foreground">Upload your brand logo for consistent customer experience.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveSettings}>Save Vendor Profile</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="payments">
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Payment Gateway</CardTitle>
                        <CardDescription>
                            Connect your own Razorpay account to receive payments directly for your products.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Your Own Gateway</AlertTitle>
                            <AlertDescription>
                                <p>The credentials you enter here will be used for any direct sales or settlements. Sellers in your network will use their own gateways.</p>
                            </AlertDescription>
                        </Alert>
                         <div className="space-y-2">
                            <Label htmlFor="vendor_razorpay_key_id">Razorpay Key ID</Label>
                            <Input 
                            id="vendor_razorpay_key_id" 
                            name="razorpay_key_id"
                            placeholder="rzp_live_..." 
                            value={settings.razorpay_key_id}
                            onChange={handleInputChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor_razorpay_key_secret">Razorpay Key Secret</Label>
                            <Input 
                            id="vendor_razorpay_key_secret" 
                            name="razorpay_key_secret"
                            type="password" 
                            placeholder="Your key secret" 
                            value={settings.razorpay_key_secret}
                            onChange={handleInputChange}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveSettings}>Save Payment Settings</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
    </AppShell>
  );
}
