export type WholesaleStatus = 'Pending' | 'Available' | 'Out of Stock' | 'Alternate Proposed';

export type AlternateProduct = {
    title: string;
    imageDataUri: string;
    wholesalePrice: number;
    estimatedMRP: number;
    availableQuantity: number;
    description: string;
    category?: string;
};

export type WholesaleItem = {
    id: string;
    images: string[];
    category: string;
    quantityRequested: number;
    descriptionRequested: string;
    status: WholesaleStatus;
    // Vendor Response Fields
    wholesalePrice?: number;
    estimatedMRP?: number;
    vendorDescription?: string;
    alternateProduct?: AlternateProduct;
};

export type WholesaleInquiry = {
    id: string;
    adminId: string;
    vendorId: string;
    vendorName: string;
    title: string;
    items: WholesaleItem[];
    status: 'Pending' | 'Partially Responded' | 'Responded';
    createdAt: string;
    updatedAt: string;
    isReadByAdmin: boolean;
};
