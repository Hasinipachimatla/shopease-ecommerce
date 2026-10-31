// ShopEase Central State Management

class Store {
  constructor() {
    this.state = {
      categories: [],
      products: [],
      filteredProducts: [],
      activeCategory: 'All',
      searchQuery: '',
      sortBy: 'popular',
      maxPrice: 3000,
      inStockOnly: false,
      cart: this.loadCart(),
      wishlist: this.loadWishlist(),
      appliedCoupon: null, // e.g., { code: 'WELCOME100', discount: 100 }
      selectedProduct: null,
      orders: [],
      isLoading: false
    };

    this.listeners = [];
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(listener => listener(this.state, event, payload));
  }

  // Cart operations
  loadCart() {
    try {
      const saved = localStorage.getItem('shopease_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem('shopease_cart', JSON.stringify(this.state.cart));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }

  addToCart(product, quantity = 1) {
    const existingIndex = this.state.cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      this.state.cart[existingIndex].quantity += quantity;
    } else {
      this.state.cart.push({ product, quantity });
    }
    this.saveCart();
    this.notify('cart_updated', { product, quantity, action: 'add' });
  }

  updateCartQuantity(productId, quantity) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.state.cart.find(i => i.product.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveCart();
      this.notify('cart_updated', { product: item.product, quantity, action: 'update' });
    }
  }

  removeFromCart(productId) {
    this.state.cart = this.state.cart.filter(item => item.product.id !== productId);
    this.saveCart();
    this.notify('cart_updated', { productId, action: 'remove' });
  }

  clearCart() {
    this.state.cart = [];
    this.state.appliedCoupon = null;
    this.saveCart();
    this.notify('cart_updated', { action: 'clear' });
  }

  getCartTotals() {
    let subtotal = 0;
    let mrpTotal = 0;
    let itemCount = 0;

    this.state.cart.forEach(item => {
      const price = parseFloat(item.product.price);
      const originalPrice = parseFloat(item.product.original_price || item.product.price);
      subtotal += price * item.quantity;
      mrpTotal += originalPrice * item.quantity;
      itemCount += item.quantity;
    });

    const catalogDiscount = mrpTotal - subtotal;
    let couponDiscount = 0;

    if (this.state.appliedCoupon && subtotal > 0) {
      if (this.state.appliedCoupon.type === 'fixed') {
        couponDiscount = Math.min(this.state.appliedCoupon.value, subtotal);
      } else if (this.state.appliedCoupon.type === 'percentage') {
        couponDiscount = Math.round((subtotal * this.state.appliedCoupon.value) / 100);
      }
    }

    const deliveryFee = 0; // Free delivery across India (Meesho model)
    const finalTotal = Math.max(0, subtotal - couponDiscount + deliveryFee);

    return {
      mrpTotal,
      subtotal,
      catalogDiscount,
      couponDiscount,
      deliveryFee,
      finalTotal,
      itemCount
    };
  }

  // Wishlist operations
  loadWishlist() {
    try {
      const saved = localStorage.getItem('shopease_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveWishlist() {
    try {
      localStorage.setItem('shopease_wishlist', JSON.stringify(this.state.wishlist));
    } catch (e) {
      console.warn('Could not save wishlist to localStorage', e);
    }
  }

  toggleWishlist(product) {
    const exists = this.isInWishlist(product.id);
    if (exists) {
      this.state.wishlist = this.state.wishlist.filter(item => item.id !== product.id);
    } else {
      this.state.wishlist.push(product);
    }
    this.saveWishlist();
    this.notify('wishlist_updated', { product, added: !exists });
  }

  isInWishlist(productId) {
    return this.state.wishlist.some(item => item.id === productId);
  }

  // Apply Coupon
  applyCoupon(code) {
    const clean = code.trim().toUpperCase();
    if (clean === 'WELCOME100') {
      this.state.appliedCoupon = { code: 'WELCOME100', type: 'fixed', value: 100, label: '₹100 First Order Discount' };
      this.notify('coupon_applied', this.state.appliedCoupon);
      return { success: true, message: 'Coupon WELCOME100 applied! Saved ₹100' };
    } else if (clean === 'FESTIVE15') {
      this.state.appliedCoupon = { code: 'FESTIVE15', type: 'percentage', value: 15, label: '15% Festive Mela Discount' };
      this.notify('coupon_applied', this.state.appliedCoupon);
      return { success: true, message: 'Coupon FESTIVE15 applied! 15% discount activated' };
    } else {
      return { success: false, message: 'Invalid coupon code. Try WELCOME100 or FESTIVE15' };
    }
  }

  removeCoupon() {
    this.state.appliedCoupon = null;
    this.notify('coupon_removed', null);
  }
}

export const store = new Store();
