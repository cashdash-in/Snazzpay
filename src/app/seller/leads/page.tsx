

'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Send, Loader2 as ButtonLoader, ArrowRight, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '@/app/orders/page';
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument, deleteDocument, getDocument } from "@/services/firestore";
import { useRouter } from "next/navigation";
import { sanitizePhoneNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SellerUser } from "@/app/seller-accounts/page";
import Image from 'next/image';

type Lead = EditableOrder & { sellerId: string; };

export default function SellerLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  const fetchAndSetLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const allLeads = await getCollection<Lead>('leads');
        const sellerLeads = allLeads.filter(lead => lead.sellerId === user.uid && ['Lead', 'Intent Verified'].includes(lead.paymentStatus));
        setLeads(sellerLeads);
    } catch (error) {
        console.error("Failed to load leads:", error);
        toast({
            variant: 'destructive',
            title: "Error loading leads",
            description: "Could not load leads from Firestore.",
        });
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    fetchAndSetLeads();
  }, [fetchAndSetLeads]);
  
  const handleRemoveLead = async (leadId: string) => {
    if (!user) return;
    try {
        await deleteDocument('leads', leadId);
        setLeads(prev => prev.filter(l => l.id !== leadId));
        toast({
            variant: 'destructive',
            title: "Lead Removed",
            description: "The lead has been removed successfully.",
        });
    } catch (e) {
        toast({ variant: 'destructive', title: "Error removing lead" });
    }
  };

  const handleSendWhatsAppLink = (lead: Lead) => {
      const baseUrl = `${window.location.origin}/payment`;
      const finalUrl = `${baseUrl}?amount=${encodeURIComponent(lead.price)}&name=${encodeURIComponent(lead.productOrdered)}&order_id=${encodeURIComponent(lead.id)}&prepaid=true`;
      
      const message = `Hi ${lead.customerName}, please complete your order for "${lead.productOrdered}" (₹${lead.price}) by paying securely at this link: ${finalUrl}`;
      const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(lead.contactNo)}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
  };

  const handleSendEmailLink = async (lead: EditableOrder) => {
    setProcessingId(lead.id);
    try {
        const response = await fetch('/api/send-auth-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: lead, method: 'email' }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        toast({
            title: "Email Sent Successfully!",
            description: result.message,
        });
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: `Error Sending Email`,
            description: error.message,
        });
    } finally {
        setProcessingId(null);
    }
  };

  const handleConvertToOrder = async (lead: Lead) => {
    if (!user) return;
    setProcessingId(lead.id);
    try {
        const sellerDoc = await getDocument<SellerUser>('seller_users', user.uid);
        if (!sellerDoc || !sellerDoc.vendorId) {
            throw new Error("Your account is not associated with a vendor. Please contact support.");
        }

        const newOrder: EditableOrder = {
            ...lead,
            sellerId: user.uid,
            vendorId: sellerDoc.vendorId, // Add vendorId
            paymentStatus: lead.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Pending Payment',
            source: 'Seller' as const,
        };
        
        await saveDocument('orders', newOrder, newOrder.id);
        
        // Update the lead's status to 'Converted' so it doesn't show up again.
        await saveDocument('leads', { ...lead, paymentStatus: 'Converted' }, lead.id);
        
        setLeads(prev => prev.filter(l => l.id !== lead.id));

        toast({
            title: "Converted to Order",
            description: `Lead for ${lead.customerName} has been moved to the 'My Orders' list.`,
        });
        
        router.push('/seller/orders');
        router.refresh();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Error Converting Lead",
            description: error.message,
        });
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <AppShell title="My Leads">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Customer Leads</CardTitle>
              <CardDescription>Customers who have submitted an order request. Convert them to orders and send a payment link.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Captured On</TableHead>
                  <TableHead>Product(s)</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact No</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Payment Choice</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length > 0 ? leads.map((lead) => {
                    const imageUrl = lead.imageDataUris?.[0];
                    return (
                  <TableRow key={lead.id}>
                    <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
                     <TableCell>
                        <div className="flex items-center gap-2">
                           {imageUrl ? (
                                <Image src={imageUrl} alt={lead.productOrdered} width={40} height={40} className="rounded-md object-cover aspect-square"/>
                            ) : (
                                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">No Img</div>
                            )}
                            <span className="font-medium max-w-xs truncate">{lead.productOrdered}</span>
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">{lead.customerName}</TableCell>
                    <TableCell>{lead.contactNo}</TableCell>
                    <TableCell>₹{lead.price}</TableCell>
                    <TableCell>
                      <Badge variant={lead.paymentMethod === 'Cash on Delivery' ? 'secondary' : 'outline'}>
                        {lead.paymentMethod || 'Prepaid'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-2">
                        {lead.paymentMethod !== 'Cash on Delivery' && (
                            <>
                                <Button variant="secondary" size="sm" onClick={() => handleSendWhatsAppLink(lead)}>
                                    <Send className="mr-2 h-4 w-4" /> WhatsApp Link
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleSendEmailLink(lead)} disabled={processingId === lead.id || !lead.customerEmail}>
                                    {processingId === lead.id ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email Link
                                </Button>
                            </>
                        )}
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleConvertToOrder(lead)}
                            disabled={processingId === lead.id}
                        >
                           {processingId === lead.id ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />} Convert to Order
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveLead(lead.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                )}) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                            You have no new leads. Share product links to get started!
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
