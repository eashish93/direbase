import { InferSelectModel } from 'drizzle-orm';
import { products } from '@/drizzle/schema/products';

// Infer the Product type from the Drizzle schema
export type Product = InferSelectModel<typeof products>;

// Define Pagination interface for reuse across components
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} 