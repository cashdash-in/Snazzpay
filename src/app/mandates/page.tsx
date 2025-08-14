import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Mandate = {
  mandateId: string;
  customerName: string;
  amount: number;
  status: 'active' | 'pending' | 'failed' | 'completed';
  createdAt: string;
  nextBilling: string;
};

const allMandates: Mandate[] = [
    { mandateId: 'mand_12aBcDeFg', customerName: 'Liam Johnson', amount: 500.00, status: 'active', createdAt: '2023-10-01', nextBilling: '2023-12-01' },
    { mandateId: 'mand_34hIjKlMn', customerName: 'Noah Smith', amount: 250.50, status: 'pending', createdAt: '2023-10-05', nextBilling: 'N/A' },
    { mandateId: 'mand_56oPqRsTu', customerName: 'Emma Williams', amount: 750.00, status: 'active', createdAt: '2023-10-10', nextBilling: '2023-12-10' },
    { mandateId: 'mand_78vWxYzAb', customerName: 'Ava Brown', amount: 120.00, status: 'failed', createdAt: '2023-10-15', nextBilling: 'N/A' },
    { mandateId: 'mand_90cDdEfGg', customerName: 'James Jones', amount: 99.99, status: 'completed', createdAt: '2023-10-20', nextBilling: 'N/A' },
    { mandateId: 'mand_11hIiJjKk', customerName: 'Sophia Garcia', amount: 300.00, status: 'active', createdAt: '2023-10-25', nextBilling: '2023-12-25' },
];

export default function MandatesPage() {
  return (
    <AppShell title="Mandates">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Mandate Management</CardTitle>
              <CardDescription>View, search, and manage all your customer mandates.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search mandates..." className="pl-8" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Filter Status</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>Active</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Pending</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Failed</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Completed</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mandate ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Max Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Next Billing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMandates.map((mandate) => (
                <TableRow key={mandate.mandateId}>
                  <TableCell className="font-mono text-xs">{mandate.mandateId}</TableCell>
                  <TableCell>{mandate.customerName}</TableCell>
                  <TableCell>₹{mandate.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <MandateStatus status={mandate.status} />
                  </TableCell>
                  <TableCell>{mandate.createdAt}</TableCell>
                  <TableCell>{mandate.nextBilling}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
