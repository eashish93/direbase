'use client';

import { getProducts } from '@/lib/actions/productActions';
import ProductForm from '@/modules/products/ProductForm';
import { useCallback, useEffect, useState } from 'react';
import ProductsList from '@/modules/products/ProductsList';
import LogoutButton from '@/modules/logout';
import { Product, Pagination } from '@/lib/types';

const PRODUCTS_PER_PAGE = 5;

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getProducts(page, PRODUCTS_PER_PAGE);
      if (result.success) {
        setProducts(result.products || []);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductChanged = useCallback((page = 1) => {
    // Always fetch the first page when a product is created
    // But use the current page when a product is deleted
    fetchProducts(page);
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm mb-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl mb-0 font-bold text-gray-900">Direbase | Admin</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6 text-gray-900">Add New Product</h2>
              <ProductForm onSuccess={() => handleProductChanged(1)} />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Product List{' '}
                  <span className="text-sm font-normal text-gray-500">
                    {pagination ? `(${pagination.total} total)` : `(${products.length} products)`}
                  </span>
                </h2>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading products...</div>
              ) : (
                <ProductsList 
                  products={products} 
                  initialPagination={pagination} 
                  onRefreshNeeded={handleProductChanged}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
