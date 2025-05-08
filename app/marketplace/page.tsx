import Sidebar from '@/modules/sidebar';
import Footer from "@/modules/footer";
import { Suspense } from "react";
import { IconTemplate } from '@tabler/icons-react';
import db from "@/lib/db";
import { products } from "@/drizzle/schema/products";
import { eq, desc, and, lt } from "drizzle-orm";
import { Product } from "@/lib/types";
import TemplatesList from "./TemplatesList";

// Fetch templates directly in the page component
async function getTemplates(cursor?: string, limit = 6) {
  const dbInstance = await db();
  
  // Build query based on whether cursor is provided
  let result;
  if (cursor) {
    result = await dbInstance
      .select()
      .from(products)
      .where(and(
        eq(products.type, 'template'),
        lt(products.id, cursor)
      ))
      .orderBy(desc(products.id))
      .limit(limit + 1);
  } else {
    result = await dbInstance
      .select()
      .from(products)
      .where(eq(products.type, 'template'))
      .orderBy(desc(products.id))
      .limit(limit + 1);
  }
  
  // Check if there are more items
  const hasMore = result.length > limit;
  
  // Remove the extra item if there are more
  const templates = hasMore ? result.slice(0, limit) : result;
  
  // Get the next cursor
  const nextCursor = hasMore ? templates[templates.length - 1].id : undefined;
  
  return { templates, hasMore, nextCursor };
}

// Page component with searchParams for cursor-based pagination
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  // Get cursor from searchParams, using await since it's a promise in Next.js 15
  const { cursor } = await searchParams;
  
  // Fetch templates with cursor-based pagination
  const { templates, hasMore, nextCursor } = await getTemplates(cursor);
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketplace</h1>
          <p className="text-gray-600">Find the perfect template for your next project</p>
        </div>

        <Suspense fallback={<TemplatesLoading />}>
          <TemplatesList
            initialTemplates={templates}
            initialHasMore={hasMore}
            initialNextCursor={nextCursor}
          />
        </Suspense>
        <Footer />
      </main>
    </div>
  );
}

// Loading component
function TemplatesLoading() {
  return (
    <div className="text-center py-16">
      <IconTemplate size={48} className="mx-auto mb-4 text-gray-400 animate-pulse" />
      <p className="text-gray-600 font-medium">Loading templates...</p>
    </div>
  );
}