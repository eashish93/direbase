import Sidebar from '@/modules/sidebar';
import Footer from "@/modules/footer";
import { Suspense } from "react";
import { IconTag } from '@tabler/icons-react';
import db from "@/lib/db";
import { products } from "@/drizzle/schema/products";
import { desc, lt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { Product } from "@/lib/types";
import TagProducts from "./TagProducts";

// Fetch products by tag with cursor-based pagination
async function getProductsByTag(tag: string, cursor?: string, limit = 6) {
  const dbInstance = await db();
  
  // Build query based on whether cursor is provided
  let result;
  
  // Use JSON_ARRAY_EACH to find exact tag matches (now including all product types)
  if (cursor) {
    result = await dbInstance
      .select()
      .from(products)
      .where(
        sql`EXISTS (
          SELECT 1 
          FROM json_each(${products.tags}) 
          WHERE json_each.value = ${tag}
        ) AND ${products.id} < ${cursor}`
      )
      .orderBy(desc(products.id))
      .limit(limit + 1);
  } else {
    result = await dbInstance
      .select()
      .from(products)
      .where(
        sql`EXISTS (
          SELECT 1 
          FROM json_each(${products.tags}) 
          WHERE json_each.value = ${tag}
        )`
      )
      .orderBy(desc(products.id))
      .limit(limit + 1);
  }
  
  // Check if there are more items
  const hasMore = result.length > limit;
  
  // Remove the extra item if there are more
  const tagProducts = hasMore ? result.slice(0, limit) : result;
  
  // Get the next cursor
  const nextCursor = hasMore ? tagProducts[tagProducts.length - 1].id : undefined;
  
  return { products: tagProducts, hasMore, nextCursor };
}

// Format tag for display (convert hyphens to spaces and capitalize)
function formatTag(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Page component with params for the tag slug
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  // Get tag slug and cursor
  const { slug } = await params;
  const { cursor } = await searchParams;
  
  // Format tag for display
  const formattedTag = formatTag(slug);
  
  // Fetch products with cursor-based pagination
  const { products: tagProducts, hasMore, nextCursor } = await getProductsByTag(slug, cursor);
  
  // Expose data for client component to access through window.__NEXT_DATA__
  // This will be picked up by the client component for infinite scrolling
  const pageProps = {
    products: tagProducts,
    hasMore,
    nextCursor
  };
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <IconTag size={20} className="text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900 mb-0">{formattedTag}</h1>
          </div>
          <p className="text-gray-600">Products tagged with "{formattedTag}"</p>
        </div>
        
        <Suspense fallback={<ProductsLoading tag={formattedTag} />}>
          <TagProducts 
            initialProducts={tagProducts} 
            initialHasMore={hasMore}
            initialNextCursor={nextCursor}
            tag={slug}
          />
        </Suspense>
        <Footer />
      </main>
    </div>
  );
}

// Loading component
function ProductsLoading({ tag }: { tag: string }) {
  return (
    <div className="text-center py-16">
      <IconTag size={48} className="mx-auto mb-4 text-gray-400 animate-pulse" />
      <p className="text-gray-600 font-medium">Loading {tag} products...</p>
    </div>
  );
}
