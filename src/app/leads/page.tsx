
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, ClipboardEvent } from "react";
import { Loader2, Trash2, Send, Loader2 as ButtonLoader, ArrowRight, Store, Factory, ShoppingCart, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '@/types/order';
import { format } from "date-fns";
import { getCollection, deleteDocument, saveDocument, batchUpdateDocuments } from "@/services/firestore";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing


export default function LeadsPage() {
  const [leads, setLeads] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingLinkId, setSendingLinkId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();


  const fetchAndSetLeads = useCallback(async () => {
    setLoading(true);
    try {
        const loadedLeads = await getCollection<EditableOrder>('leads');
        let filteredLeads = loadedLeads.filter(lead => ['Intent Verified', 'Lead', 'Enquiry'].includes(lead.paymentStatus));
        
        if (user) {
            const userRole = localStorage.getItem('userRole');
            if (userRole === 'seller') {
                filteredLeads = filteredLeads.filter(lead => lead.sellerId === user.uid);
            }

            if (userRole === 'admin') {
                const unreadIds = filteredLeads.filter(l => l.isRead === false).map(l => l.id);
                if (unreadIds.length > 0) {
                    await batchUpdateDocuments('leads', unreadIds, { isRead: true });
                }
            }
        }
        
        const sortedLeads = filteredLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLeads(sortedLeads);
        
    } catch (error) {
        console.error("Failed to load leads from Firestore:", error);
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

  const handleImagePaste = async (e: ClipboardEvent, leadId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                e.preventDefault();
                const resizedDataUri = await resizeImage(file);
                setLeads(prevLeads => prevLeads.map(lead =>
                    lead.id === leadId ? { ...lead, imageDataUris: [resizedDataUri] } : lead
                ));
                toast({ title: "Image Pasted!", description: "Image added to the lead." });
            }
        }
    }
  };

  const handleConvertToOrder = async (lead: EditableOrder) => {
    try {
        const { isRead, ...orderData } = lead;
        const newOrder: EditableOrder = {
            ...orderData,
            paymentStatus: 'Pending',
            source: 'Manual' as const,
            isRead: false,
        };
        
        await saveDocument('orders', newOrder, newOrder.id);
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
    <AppShell title="Leads & Enquiries">
      <Card>
        <CardHeader>
            <CardTitle>Sales Leads</CardTitle>
            <CardDescription>Customers who showed interest or started orders. Includes "Enquiries" from Smart Magazines.</CardDescription>
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
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length > 0 ? leads.map((lead) => {
                    const imageUrl = lead.imageDataUris?.[0];
                    const isEnquiry = lead.paymentStatus === 'Enquiry';
                    
                    return (
                  <TableRow key={lead.id} onPaste={(e) => handleImagePaste(e, lead.id)}>
                    <TableCell>{lead.date ? format(new Date(lead.date), 'PP') : 'N/A'}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           {imageUrl ? (
                                <Image src={imageUrl} alt={lead.productOrdered} width={40} height={40} className="rounded-md object-cover aspect-square"/>
                            ) : (
                                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-[10px] text-center p-1">Paste Image</div>
                            )}
                            <span className="font-medium max-w-[150px] truncate">{lead.productOrdered}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div>{lead.customerName}</div>
                      <div className='text-xs text-muted-foreground'>{lead.contactNo}</div>
                    </TableCell>
                    <TableCell>₹{lead.price}</TableCell>
                     <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {lead.source || 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={isEnquiry ? "secondary" : "default"} className={cn(isEnquiry && "bg-purple-100 text-purple-800")}>
                            {isEnquiry ? <MessageCircle className="mr-1 h-3 w-3"/> : null}
                            {lead.paymentStatus}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        {!isEnquiry && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleSendLink(lead)}
                                disabled={sendingLinkId === lead.id || !lead.customerEmail}
                                title="Send Payment Link"
                            >
                                {sendingLinkId === lead.id ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Link
                            </Button>
                        )}
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
                )}) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No active leads or enquiries found.</TableCell>
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
