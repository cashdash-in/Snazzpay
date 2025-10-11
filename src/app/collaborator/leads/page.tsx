'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Send, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '@/app/orders/page';
import { format } from "date-fns";
import { getCollection, deleteDocument, saveDocument } from "@/services/firestore";
import { Badge } from "@/components/ui/badge";
import type { Collaborator } from '@/app/collaborators/page';

export default function CollaboratorLeadsPage() {
  const [leads, setLeads] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);
  const { toast } = useToast();

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
        toast({ variant: 'destructive', title: "Collaborator not found" });
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
      const myLeads = allLeads.filter(lead => lead.sellerId === collaboratorId);
      setLeads(myLeads.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      toast({ variant: 'destructive', title: "Error loading your leads" });
    } finally {
      setLoading(false);
    }
  }, [collaboratorId, toast]);

  useEffect(() => {
    if (collaboratorId) {
      fetchLeads();
    }
  }, [collaboratorId, fetchLeads]);

  return (
    <AppShell title="My Generated Leads">
      <Card>
        <CardHeader>
          <CardTitle>My Leads</CardTitle>
          <CardDescription>This page shows all the leads you have generated from sharing Smart Magazines, and their current status.</CardDescription>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length > 0 ? leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>{format(new Date(lead.date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{lead.productOrdered}</TableCell>
                      <TableCell>{lead.customerName}</TableCell>
                      <TableCell>₹{lead.price}</TableCell>
                      <TableCell><Badge variant="outline">{lead.paymentStatus}</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        You have not generated any leads yet.
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
