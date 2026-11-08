
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
  Gem,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getCookie } from 'cookies-next';
import { useEffect, useState, useMemo } from 'react';
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
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventory', label: 'ZipTally AI', icon: Zap },
  { href: '/admin/snapstock-licenses', label: 'ZipTally Partners', icon: Gem },
  { href: '/admin/wholesale-inquiries', label: 'Wholesale Requests', icon: ShoppingBasket, notificationKey: 'wholesale' },
  { href: '/mandates', label: 'Mandates', icon: WalletCards },
  { href: '/orders', label: 'Orders', icon: ShoppingCart, notificationKey: 'orders' as const },
  { href: '/leads', label: 'Leads', icon: Users, notificationKey: 'leads' as const },
  { href: '/delivery-tracking', label: 'Delivery Tracking', icon: Truck },
];

const adminGrowthMenuItems: MenuItem[] = [
    { href: '/admin/staff', label: 'Staff Management', icon: UsersRound },
    { href: '/admin/site-builder', label: 'AI Site Builder', icon: MonitorCheck },
    { href: '/admin/widget-builder', label: 'Widget Builder', icon: LayoutTemplate },
    { href: '/ai-product-uploader', label: 'AI Product Uploader', icon: Wand2 },
    { href: '/admin/whatsapp-uploader', label: 'WhatsApp Uploader', icon: MessageSquare },
    { href: '/admin/image-bulk-uploader', label: 'Image Bulk Uploader', icon: LucideImage },
    { href: '/product-drops', label: 'Product Drops', icon: Send },
    { href: '/admin/products', label: 'My Products', icon: Package },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/seller-accounts', label: 'Seller Accounts', icon: UserCheckIcon },
    { href: '/vendors', label: 'Vendors', icon: Factory },
    { href: '/collaborators', label: 'Collaborators', icon: UserPlus },
    { href: '/collaborator-billing', label: 'Collaborator Billing', icon: Briefcase },
    { href: '/partner-pay', label: 'Partner Pay', icon: Handshake },
    { href: '/settle', label: 'Settle Code', icon: SendToBack },
    { href: '/partner-cancellations', label: 'Partner Cancellations', icon: ShieldAlert },
    { href: '/logistics-secure', label: 'Logistics Hub', icon: Combine },
];

