// ShopEase Client API Module

const API_BASE = '/api';

export const api = {
  // Fetch all categories
  async getCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) {
      console.error('API Error getCategories:', err);
      return [];
    }
  },

  // Fetch products with search, category filter, price range, sort
  async getProducts(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.category && params.category !== 'All') {
        query.append('category', params.category);
      }
      if (params.search) {
        query.append('search', params.search);
      }
      if (params.sort) {
        query.append('sort', params.sort);
      }
      if (params.minPrice) {
        query.append('minPrice', params.minPrice);
      }
      if (params.maxPrice) {
        query.append('maxPrice', params.maxPrice);
      }
      if (params.inStockOnly) {
        query.append('inStockOnly', 'true');
      }

      const res = await fetch(`${API_BASE}/products?${query.toString()}`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) {
      console.error('API Error getProducts:', err);
      return [];
    }
  },

  // Fetch single product details with related items
  async getProductById(id) {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`);
      const json = await res.json();
      return json.success ? json : null;
    } catch (err) {
      console.error('API Error getProductById:', err);
      return null;
    }
  },

  // Submit checkout order to PostgreSQL
  async createOrder(orderPayload) {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.error('API Error createOrder:', err);
      return { success: false, error: err.message };
    }
  },

  // Fetch order history from PostgreSQL
  async getOrders() {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) {
      console.error('API Error getOrders:', err);
      return [];
    }
  },

  // Fetch order by order number
  async getOrderByNumber(orderNumber) {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderNumber}`);
      const json = await res.json();
      return json.success ? json.data : null;
    } catch (err) {
      console.error('API Error getOrderByNumber:', err);
      return null;
    }
  }
};
