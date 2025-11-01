import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CubeIcon,
  ChartBarIcon,
  TagIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { AnimatedCard } from '@/components/ui/animated-card';

interface Product {
  id: string;
  sku: string;
  upc?: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  price?: number;
  quantity?: number;
  status: 'active' | 'inactive' | 'draft';
  images?: string[];
}

interface Statistics {
  totalProducts: number;
  activeProducts: number;
  categories: number;
  brands: number;
  avgPrice: number;
  totalValue: number;
}

export default function PIMDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [searchTerm, filterStatus, filterCategory]);

  const loadData = async () => {
    try {
      // Load statistics
      const statsResponse = await fetch('/api/v1/pim/statistics');
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStatistics(statsData.data);
      }

      // Load products
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const productsResponse = await fetch(`/api/v1/pim/products?${params}`);
      const productsData = await productsResponse.json();
      if (productsData.success) {
        setProducts(productsData.data.products);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/v1/pim/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Product Information Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your entire product catalog in one place
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/app/import-wizard'}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-glow-md transition-all flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Import Products
            </button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AnimatedCard variant="glass" hover3D>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CubeIcon className="w-8 h-8 text-blue-500" />
                  <span className="text-sm text-gray-500">Total</span>
                </div>
                <p className="text-3xl font-bold mb-1">{statistics.totalProducts}</p>
                <p className="text-sm text-gray-600">Products</p>
              </div>
            </AnimatedCard>

            <AnimatedCard variant="glass" hover3D>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <ChartBarIcon className="w-8 h-8 text-green-500" />
                  <span className="text-sm text-gray-500">Active</span>
                </div>
                <p className="text-3xl font-bold mb-1">{statistics.activeProducts}</p>
                <p className="text-sm text-gray-600">Active Products</p>
              </div>
            </AnimatedCard>

            <AnimatedCard variant="glass" hover3D>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TagIcon className="w-8 h-8 text-purple-500" />
                  <span className="text-sm text-gray-500">Categories</span>
                </div>
                <p className="text-3xl font-bold mb-1">{statistics.categories}</p>
                <p className="text-sm text-gray-600">Product Categories</p>
              </div>
            </AnimatedCard>

            <AnimatedCard variant="glass" hover3D>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <BuildingStorefrontIcon className="w-8 h-8 text-orange-500" />
                  <span className="text-sm text-gray-500">Brands</span>
                </div>
                <p className="text-3xl font-bold mb-1">{statistics.brands}</p>
                <p className="text-sm text-gray-600">Unique Brands</p>
              </div>
            </AnimatedCard>
          </div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="relative">
              <TagIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {/* Add dynamic categories here */}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UPC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No products found. Import your first batch to get started!
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 mr-3 flex items-center justify-center">
                              <CubeIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.upc || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${product.price?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.quantity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            product.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : product.status === 'inactive'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => window.location.href = `/app/pim/products/${product.id}`}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

