
'use client';

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Mail, MessageSquareWarning, Rocket, Download } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { toast } = useToast();
  const [razorpaySettings, setRazorpaySettings] = useState({ keyId: '', keySecret: '' });
  const [shopifySettings, setShopifySettings] = useState({ storeUrl: '', apiKey: '', apiSecret: '' });
  const [notificationSettings, setNotificationSettings] = useState({ gmailEmail: '', gmailPassword: '' });
  const [logisticsSettings, setLogisticsSettings] = useState({ apiUser: '', apiPassword: '' });

  useEffect(() => {
    // Load saved settings from localStorage for display purposes
    const savedRazorpayKeyId = localStorage.getItem('razorpay_key_id');
    const savedRazorpayKeySecret = localStorage.getItem('razorpay_key_secret');
    if (savedRazorpayKeyId) {
      setRazorpaySettings(prev => ({ ...prev, keyId: savedRazorpayKeyId }));
    }
    if (savedRazorpayKeySecret) {
      setRazorpaySettings(prev => ({ ...prev, keySecret: savedRazorpayKeySecret }));
    }

    const savedShopifyStoreUrl = localStorage.getItem('shopify_store_url');
    const savedShopifyApiKey = localStorage.getItem('shopify_api_key');
    const savedShopifyApiSecret = localStorage.getItem('shopify_api_secret');
    if (savedShopifyStoreUrl) {
      setShopifySettings(prev => ({ ...prev, storeUrl: savedShopifyStoreUrl }));
    }
    if (savedShopifyApiKey) {
      setShopifySettings(prev => ({ ...prev, apiKey: savedShopifyApiKey }));
    }
    if (savedShopifyApiSecret) {
        setShopifySettings(prev => ({ ...prev, apiSecret: savedShopifyApiSecret }));
    }
    const savedGmailEmail = localStorage.getItem('gmail_app_email');
    if (savedGmailEmail) {
        setNotificationSettings(prev => ({...prev, gmailEmail: savedGmailEmail}));
    }
    const savedLogisticsUser = localStorage.getItem('logistics_api_user');
    const savedLogisticsPassword = localStorage.getItem('logistics_api_password');
     if (savedLogisticsUser) {
      setLogisticsSettings(prev => ({ ...prev, apiUser: savedLogisticsUser }));
    }
    if (savedLogisticsPassword) {
      setLogisticsSettings(prev => ({ ...prev, apiPassword: savedLogisticsPassword }));
    }
  }, []);

  const handleRazorpayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRazorpaySettings({ ...razorpaySettings, [e.target.name]: e.target.value });
  };

  const handleShopifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopifySettings({ ...shopifySettings, [e.target.name]: e.target.value });
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotificationSettings({ ...notificationSettings, [e.target.name]: e.target.value });
  };

   const handleLogisticsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogisticsSettings({ ...logisticsSettings, [e.target.name]: e.target.value });
  };

  const handleSaveSettings = (type: 'razorpay' | 'shopify' | 'notifications' | 'logistics') => {
    if (type === 'razorpay') {
        localStorage.setItem('razorpay_key_id', razorpaySettings.keyId);
        localStorage.setItem('razorpay_key_secret', razorpaySettings.keySecret);
    } else if (type === 'shopify') {
        localStorage.setItem('shopify_store_url', shopifySettings.storeUrl);
        localStorage.setItem('shopify_api_key', shopifySettings.apiKey);
        localStorage.setItem('shopify_api_secret', shopifySettings.apiSecret);
    } else if (type === 'notifications') {
        localStorage.setItem('gmail_app_email', notificationSettings.gmailEmail);
        localStorage.setItem('gmail_app_password', notificationSettings.gmailPassword);
    } else if (type === 'logistics') {
        localStorage.setItem('logistics_api_user', logisticsSettings.apiUser);
        localStorage.setItem('logistics_api_password', logisticsSettings.apiPassword);
    }

    toast({
      title: "Settings Saved to Browser",
      description: `Your ${type} settings have been saved in this browser. For server operations to work, you must also set these as environment variables in apphosting.yaml.`,
    });
  };

  const handleDownload = () => {
    toast({
        variant: 'destructive',
        title: 'Feature Not Available',
        description: 'This button is a placeholder. Project download functionality is not implemented in this version.'
    });
  };


  return (
    <AppShell title="Settings">
      <Tabs defaultValue="razorpay" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl mx-auto">
          <TabsTrigger value="razorpay">Razorpay</TabsTrigger>
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
        </TabsList>
        <TabsContent value="razorpay">
          <Card>
            <CardHeader>
              <CardTitle>Razorpay Integration</CardTitle>
              <CardDescription>
                Connect your Razorpay account to enable secure eMandates for COD orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Action Required!</AlertTitle>
                <AlertDescription>
                  For Razorpay integration to work, you must set your keys as environment variables in `apphosting.yaml`. The fields below save to your browser but are not used by the server.
                  <ul className="list-disc pl-5 mt-2">
                    <li><span className="font-mono text-xs">RAZORPAY_KEY_ID</span></li>
                    <li><span className="font-mono text-xs">RAZORPAY_KEY_SECRET</span></li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="razorpay-key-id">Key ID</Label>
                <Input 
                  id="razorpay-key-id" 
                  name="keyId"
                  placeholder="rzp_live_..." 
                  value={razorpaySettings.keyId}
                  onChange={handleRazorpayChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razorpay-key-secret">Key Secret</Label>
                <Input 
                  id="razorpay-key-secret" 
                  name="keySecret"
                  type="password" 
                  placeholder="Your key secret" 
                  value={razorpaySettings.keySecret}
                  onChange={handleRazorpayChange}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSaveSettings('razorpay')}>Save Razorpay Settings to Browser</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="shopify">
          <Card>
            <CardHeader>
              <CardTitle>Shopify Integration</CardTitle>
              <CardDescription>
                Connect your Shopify store to sync orders and customer information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Action Required!</AlertTitle>
                <AlertDescription>
                  For Shopify integration to work, you must set your store details as environment variables in `apphosting.yaml`.
                  <ul className="list-disc pl-5 mt-2">
                    <li><span className="font-mono text-xs">SHOPIFY_STORE_URL</span> (e.g., your-store.myshopify.com)</li>
                    <li><span className="font-mono text-xs">SHOPIFY_API_KEY</span> (Your Admin API access token)</li>
                     <li><span className="font-mono text-xs">SHOPIFY_API_SECRET</span> (Your Shopify App's API secret key)</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="shopify-store-url">Store URL</Label>
                <Input 
                  id="shopify-store-url"
                  name="storeUrl" 
                  placeholder="your-store.myshopify.com" 
                  value={shopifySettings.storeUrl}
                  onChange={handleShopifyChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopify-api-key">Admin API access token</Label>
                <Input 
                  id="shopify-api-key"
                  name="apiKey"
                  type="password"
                  placeholder="Your Shopify Admin API access token (shpat_...)" 
                  value={shopifySettings.apiKey}
                  onChange={handleShopifyChange} 
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="shopify-api-secret">API Secret Key</Label>
                <Input 
                  id="shopify-api-secret"
                  name="apiSecret" 
                  type="password" 
                  placeholder="Your Shopify API secret key" 
                  value={shopifySettings.apiSecret}
                  onChange={handleShopifyChange} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSaveSettings('shopify')}>Save Shopify Settings to Browser</Button>
            </CardFooter>
          </Card>
        </TabsContent>
         <TabsContent value="logistics">
          <Card>
            <CardHeader>
              <CardTitle>Logistics Integration</CardTitle>
              <CardDescription>
                Connect your logistics account (e.g., Shiprocket, Delhivery) to book shipments and track deliveries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Alert>
                <Rocket className="h-4 w-4" />
                <AlertTitle>Action Required!</AlertTitle>
                <AlertDescription>
                  For logistics integration to work, you must set your API credentials as environment variables in `apphosting.yaml`. The example uses Shiprocket, but you can adapt it for any provider.
                  <ul className="list-disc pl-5 mt-2">
                    <li><span className="font-mono text-xs">LOGISTICS_API_USER</span> (Your logistics API user/email)</li>
                    <li><span className="font-mono text-xs">LOGISTICS_API_PASSWORD</span> (Your logistics API password/secret)</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="logistics-api-user">API User / Email</Label>
                <Input 
                  id="logistics-api-user" 
                  name="apiUser"
                  placeholder="Your logistics account email or user" 
                  value={logisticsSettings.apiUser}
                  onChange={handleLogisticsChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logistics-api-password">API Password / Secret</Label>
                <Input 
                  id="logistics-api-password" 
                  name="apiPassword"
                  type="password" 
                  placeholder="Your logistics API password or secret" 
                  value={logisticsSettings.apiPassword}
                  onChange={handleLogisticsChange}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSaveSettings('logistics')}>Save Logistics Settings to Browser</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email & SMS/WhatsApp Notifications</CardTitle>
              <CardDescription>
                Configure how authorization links are sent to customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertTitle>How to Enable Email Notifications</AlertTitle>
                    <AlertDescription>
                        <p>To send emails, you must configure your Gmail account credentials as environment variables in `apphosting.yaml`. This is the most reliable method for sending notifications.</p>
                        <p className="font-semibold mt-2">Step 1: Generate a Gmail App Password</p>
                        <ol className="list-decimal pl-5 mt-1 text-xs">
                            <li>Go to your Google Account settings: <Link href="https://myaccount.google.com/" target="_blank" className="underline">myaccount.google.com</Link></li>
                            <li>Go to the "Security" section.</li>
                            <li>Under "How you sign in to Google", enable <strong>2-Step Verification</strong>. You cannot create an App Password without this.</li>
                            <li>After enabling 2-Step Verification, return to the Security page and find <strong>App passwords</strong>.</li>
                            <li>Generate a new password. For the app, select "Mail", and for the device, select "Other (Custom name)" and call it "SnazzPay".</li>
                            <li>Copy the 16-character password that is generated. This is your App Password.</li>
                        </ol>
                         <p className="font-semibold mt-2">Step 2: Set Environment Variables</p>
                         <p>In `apphosting.yaml`, set the following variables:</p>
                        <ul className="list-disc pl-5 mt-1 font-mono text-xs">
                           <li>GMAIL_APP_EMAIL: "your-email@gmail.com"</li>
                           <li>GMAIL_APP_PASSWORD: "your-16-character-app-password"</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                     <MessageSquareWarning className="h-4 w-4" />
                    <AlertTitle>SMS/WhatsApp Service in India</AlertTitle>
                    <AlertDescription>
                       The free SMS/WhatsApp integration previously used (`textbelt.com`) does not support sending messages to India. For reliable delivery, we strongly recommend integrating a dedicated provider like Twilio, Vonage, or a similar service with official support for India. This typically requires a paid account and API key configuration.
                    </AlertDescription>
                </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="project">
           <Card>
            <CardHeader>
              <CardTitle>Project Actions</CardTitle>
              <CardDescription>
                Actions related to the entire project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Download Project</Label>
                    <p className="text-sm text-muted-foreground">Download a .zip file of all your project code. This is useful for backups or for deploying to another service.</p>
                </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Project Code
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
