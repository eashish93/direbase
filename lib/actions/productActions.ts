'use server';

import { z } from 'zod';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import db from '@/lib/db';
import { products } from '@/drizzle/schema/products';
import { eq, sql } from 'drizzle-orm';
import verifyAuth from './verifyAuth';
import { parseBody } from '@/lib/utils';

// Create Zod schemas from drizzle schema
const selectProductSchema = createSelectSchema(products);
const insertProductSchema = createInsertSchema(products);

// Extend the insert schema with custom validations and preprocessing for form data
const productSchema = insertProductSchema.extend({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  link: z.string().min(1, "Link is required"),
  // Preprocess price: Convert empty/null string to null, otherwise coerce to number
  price: z.preprocess((val) => {
      if (val === '' || val === null || val === 'null') return null;
      const num = Number(val);
      return isNaN(num) ? val : num; // Return original string if not a valid number
    },
    // The base schema expects number | null
    z.number().nullable().optional()
  ),
  // Preprocess tags: Convert comma-separated string to string array
  tags: z.preprocess((val) => {
      if (typeof val === 'string') {
        return val.split(',').map(tag => tag.trim()).filter(Boolean);
      }
      return val; // Pass through if already an array (e.g., from JSON)
    },
    // The base schema expects string[]
    z.array(z.string())
  ),
  // Coerce boolean fields coming from FormData (which parseBody handles)
  isPaid: z.boolean(), // drizzle-zod generates z.boolean()
  isNew: z.boolean().nullable().optional(), // drizzle-zod generates z.boolean().nullish()
});

export async function saveProduct(formData: FormData) {
  try {
    // 1. Verify authentication
    await verifyAuth();
    const dbInstance = await db();

    // 2. Parse and validate form data
    const productData = parseBody<typeof productSchema>(formData, productSchema);

    // 3. Prepare data for database (handle price string conversion)
    const dbData = {
      ...productData,
      price: productData.price != null ? productData.price.toString() : null,
    };

    // 4. Perform Insert or Update
    if (productData.id) {
      // Update existing product (exclude id from set)
      const { id, ...updateData } = dbData;
      await dbInstance.update(products)
        .set(updateData)
        .where(eq(products.id, productData.id));
      return { success: true, id: productData.id };
    } else {
      // Create new product
      const newId = crypto.randomUUID();
      await dbInstance.insert(products).values({
        ...dbData,
        id: newId, // Assign the new ID
      });
      return { success: true, id: newId };
    }

  } catch (error) {
    // Centralized error handling
    if (error instanceof z.ZodError) {
      console.error('Validation Error saving product:', error.format());
      return { success: false, errors: error.format() };
    }
    // Check if it's an auth error (assuming verifyAuth throws specific error or identifiable message)
    // This is a basic check; you might need a more robust way to identify auth errors
    if (error instanceof Error && error.message.includes('Authentication failed')) {
       console.error('Authentication failed:', error);
       return { success: false, error: 'Authentication failed' };
    }
    
    // Assume other errors are DB errors
    console.error('Database Error saving product:', error);
    return { success: false, error: 'Failed to save product to database' };
  }
}

export async function getProducts(page = 1, limit = 10) {
  try {
    await verifyAuth();

    const dbInstance = await db();
    
    try {
      // Calculate offset based on page and limit
      const offset = (page - 1) * limit;
      
      // Get total count first
      const totalCountResult = await dbInstance.select({ 
        count: sql`count(*)` 
      }).from(products);
      const totalCount = Number(totalCountResult[0].count);
      
      // Get paginated products
      const result = await dbInstance
        .select()
        .from(products)
        .limit(limit)
        .offset(offset)
        .orderBy(products.name);
      
      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limit);

      return { 
        success: true, 
        products: result,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return { success: false, error: 'Failed to fetch products' };
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export async function deleteProduct(id: string) {
  try {
    await verifyAuth();

    const dbInstance = await db();
    
    try {
      await dbInstance.delete(products).where(eq(products.id, id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: 'Failed to delete product' };
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export async function toggleFeatured(id: string, newValue: boolean) {
  try {
    await verifyAuth();

    const dbInstance = await db();
    
    try {
      await dbInstance.update(products)
        .set({ isFeatured: newValue })
        .where(eq(products.id, id));
      
      return { success: true };
    } catch (error) {
      console.error('Error toggling featured status:', error);
      return { success: false, error: 'Failed to update featured status' };
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
} 