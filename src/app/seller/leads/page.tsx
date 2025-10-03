'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, ArrowRight, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '@/app/orders/page';
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument, deleteDocument } from "@/services/firestore";
import { useRouter } from "next/navigation";
import { sanitizePhoneNumber } from "@/lib/utils";

type Lead = EditableOrder & { sellerId: string; paymentMethod: string; };

export default function SellerLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();


  const fetchAndSetLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const allLeads = await getCollection<Lead>('leads');
        const sellerLeads = allLeads.filter(lead => lead.sellerId === user.uid && lead.paymentStatus === 'Lead');
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

  const handleConvertToOrder = async (lead: Lead) => {
    if (!user) return;
    try {
        const newOrder: EditableOrder = {
            ...lead,
            paymentStatus: 'Pending',
            source: 'Seller',
        };
        
        await saveDocument('orders', newOrder, newOrder.id);
        
        await saveDocument('leads', { paymentStatus: 'Converted' }, lead.id);

        setLeads(prev => prev.filter(l => l.id !== lead.id));

        toast({
            title: "Converted to Order",
            description: `Lead for ${lead.customerName} has been moved to your 'My Orders' list.`,
        });
        
        router.push('/seller/orders');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Error Converting Lead",
            description: error.message,
        });
    }
  };

  const handleSendPaymentLink = (lead: Lead) => {
      const baseUrl = `${window.location.origin}/payment`;
      const finalUrl = `${baseUrl}?amount=${encodeURIComponent(lead.price)}&name=${encodeURIComponent(lead.productOrdered)}&order_id=${encodeURIComponent(lead.id)}&prepaid=true`;
      
      const message = `Hi ${lead.customerName}, please complete your order for "${lead.productOrdered}" (₹${lead.price}) by paying securely at this link: ${finalUrl}`;
      const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(lead.contactNo)}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact No</TableHead>
                  <TableHead>Product(s)</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Payment Choice</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length > 0 ? leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{lead.customerName}</TableCell>
                    <TableCell>{lead.contactNo}</TableCell>
                    <TableCell>{lead.productOrdered}</TableCell>
                    <TableCell>₹{lead.price}</TableCell>
                    <TableCell>{lead.paymentMethod || 'N/A'}</TableCell>
                    <TableCell className="text-center space-x-2">
                        {lead.paymentMethod !== 'Cash on Delivery' && (
                            <Button variant="secondary" size="sm" onClick={() => handleSendPaymentLink(lead)}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Send Link
                            </Button>
                        )}
                        <Button 
                            variant="default" 
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
                )) : (
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
