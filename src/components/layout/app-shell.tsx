'use client';
import type {FC, PropsWithChildren} from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  WalletCards,
  ShoppingCart,
  Settings,
  ShieldCheck,
  Bell,
  Truck,
  Ban,
  CircleDollarSign,
  Users,
  FileSpreadsheet,
  LogIn,
  Store,
  Handshake,
  ShieldAlert,
  Combine,
  SendToBack,
  RefreshCw,
  LogOut,
  Package,
  DollarSign,
  FileText,
  UserCheck as UserCheckIcon,
  MessageSquare,
  Sparkles,
  Wand2,
  Factory,
  Send,
  PackagePlus,
  Receipt,
  BookOpen,
  UserPlus,
  Briefcase,
  ShoppingBasket,
  BadgeCheck,
  MonitorCheck,
  ClipboardList,
  Image as LucideImage,
  UsersRound,
  LayoutTemplate,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getCookie } from 'cookies-next';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getCollection } from '@/services/firestore';
import type { EditableOrder } from '@/types/order';
import { SellerGenee } from '@/components/genee/seller-genee';
import { cn } from '@/lib/utils';

type MenuItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    notificationKey?: 'orders' | 'leads' | 'wholesale';
};

const adminCoreMenuItems: MenuItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventory', label: 'SnapStock AI', icon: Zap },
  { href: '/admin/wholesale-inquiries', label: 'Wholesale Requests', icon: ShoppingBasket, notificationKey: 'wholesale' },
  { href: '/mandates', label: 'Mandates', icon: WalletCards },
  { href: '/orders', label: 'Orders', icon: ShoppingCart, notificationKey: 'orders' as const },
  { href: '/leads', label: 'Leads', icon: Users, notificationKey: 'leads' as const },
  { href: '/delivery-tracking', label: 'Delivery Tracking', icon: Truck },
];

const adminGrowthMenuItems: MenuItem[] = [
    { href: '/admin/site-builder', label: 'AI Site Builder', icon: MonitorCheck },
    { href: '/ai-product-uploader', label: 'AI Uploader', icon: Wand2 },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/share/magazine', label: 'Magazine', icon: BookOpen },
    { href: '/seller-accounts', label: 'Sellers', icon: UserCheckIcon },
    { href: '/vendors', label: 'Vendors', icon: Factory },
];

const adminConfigMenuItems: MenuItem[] = [
  { href: '/billing', label: 'Usage', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const AppShell: FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const [role, setRole] = useState<string | undefined>(undefined);
  const [notificationCounts, setNotificationCounts] = useState({ orders: 0, leads: 0, wholesale: 0 });

  useEffect(() => {
    setRole(getCookie('userRole'));
    
    const fetchCounts = async () => {
        if (!user) return;

        try {
            const [allOrders, allLeads, allWholesale] = await Promise.all([
                getCollection<EditableOrder>('orders'),
                getCollection<EditableOrder>('leads'),
                getCollection<any>('wholesale_inquiries')
            ]);
            
            let newOrdersCount = 0;
            let newLeadsCount = 0;
            let newWholesaleCount = 0;

            const currentRole = getCookie('userRole');

            if (currentRole === 'admin') {
                newOrdersCount = allOrders.filter(o => o.isRead === false).length;
                newLeadsCount = allLeads.filter(l => l.isRead === false && ['Lead', 'Intent Verified', 'Enquiry'].includes(l.paymentStatus)).length;
                newWholesaleCount = allWholesale.filter((w: any) => w.isReadByAdmin === false).length;
            } else if (currentRole === 'seller') {
                 newOrdersCount = allOrders.filter(o => o.sellerId === user.uid && o.isRead === false).length;
                 newLeadsCount = allLeads.filter(l => l.sellerId === user.uid && l.isRead === false && ['Lead', 'Intent Verified', 'Enquiry'].includes(l.paymentStatus)).length;
            } else if (currentRole === 'vendor') {
                newWholesaleCount = allWholesale.filter((w: any) => w.vendorId === user.uid && w.status === 'Pending').length;
            }

            setNotificationCounts({ orders: newOrdersCount, leads: newLeadsCount, wholesale: newWholesaleCount });
        } catch (error) {
            console.error("Failed to fetch notification counts", error);
        }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);

  }, [pathname, user]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-primary bg-primary-foreground hover:bg-primary-foreground/90 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-black italic tracking-tighter text-sidebar-foreground">SnapStock</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {adminCoreMenuItems.map((item) => {
              const count = item.notificationKey ? notificationCounts[item.notificationKey] : 0;
              return (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span className="flex-grow">{item.label}</span>
                    {count > 0 && <Badge className="h-5">{count}</Badge>}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )})}
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            {adminGrowthMenuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
             {adminConfigMenuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.refresh()}>
              <RefreshCw className="h-5 w-5" />
              <span className="sr-only">Refresh Data</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/20">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/avatar/100/100"} alt="avatar" />
                    <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel className="font-black uppercase italic text-xs opacity-50">{user?.displayName || user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4"/>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 relative">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-2 z-50">
            <Link href="/" className={cn("flex flex-col items-center gap-1", pathname === '/' ? "text-primary" : "text-slate-400")}>
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
            </Link>
            <Link href="/admin/inventory" className={cn("flex flex-col items-center gap-1", pathname === '/admin/inventory' ? "text-primary" : "text-slate-400")}>
                <Zap className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Stock</span>
            </Link>
             <div className="relative -top-6">
                <Button className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 border-4 border-white" onClick={() => router.push('/ai-product-uploader')}>
                    <Sparkles className="h-6 w-6" />
                </Button>
            </div>
            <Link href="/orders" className={cn("flex flex-col items-center gap-1", pathname === '/orders' ? "text-primary" : "text-slate-400")}>
                <ShoppingCart className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Orders</span>
            </Link>
            <Link href="/settings" className={cn("flex flex-col items-center gap-1", pathname === '/settings' ? "text-primary" : "text-slate-400")}>
                <Settings className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Settings</span>
            </Link>
        </div>

        <SellerGenee />
      </SidebarInset>
    </SidebarProvider>
  );
};