const adminConfigMenuItems: MenuItem[] = [
  { href: '/billing', label: 'Billing & Usage', icon: Receipt },
  { href: '/terms-and-conditions', label: 'Contracts', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const sellerMenuItems: MenuItem[] = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seller/leads', label: 'Leads', icon: Users, notificationKey: 'leads' as const },
    { href: '/seller/product-drops', label: 'Product Drops', icon: Send },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/seller/ai-product-uploader', label: 'AI Product Uploader', icon: Sparkles },
    { href: '/seller/orders', label: 'My Orders', icon: ShoppingCart, notificationKey: 'orders' as const },
    { href: '/seller/logistics', label: 'Logistics Hub', icon: Truck },
    { href: '/seller/collaborators', label: 'My Collaborators', icon: UserPlus },
    { href: '/collaborator-billing', label: 'Collaborator Billing', icon: Briefcase },
    { href: '/seller/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/seller/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/seller/settings', label: 'Settings', icon: Settings },
]

const vendorMenuItems: MenuItem[] = [
    { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vendor/wholesale-inquiries', label: 'Wholesale Requests', icon: BadgeCheck, notificationKey: 'wholesale' },
    { href: '/vendor/product-drops', label: 'Product Drops', icon: PackagePlus },
    { href: '/vendor/products', label: 'My Products', icon: Package },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/vendor/ai-product-uploader', label: 'AI Product Uploader', icon: Sparkles },
    { href: '/vendor/orders', label: 'Orders from Sellers', icon: ShoppingCart },
    { href: '/vendor/logistics', label: 'Logistics Hub', icon: Truck },
    { href: '/vendor/sellers', label: 'My Sellers', icon: Users },
    { href: '/vendor/collaborators', label: 'My Collaborators', icon: UserPlus },
     { href: '/collaborator-billing', label: 'Collaborator Billing', icon: Briefcase },
    { href: '/vendor/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/vendor/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/vendor/settings', label: 'Settings', icon: Settings },
];

const collaboratorMenuItems: MenuItem[] = [
    { href: '/collaborator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/collaborator/magazines', label: 'Magazines', icon: BookOpen },
    { href: '/collaborator/orders', label: 'My Order Requests', icon: Package },
    { href: '/collaborator/leads', label: 'My Leads', icon: Users },
    { href: '/collaborator/commissions', label: 'My Commissions', icon: DollarSign },
    { href: '/collaborator/reports', label: 'My Reports', icon: FileSpreadsheet },
];

export const AppShell: FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({ orders: 0, leads: 0, wholesale: 0 });

  useEffect(() => {
    setMounted(true);
    
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
    const interval = setInterval(fetchCounts, 30000);

    return () => clearInterval(interval);

  }, [pathname, user]);

  const { core, growth, config, isSnazzPay } = useMemo(() => {
    // If not mounted yet, show nothing
    if (!mounted) return { core: [], growth: [], config: [], isSnazzPay: false };

    // Determine role based primarily on PATH to restore Sidebar in new windows
    if (pathname.startsWith('/seller')) return { core: sellerMenuItems, growth: [], config: [], isSnazzPay: false };
    if (pathname.startsWith('/vendor')) return { core: vendorMenuItems, growth: [], config: [], isSnazzPay: false };
    if (pathname.startsWith('/collaborator')) return { core: collaboratorMenuItems, growth: [], config: [], isSnazzPay: false };
    if (pathname.startsWith('/ziptally') || pathname.startsWith('/snapstock')) return { core: [], growth: [], config: [], isSnazzPay: false };

    // Default to Admin items for any other protected route (Back-office management)
    return {
        core: adminCoreMenuItems,
        growth: adminGrowthMenuItems,
        config: adminConfigMenuItems,
        isSnazzPay: true
    };
  }, [pathname, mounted]);

  const mobileNavLinks = useMemo(() => {
      if (pathname.startsWith('/seller')) return [
        { href: '/seller/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/seller/products', label: 'Stock', icon: Zap },
        { href: '/seller/ai-product-uploader', label: 'AI Tools', icon: Sparkles, isAction: true },
        { href: '/seller/orders', label: 'Orders', icon: ShoppingCart },
        { href: '/seller/settings', label: 'Settings', icon: Settings },
      ];
      if (pathname.startsWith('/vendor')) return [
        { href: '/vendor/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/vendor/products', label: 'Drops', icon: PackagePlus },
        { href: '/vendor/ai-product-uploader', label: 'AI Tools', icon: Sparkles, isAction: true },
        { href: '/vendor/orders', label: 'Retail', icon: ShoppingCart },
        { href: '/vendor/settings', label: 'Settings', icon: Settings },
      ];
      if (pathname.startsWith('/collaborator')) return [
        { href: '/collaborator/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/collaborator/magazines', label: 'Library', icon: BookOpen },
        { href: '/collaborator/orders', label: 'Push', icon: Send },
        { href: '/collaborator/commissions', label: 'Wallet', icon: DollarSign },
        { href: '/collaborator/reports', label: 'Report', icon: FileSpreadsheet },
      ];
      
      return [
        { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/admin/inventory', label: 'AI Stock', icon: Zap },
        { href: '/ai-product-uploader', label: 'AI Tools', icon: Sparkles, isAction: true },
        { href: '/orders', label: 'Orders', icon: ShoppingCart },
        { href: '/settings', label: 'Settings', icon: Settings },
      ];
  }, [pathname]);

  const isPartnerPage = pathname.startsWith('/ziptally') || pathname.startsWith('/snapstock');

  return (
    <SidebarProvider>
      {!isPartnerPage && (
        <Sidebar>
            <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <Zap className="w-6 h-6 text-white fill-current" />
                </div>
                <div className="flex flex-col">
                <h1 className="text-xl font-black italic tracking-tighter text-sidebar-foreground uppercase leading-none">
                    {isSnazzPay ? 'SnazzPay Admin' : 'ZipTally AI'}
                </h1>
                <span className="text-[7px] font-bold uppercase tracking-widest text-primary">
                    {isSnazzPay ? 'Secure COD Ecosystem' : 'Smart Stock. Stronger Business.'}
                </span>
                </div>
            </div>
            </SidebarHeader>
            <SidebarContent>
            <SidebarMenu>
                {core.map((item) => {
                const count = item.notificationKey ? notificationCounts[item.notificationKey] : 0;
                return (
                <SidebarMenuItem key={item.label}>
                    <Link href={item.href}>
                    <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                    >
                        <item.icon />
                        <span className="flex-grow">{item.label}</span>
                        {count > 0 && <Badge className="h-5">{count}</Badge>}
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                )})}
            </SidebarMenu>

            {growth && growth.length > 0 && <SidebarSeparator />}
            
            <SidebarMenu>
                {growth && growth.map((item) => (
                <SidebarMenuItem key={item.label}>
                    <Link href={item.href}>
                    <SidebarMenuButton
                        isActive={pathname.startsWith(item.href)}
                        tooltip={item.label}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                ))}
            </SidebarMenu>
            
            {config && config.length > 0 && <SidebarSeparator />}

            <SidebarMenu>
                {config && config.map((item) => (
                <SidebarMenuItem key={item.label}>
                    <Link href={item.href}>
                    <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                ))}
            </SidebarMenu>
            </SidebarContent>
        </Sidebar>
      )}
      <SidebarInset>
        <header className={cn(
            "flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30",
            isPartnerPage && "bg-slate-900 text-white border-white/5"
        )}>
          <div className="flex items-center gap-4">
            {!isPartnerPage && <SidebarTrigger className="md:hidden" />}
            <h2 className={cn("text-xl font-black italic tracking-tight uppercase", isPartnerPage && "text-white")}>{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.refresh()}>
              <RefreshCw className="h-5 w-5" />
              <span className="sr-only">Refresh Data</span>
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/avatar/100/100"} alt="User avatar" />
                    <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.displayName || user?.email || "My Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                 <Link href="/seller/login" target="_blank">
                  <DropdownMenuItem>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Seller Login</span>
                  </DropdownMenuItem>
                </Link>
                 <Link href="/vendor/login" target="_blank">
                  <DropdownMenuItem>
                    <Factory className="mr-2 h-4 w-4" />
                    <span>Vendor Login</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4"/>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className={cn(
            "flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 relative",
            isPartnerPage && "bg-slate-50"
        )}>
          {children}
        </main>

        {mounted && !isPartnerPage && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                {mobileNavLinks.map((link) => {
                    const Icon = link.icon;
                    if (link.isAction) {
                        return (
                            <div key={link.label} className="relative -top-6">
                                <Button 
                                    className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 border-4 border-white bg-primary" 
                                    onClick={() => router.push(link.href)}
                                >
                                    <Icon className="h-6 w-6 text-white" />
                                </Button>
                            </div>
                        );
                    }
                    return (
                        <Link 
                            key={link.label} 
                            href={link.href} 
                            className={cn(
                                "flex flex-col items-center gap-1 min-w-[60px]", 
                                pathname === link.href ? "text-primary" : "text-slate-400"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        )}

        <SellerGenee />
      </SidebarInset>
    </SidebarProvider>
  );
};
