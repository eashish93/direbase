'use client';

import { Button } from "@/elements/button";
import { deleteProduct, getProducts, toggleFeatured } from "@/lib/actions/productActions";
import { useState, useEffect } from "react";
import ProductForm from "./ProductForm";
import { Product, Pagination } from "@/lib/types";
import { 
  IconBallBowling, 
  IconEdit, 
  IconTrash, 
  IconExternalLink, 
  IconTag,
  IconCoin,
  IconCoinOff,
  IconChevronLeft,
  IconChevronRight,
  IconStar,
  IconStarOff
} from "@tabler/icons-react";

interface ProductsListProps {
  products: Product[];
  initialPagination?: Pagination;
  onRefreshNeeded?: (page?: number) => void;
}

export default function ProductsList({ products, initialPagination, onRefreshNeeded }: ProductsListProps) {
  const [productsList, setProductsList] = useState<Product[]>(products);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTogglingFeatured, setIsTogglingFeatured] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination | undefined>(initialPagination);
  
  // Set default pagination if none provided
  useEffect(() => {
    if (!pagination) {
      setPagination({
        total: products.length,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(products.length / 10),
        hasNextPage: products.length > 10,
        hasPrevPage: false
      });
    }
  }, [products.length, pagination]);

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this product?")) {
      setIsDeleting(id);
      
      try {
        const result = await deleteProduct(id);
        
        if (result.success) {
          setProductsList(prev => prev.filter(p => p.id !== id));
          if (selectedProduct?.id === id) {
            setSelectedProduct(null);
          }
          
          if (onRefreshNeeded) {
            onRefreshNeeded(pagination?.page || 1);
          } else {
            if (pagination) {
              const newTotal = pagination.total - 1;
              const newTotalPages = Math.ceil(newTotal / pagination.limit);
              setPagination({
                ...pagination,
                total: newTotal,
                totalPages: newTotalPages,
                hasNextPage: pagination.page < newTotalPages
              });
            }
          }
        } else {
          alert(result.error || "Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("An error occurred while deleting the product");
      } finally {
        setIsDeleting(null);
      }
    }
  }
  
  async function handleToggleFeatured(id: string, currentValue: boolean) {
    setIsTogglingFeatured(id);
    
    try {
      const result = await toggleFeatured(id, !currentValue);
      
      if (result.success) {
        // Update the local product list
        setProductsList(prev => 
          prev.map(p => 
            p.id === id ? { ...p, isFeatured: !currentValue } : p
          )
        );
      } else {
        alert(result.error || "Failed to update featured status");
      }
    } catch (error) {
      console.error("Error toggling featured status:", error);
      alert("An error occurred while updating featured status");
    } finally {
      setIsTogglingFeatured(null);
    }
  }
  
  async function changePage(newPage: number) {
    if (!pagination || newPage === pagination.page || newPage < 1 || newPage > pagination.totalPages) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await getProducts(newPage, pagination.limit);
      
      if (result.success && result.products) {
        setProductsList(result.products);
        setPagination(result.pagination);
      } else {
        console.error("Failed to fetch page:", result.error);
        alert("Failed to load products");
      }
    } catch (error) {
      console.error("Error changing page:", error);
      alert("An error occurred while loading products");
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleProductUpdated() {
    // If we have an onRefreshNeeded callback, use it instead of reloading the page
    if (onRefreshNeeded) {
      onRefreshNeeded(pagination?.page || 1);
    } else {
      // Fall back to the old behavior for backwards compatibility
      window.location.reload();
    }
  }

  function renderPagination() {
    if (!pagination || pagination.totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between mt-6 py-3 border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-600">
          <span>
            Showing <span className="font-medium">{productsList.length}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> products
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(pagination.page - 1)}
            isDisabled={!pagination.hasPrevPage || isLoading}
          >
            <IconChevronLeft size={16} className="mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center mx-2">
            <span className="text-gray-600 text-sm">
              Page <span className="font-medium">{pagination.page}</span> of{' '}
              <span className="font-medium">{pagination.totalPages}</span>
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(pagination.page + 1)}
            isDisabled={!pagination.hasNextPage || isLoading}
          >
            Next
            <IconChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <IconBallBowling size={48} className="mx-auto mb-4 text-gray-400 animate-pulse" />
        <p className="text-gray-600 font-medium">Loading products...</p>
      </div>
    );
  }
  
  if (productsList.length === 0) {
    return (
      <div className="text-center py-12 bg-white/50 rounded-lg border border-gray-200">
        <IconBallBowling size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 font-medium">No products added yet.</p>
        <p className="text-gray-400 text-sm mt-1">Create your first product using the form.</p>
      </div>
    );
  }
  
  if (selectedProduct) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <IconBallBowling size={24} className="text-gray-700" />
            <h3 className="text-lg font-medium">Editing: {selectedProduct.name}</h3>
          </div>
          <Button 
            variant="text" 
            onClick={() => setSelectedProduct(null)}
          >
            Cancel
          </Button>
        </div>
        <ProductForm 
          product={selectedProduct} 
          onSuccess={handleProductUpdated} 
        />
      </div>
    );
  }
  
  return (
    <div>
      <div className="space-y-6">
        {productsList.map(product => (
          <div 
            key={product.id}
            className="group border border-gray-400 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col sm:flex-row">
              {/* Product thumbnail or icon column */}
              <div className="sm:w-40 md:w-48 shrink-0">
                {product.thumbnail ? (
                  <div className="w-full h-full min-h-32 bg-gray-100">
                    <img 
                      src={product.thumbnail} 
                      alt={product.name} 
                      className="w-full h-full object-cover aspect-[4/3]"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full min-h-32 bg-gray-100 flex items-center justify-center p-6">
                    {product.icon ? (
                      <img src={product.icon} alt={product.name} className="max-w-full max-h-20 object-contain" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <IconBallBowling size={32} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Product details column */}
              <div className="flex-1 p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                      {product.isNew && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full uppercase">
                          New
                        </span>
                      )}
                      {product.isFeatured && (
                        <span className="px-2  bg-amber-100 text-amber-800 text-[10px] font-medium rounded-full uppercase">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <span className="px-2 py-0.5 inline-block bg-gray-100 text-gray-700 text-xs font-medium rounded-md capitalize mb-2">
                      {product.type}
                    </span>
                  </div>
                  
                  <div className="flex sm:hidden gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFeatured(product.id, !!product.isFeatured)}
                      isDisabled={isTogglingFeatured === product.id}
                      className="!p-1 h-8 w-8"
                    >
                      {product.isFeatured ? <IconStar size={16} className="text-amber-500" /> : <IconStarOff size={16} />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProduct(product)}
                      className="!p-1 h-8 w-8"
                    >
                      <IconEdit size={16} />
                    </Button>
                    <Button
                      variant="error"
                      size="sm"
                      isDisabled={isDeleting === product.id}
                      onClick={() => handleDelete(product.id)}
                      className="!p-1 h-8 w-8"
                    >
                      <IconTrash size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <div className={`flex items-center gap-1 ${product.isPaid ? 'text-green-600' : 'text-gray-500'}`}>
                      {product.isPaid ? (
                        <>
                          <IconCoin size={16} className="shrink-0" />
                          <span className="text-sm font-medium">${product.price}</span>
                        </>
                      ) : (
                        <>
                          <IconCoinOff size={16} className="shrink-0" />
                          <span className="text-sm font-medium">Free</span>
                        </>
                      )}
                    </div>
                    
                    <div className="h-4 border-r border-gray-400"></div>
                    
                    <a 
                      href={product.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 text-sm flex items-center gap-1.5 hover:underline"
                    >
                      <IconExternalLink size={12} />
                      <span className="truncate max-w-[120px]">{product.link.replace(/^https?:\/\//, '')}</span>
                    </a>
                  </div>
                  
                  {product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center text-xs text-gray-500">
                      <IconTag size={14} className="mr-1" />
                      {product.tags.map((tag, index) => (
                        <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action buttons column - only visible on desktop */}
              <div className="hidden sm:flex flex-col justify-center gap-2 p-4 border-l border-gray-400">
                <Button
                  variant={product.isFeatured ? "filled" : "outline"}
                  size="sm"
                  onClick={() => handleToggleFeatured(product.id, !!product.isFeatured)}
                  isDisabled={isTogglingFeatured === product.id}
                  className="whitespace-nowrap"
                >
                  {isTogglingFeatured === product.id ? (
                    'Updating...'
                  ) : product.isFeatured ? (
                    <><IconStar size={16} className="mr-1.5 text-amber-500" /> Featured</>
                  ) : (
                    <><IconStarOff size={16} className="mr-1.5" /> Feature</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProduct(product)}
                  className="whitespace-nowrap"
                >
                  <IconEdit size={16} className="mr-1.5" /> Edit
                </Button>
                <Button
                  variant="error"
                  size="sm"
                  isDisabled={isDeleting === product.id}
                  onClick={() => handleDelete(product.id)}
                  className="whitespace-nowrap"
                >
                  <IconTrash size={16} className="mr-1.5" /> {isDeleting === product.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {renderPagination()}
    </div>
  );
} 