'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, ShieldCheck, ShieldAlert, Trash2, Power, PowerOff, Key } from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type StaffMember = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'staff';
    status: 'active' | 'inactive';
    createdAt: string;
};

export default function StaffManagementPage() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    const [newStaff, setNewStaff] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
    });

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        setIsLoading(true);
        try {
            const data = await getCollection<StaffMember>('staff_members');
            setStaff(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load staff list.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateStaff = async () => {
        if (!newStaff.name || !newStaff.email || !newStaff.password) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in Name, Email and Password.' });
            return;
        }

        setIsCreating(true);
        try {
            // 1. Create in Firebase Auth
            // Note: This will sign in the admin as the new user, we need to handle that if using standard Firebase Auth UI
            // For this prototype, we'll assume admin remains admin or re-logs if needed.
            const userCredential = await createUserWithEmailAndPassword(auth, newStaff.email, newStaff.password);
            
            // 2. Save to Firestore
            const staffData: StaffMember = {
                id: userCredential.user.uid,
                name: newStaff.name,
                email: newStaff.email,
                phone: newStaff.phone,
                role: 'staff',
                status: 'active',
                createdAt: new Date().toISOString(),
            };

            await saveDocument('staff_members', staffData, staffData.id);
            setStaff(prev => [...prev, staffData]);
            
            toast({ title: 'Staff Account Created', description: `${newStaff.name} can now log in to the Shop Portal.` });
            setNewStaff({ name: '', email: '', phone: '', password: '' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        } finally {
            setIsCreating(true);
            setIsCreating(false);
        }
    };

    const toggleStatus = async (member: StaffMember) => {
        const newStatus = member.status === 'active' ? 'inactive' : 'active';
        try {
            await saveDocument('staff_members', { status: newStatus }, member.id);
            setStaff(prev => prev.map(s => s.id === member.id ? { ...s, status: newStatus } : s));
            toast({ title: 'Access Updated', description: `${member.name} is now ${newStatus}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const removeStaff = async (id: string) => {
        try {
            await deleteDocument('staff_members', id);
            setStaff(prev => prev.filter(s => s.id !== id));
            toast({ title: 'Account Removed', description: 'The staff account has been deleted from records.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    };

    return (
        <AppShell title="Staff Management">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Form */}
                <Card className="lg:col-span-1 border-primary/20 shadow-xl h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Add Shop Team Member
                        </CardTitle>
                        <CardDescription>Create restricted access accounts for your shop or office staff.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input placeholder="Staff Name" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input type="email" placeholder="staff@snazzify.com" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone (Optional)</Label>
                            <Input placeholder="9876543210" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Temporary Password</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="password" placeholder="Min 6 characters" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="pl-9" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleCreateStaff} disabled={isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Create Staff Account
                        </Button>
                    </CardFooter>
                </Card>

                {/* Staff List */}
                <Card className="lg:col-span-2 shadow-lg">
                    <CardHeader>
                        <CardTitle>Connected Staff Accounts</CardTitle>
                        <CardDescription>These users can access the restricted Shop Portal to manage inventory and sales.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email/Login</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Access Control</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">No staff accounts created yet.</TableCell></TableRow>
                                    ) : (
                                        staff.map(member => (
                                            <TableRow key={member.id}>
                                                <TableCell className="font-bold">{member.name}</TableCell>
                                                <TableCell>
                                                    <div>{member.email}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">{member.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={member.status === 'active' ? 'default' : 'destructive'} className="uppercase text-[9px]">
                                                        {member.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant={member.status === 'active' ? 'outline' : 'secondary'}
                                                        onClick={() => toggleStatus(member)}
                                                        title={member.status === 'active' ? "Disable Access" : "Enable Access"}
                                                    >
                                                        {member.status === 'active' ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => removeStaff(member.id)}>
                                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}