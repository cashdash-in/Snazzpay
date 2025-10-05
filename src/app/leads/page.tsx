

'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Loader2, Trash2, Send, Loader2 as ButtonLoader, ArrowRight, Store, Factory, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";
import { getCollection, deleteDocument, saveDocument } from "@/services/firestore";
import { useRouter } from "next/navigation";
import Image from 'next/image';


export default function LeadsPage() {
  const [leads, setLeads] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingLinkId, setSendingLinkId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  const fetchAndSetLeads = useCallback(async () => {
    setLoading(true);
    try {
        const loadedLeads = await getCollection<EditableOrder>('leads');
        const filteredLeads = loadedLeads.filter(lead => ['Intent Verified', 'Lead'].includes(lead.paymentStatus));

        const sortedLeads = filteredLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setLeads(sortedLeads);
    } catch (error) {
        console.error("Failed to load leads from Firestore:", error);
        toast({
            variant: 'destructive',
            title: "Error loading leads",
            description: "Could not load leads from Firestore. Please check console for details.",
        });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetLeads();
  }, [fetchAndSetLeads]);
  
  const handleRemoveLead = async (leadId: string) => {
    try {
        await deleteDocument('leads', leadId);
        setLeads(prev => prev.filter(lead => lead.id !== leadId));
        toast({
            variant: 'destructive',
            title: "Lead Removed",
            description: "The lead has been removed successfully.",
        });
    } catch (error) {
         toast({
            variant: 'destructive',
            title: "Error Removing Lead",
            description: "Could not remove the lead from the database.",
        });
    }
  };

  const handleSendLink = async (lead: EditableOrder) => {
    setSendingLinkId(lead.id);
    try {
        // Use the generic send-auth-link endpoint now
        const response = await fetch('/api/send-auth-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: lead, method: 'email' }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send payment link.');
        }

        toast({
            title: "Payment Link Sent!",
            description: result.message,
        });

    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: "Error Sending Link",
            description: error.message,
        });
    } finally {
        setSendingLinkId(null);
    }
  };

  const handleImagePaste = async (e: ClipboardEvent, leadId: string) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        setLeads(prevLeads => prevLeads.map(lead =>
                            lead.id === leadId ? { ...lead, imageDataUris: [result] } : lead
                        ));
                         toast({ title: "Image Pasted!", description: "Image added to the lead. Remember to save if needed." });
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
  };

  const handleConvertToOrder = async (lead: EditableOrder) => {
    try {
        const newOrder: EditableOrder = {
            ...lead,
            paymentStatus: 'Pending', // Set as a pending manual order
            source: 'Manual' as const,
        };
        
        await saveDocument('orders', newOrder, newOrder.id);
        
        // Instead of deleting, we update the lead's status so it doesn't show up again
        await saveDocument('leads', { ...lead, paymentStatus: 'Converted' }, lead.id);
        
        setLeads(prev => prev.filter(l => l.id !== lead.id));

        toast({
            title: "Converted to Order",
            description: `Lead for ${lead.customerName} has been moved to the main orders list.`,
        });
        
        router.refresh();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Error Converting Lead",
            description: error.message,
        });
    }
  };

  return (
    <AppShell title="Leads from Secure COD">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leads</CardTitle>
              <CardDescription>Customers who started the order process but did not complete the final payment.</CardDescription>
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
                  <TableHead>Value</TableHead>
                  <TableHead>Source / Actors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                    const imageUrl = lead.imageDataUris?.[0];
                    let sourceName = lead.source || 'Manual';
                    if (sourceName === 'Catalogue') sourceName = 'Smart Magazine';
                    
                    return (
                  <TableRow key={lead.id} onPaste={(e) => handleImagePaste(e, lead.id)}>
                    <TableCell>{lead.date ? format(new Date(lead.date), 'PP') : 'N/A'}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           {imageUrl ? (
                                <Image src={imageUrl} alt={lead.productOrdered} width={40} height={40} className="rounded-md object-cover aspect-square"/>
                            ) : (
                                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center p-1">Paste Image Here</div>
                            )}
                            <span className="font-medium max-w-xs truncate">{lead.productOrdered}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div>{lead.customerName}</div>
                      <div className='text-xs text-muted-foreground'>{lead.contactNo}</div>
                    </TableCell>
                    <TableCell>₹{lead.price}</TableCell>
                     <TableCell>
                      <div className="space-y-1 text-xs">
                           <div className="flex items-center gap-1 font-medium">
                                <ShoppingCart className="h-3 w-3" />
                                {sourceName}
                           </div>
                           {lead.vendorName && (
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Factory className="h-3 w-3" /> {lead.vendorName}
                                </div>
                            )}
                            {lead.sellerName && (
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Store className="h-3 w-3" /> {lead.sellerName}
                                </div>
                            )}
                            {sourceName === 'Manual' && !lead.sellerName && !lead.vendorName && (
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <Store className="h-3 w-3" /> Snazzify
                                </div>
                            )}
                      </div>
                    </TableCell>
                    <TableCell>{lead.paymentStatus}</TableCell>
                    <TableCell className="text-center space-x-2">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleSendLink(lead)}
                            disabled={sendingLinkId === lead.id || !lead.customerEmail}
                            title={!lead.customerEmail ? 'Email is required to send link' : 'Send Payment Link'}
                        >
                            {sendingLinkId === lead.id ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Payment Link
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleConvertToOrder(lead)}
                        >
                           <ArrowRight className="mr-2 h-4 w-4" /> Convert to Order
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveLead(lead.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
