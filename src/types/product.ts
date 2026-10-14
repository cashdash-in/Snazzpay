/**
 * @fileOverview Centralized product and drop types to prevent circular dependencies.
 */

export type PaymentMethod = 'Secure COD' | 'Cash on Delivery' | 'Prepaid';

export interface ProductDrop {
    id: string;
    vendorId: string;
    vendorName: string;
    title: string;
    description: string;
    costPrice: number;
    category?: string;
    imageDataUris: string[];
    createdAt: string;
    sizes: string[];
    colors: string[];
    allowedPaymentMethods?: PaymentMethod[];
    videoDataUri?: string;
    isEastIndianLugra?: boolean;
    isTryOnEnabled?: boolean;
    price?: number; // Optional price for seller's view
}

export type SellerProduct = {
    id: string;
    sellerId: string;
    sellerName: string;
    title: string;
    description: string;
    category: string;
    price: number;
    sizes: string[];
    colors: string[];
    imageDataUris: string[];
    createdAt: string;
    allowedPaymentMethods?: PaymentMethod[];
    videoDataUri?: string;
    isTryOnEnabled?: boolean;
};
