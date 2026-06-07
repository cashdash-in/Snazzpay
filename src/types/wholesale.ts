
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

export type WholesaleInquiry = {
    id: string;
    adminId: string;
    vendorId: string;
    vendorName: string;
    productImage: string;
    category: string; // Added to support multiple product types
    quantityRequested: number;
    descriptionRequested: string;
    status: WholesaleStatus;
    createdAt: string;
    updatedAt: string;
    isReadByAdmin: boolean;
    // Vendor Response Fields
    wholesalePrice?: number;
    estimatedMRP?: number;
    vendorDescription?: string;
    alternateProduct?: AlternateProduct;
};
