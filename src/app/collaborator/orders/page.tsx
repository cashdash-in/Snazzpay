
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '@/app/orders/page';
import { format } from "date-fns";
import { getCollection, saveDocument, deleteDocument } from "@/services/firestore";
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import type { Collaborator } from '@/app/collaborators/page';

export default function CollaboratorOrdersPage() {
  const [leads, setLeads] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);

  useEffect(() => {
    const mobile = localStorage.getItem('loggedInCollaboratorMobile');
    if (!mobile) {
      toast({ variant: 'destructive', title: "Not Logged In" });
      setLoading(false);
      return;
    }

    async function getCollaboratorId() {
      const allCollaborators = await getCollection<Collaborator>('collaborators');
      const collaborator = allCollaborators.find(c => c.phone === mobile);
      if (collaborator) {
        setCollaboratorId(collaborator.id);
      } else {
        setLoading(false);
      }
    }
    getCollaboratorId();
  }, [toast]);

  const fetchLeads = useCallback(async () => {
    if (!collaboratorId) return;
    setLoading(true);
    try {
      const allLeads = await getCollection<EditableOrder>('leads');
      const myLeads = allLeads.filter(lead => lead.sellerId === collaboratorId && lead.paymentStatus === 'Lead');
      setLeads(myLeads);
    } catch (error) {
      toast({ variant: 'destructive', title: "Error loading your order requests" });
    } finally {
      setLoading(false);
    }
  }, [collaboratorId, toast]);

  useEffect(() => {
    if (collaboratorId) {
      fetchLeads();
    }
  }, [collaboratorId, fetchLeads]);

  const handlePushToSeller = async (lead: EditableOrder) => {
    setProcessingId(lead.id);

    try {
      // Logic: Just update the lead status. The seller/admin will see it in their lead queue.
      // For this, we can give it a specific status.
      const updatedLead = { ...lead, paymentStatus: 'Pushed to Seller' };
      await saveDocument('leads', { paymentStatus: 'Pushed to Seller' }, lead.id);

      setLeads(prev => prev.filter(l => l.id !== lead.id));
      
      toast({
        title: "Order Pushed!",
        description: `Your order request for ${lead.customerName} has been sent to the seller for confirmation.`,
      });

    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to push order" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AppShell title="My Order Requests">
      <Card>
        <CardHeader>
          <CardTitle>My Order Requests</CardTitle>
          <CardDescription>These are order requests you generated from Smart Magazines. Push them to the seller for fulfillment.</CardDescription>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length > 0 ? leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>{format(new Date(lead.date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{lead.productOrdered}</TableCell>
                      <TableCell>{lead.customerName} ({lead.contactNo})</TableCell>
                      <TableCell>₹{lead.price}</TableCell>
                      <TableCell><Badge variant="outline">{lead.paymentStatus}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handlePushToSeller(lead)}
                          disabled={processingId === lead.id}
                        >
                          {processingId === lead.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Push to Seller
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        You have no new order requests.
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
