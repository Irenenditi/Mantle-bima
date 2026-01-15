// Type definitions for the Bima Land Marketplace backend

export interface Image {
  id?: number;
  listingId: string;
  filename: string;
  originalName: string;
  path: string;
}

export interface Document {
  id?: number;
  listingId: string;
  type: 'titleDeed' | 'surveyReport' | 'taxCertificate';
  filename: string;
  originalName: string;
  path: string;
}

export interface Seller {
  name: string;
  phone: string;
  email: string;
}

export interface VerificationStatus {
  documents: 'pending' | 'approved' | 'rejected';
  site: 'pending' | 'approved' | 'rejected';
  legal: 'pending' | 'approved' | 'rejected';
}

export interface Listing {
  id: string;
  title: string;
  location: string;
  size: string;
  price: number;
  description?: string;
  landType?: string;
  zoning?: string;
  accessibility?: string;
  metadataHash?: string;
  status: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  createdAt: string;
  updatedAt: string;
  images?: Image[];
  documents?: {
    titleDeed: Document | null;
    surveyReport: Document | null;
    taxCertificate: Document | null;
  };
  utilities?: string[];
  nearbyAmenities?: string[];
  seller?: Seller;
  verificationStatus?: VerificationStatus;
}

export interface ListingInput {
  title: string;
  location: string;
  size: string;
  price: number;
  description?: string;
  landType?: string;
  zoning?: string;
  utilities?: string[];
  accessibility?: string;
  nearbyAmenities?: string[];
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  metadataHash?: string;
  images?: Array<{
    filename: string;
    originalName: string;
    path: string;
  }>;
  documents?: {
    titleDeed?: {
      filename: string;
      originalName: string;
      path: string;
    };
    surveyReport?: {
      filename: string;
      originalName: string;
      path: string;
    };
    taxCertificate?: {
      filename: string;
      originalName: string;
      path: string;
    };
  };
}

export interface StatusUpdate {
  status?: string;
  verificationStatus?: Partial<VerificationStatus>;
}

