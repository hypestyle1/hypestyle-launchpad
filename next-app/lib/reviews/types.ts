export interface PublicReview {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  createdAt: string;
  productId?: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  verified: boolean;
  incentivized: boolean;
  isDemo?: boolean;
}

export interface PublicReviewDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface PublicReviewSummary {
  average: number | null;
  total: number;
  distribution: PublicReviewDistribution;
  isDemo: boolean;
}

export interface PublicReviewsPagination {
  page: number;
  pages: number;
  total: number;
}

export interface PublicReviewsResult {
  reviews: PublicReview[];
  pagination: PublicReviewsPagination;
}

export type ReviewsSortOrder = 'recent' | 'top' | 'low';

export interface GetPublicReviewsOptions {
  page?: number;
  perPage?: number;
  stars?: number;
  sort?: ReviewsSortOrder;
}
