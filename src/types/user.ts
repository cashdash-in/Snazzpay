/**
 * @fileOverview Centralized user and account types to prevent circular dependencies.
 */

export type SellerUser = {
    id: string;
    companyName: string;
    email: string;
    phone?: string;
    status: 'pending' | 'approved' | 'rejected';
    vendorId?: string;
    vendorName?: string;
    // Usage stats
    aiUploads?: number;
    totalSales?: number;
    orderCount?: number;
    logoDataUri?: string;
    razorpay_key_id?: string;
    razorpay_key_secret?: string;
};

export type UserPermissions = {
    id: string; // same as user.id
    aiUploadLimit?: number;
    productDropLimit?: number;
};
