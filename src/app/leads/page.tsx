
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Send, Loader2 as ButtonLoader, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";
import { getCollection, deleteDocument, saveDocument } from "@/services/firestore";
import { useRouter } from "next/navigation";


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
        // Filter out any leads that have been converted
        setLeads(loadedLeads.filter(lead => lead.paymentStatus !== 'Converted'));
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
        const response = await fetch('/api/create-payment-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: lead.price,
                customerName: lead.customerName,
                customerContact: lead.contactNo,
                customerEmail: lead.customerEmail,
                orderId: lead.orderId,
                productName: lead.productOrdered,
            }),
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
              <CardTitle>Intent Verified Leads</CardTitle>
              <CardDescription>Customers who completed verification but did not complete the final authorization. Follow up to convert them!</CardDescription>
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
                  <TableHead>Original Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact No</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Product(s)</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.date ? format(new Date(lead.date), 'PP') : 'N/A'}</TableCell>
                    <TableCell className="font-medium">{lead.orderId}</TableCell>
                    <TableCell>{lead.customerName}</TableCell>
                    <TableCell>{lead.customerEmail}</TableCell>
                    <TableCell>{lead.contactNo}</TableCell>
                    <TableCell>{lead.customerAddress}, {lead.pincode}</TableCell>
                    <TableCell>{lead.productOrdered}</TableCell>
                    <TableCell>₹{lead.price}</TableCell>
                    <TableCell className="text-center space-x-2">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleSendLink(lead)}
                            disabled={sendingLinkId === lead.id}
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
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

