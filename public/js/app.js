// ShopEase Main Application Controller
import { api } from './api.js';
import { store } from './state.js';
import {
  formatINR,
  renderProductCard,
  renderProductDetailModal,
  renderCartDrawer,
  renderWishlistDrawer,
  renderOrderConfirmation,
  renderOrdersHistory,
  showToast
} from './components.js';

class App {
  constructor() {
    this.elements = {};
    this.searchDebounceTimer = null;
  }

  async init() {
    this.cacheDOMElements();
    this.bindEvents();
    this.subscribeState();

    // Initial data fetch
    await this.loadCategories();
    await this.loadProducts();

    // Update initial badges
    this.updateBadges();

    console.log('🛍️ ShopEase initialized successfully');
  }

  cacheDOMElements() {
    this.elements = {
      // Header
      searchInput: document.getElementById('search-input'),
      searchClearBtn: document.getElementById('search-clear-btn'),
      cartBtn: document.getElementById('cart-btn'),
      cartBadge: document.getElementById('cart-badge'),
      wishlistBtn: document.getElementById('wishlist-btn'),
      wishlistBadge: document.getElementById('wishlist-badge'),
      ordersBtn: document.getElementById('orders-btn'),

      // Navigation & Hero
      categoryNavList: document.getElementById('category-nav-list'),
      quickTagChips: document.querySelectorAll('.quick-tag-chip'),

      // Catalog & Filters
      productsGrid: document.getElementById('products-grid'),
      resultsCount: document.getElementById('results-count'),
      currentCategoryHeading: document.getElementById('current-category-heading'),
      sortSelect: document.getElementById('sort-select'),
      priceSlider: document.getElementById('price-slider'),
      priceMaxLabel: document.getElementById('price-max-label'),
      stockFilterCheckbox: document.getElementById('stock-filter-checkbox'),
      categoryRadios: document.getElementById('category-radio-group'),
      clearFiltersBtn: document.getElementById('clear-filters-btn'),

      // Modals & Drawers
      modalOverlay: document.getElementById('modal-overlay'),
      modalContainer: document.getElementById('modal-container'),
      modalCloseBtn: document.getElementById('modal-close-btn'),
      
      cartDrawerOverlay: document.getElementById('cart-drawer-overlay'),
      cartDrawerBody: document.getElementById('cart-drawer-body'),
      cartDrawerSubtotal: document.getElementById('cart-drawer-subtotal'),
      btnProceedCheckout: document.getElementById('btn-proceed-checkout'),
      closeCartDrawerBtn: document.getElementById('close-cart-drawer-btn'),

      wishlistDrawerOverlay: document.getElementById('wishlist-drawer-overlay'),
      wishlistDrawerBody: document.getElementById('wishlist-drawer-body'),
      closeWishlistDrawerBtn: document.getElementById('close-wishlist-drawer-btn'),

      checkoutModalOverlay: document.getElementById('checkout-modal-overlay'),
      checkoutForm: document.getElementById('checkout-form'),
      closeCheckoutModalBtn: document.getElementById('close-checkout-modal-btn'),
      checkoutPayableAmount: document.getElementById('checkout-payable-amount'),
      checkoutItemsCount: document.getElementById('checkout-items-count')
    };
  }

  subscribeState() {
    store.subscribe((state, event, payload) => {
      this.updateBadges();

      if (event === 'cart_updated') {
        this.renderCart();
        if (payload && payload.action === 'add') {
          showToast(`Added "${payload.product.name.slice(0, 25)}..." to cart!`, 'success');
        }
      } else if (event === 'wishlist_updated') {
        this.renderWishlist();
        this.refreshProductWishlistIcons();
        if (payload) {
          const msg = payload.added ? 'Added to Wishlist' : 'Removed from Wishlist';
          showToast(msg, 'success');
        }
      } else if (event === 'coupon_applied' || event === 'coupon_removed') {
        this.renderCart();
        this.updateCheckoutTotals();
      }
    });
  }

  bindEvents() {
    // 1. Search with debounce
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounceTimer);
        const query = e.target.value.trim();
        
        if (this.elements.searchClearBtn) {
          this.elements.searchClearBtn.classList.toggle('visible', query.length > 0);
        }

        this.searchDebounceTimer = setTimeout(() => {
          store.state.searchQuery = query;
          this.loadProducts();
        }, 300);
      });
    }

    if (this.elements.searchClearBtn) {
      this.elements.searchClearBtn.addEventListener('click', () => {
        this.elements.searchInput.value = '';
        this.elements.searchClearBtn.classList.remove('visible');
        store.state.searchQuery = '';
        this.loadProducts();
      });
    }

    // 2. Quick Search Tag Chips
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.quick-tag-chip');
      if (chip) {
        const query = chip.dataset.query || chip.textContent.trim();
        this.elements.searchInput.value = query;
        this.elements.searchClearBtn.classList.add('visible');
        store.state.searchQuery = query;
        this.loadProducts();
        window.scrollTo({ top: document.getElementById('catalog-section').offsetTop - 90, behavior: 'smooth' });
      }
    });

    // 3. Category Horizontal Pills
    if (this.elements.categoryNavList) {
      this.elements.categoryNavList.addEventListener('click', (e) => {
        const item = e.target.closest('.category-nav-item');
        if (item) {
          const cat = item.dataset.category;
          this.setActiveCategory(cat);
        }
      });
    }

    // 4. Sidebar Category Radios
    if (this.elements.categoryRadios) {
      this.elements.categoryRadios.addEventListener('change', (e) => {
        if (e.target.name === 'sidebar-category') {
          this.setActiveCategory(e.target.value);
        }
      });
    }

    // 5. Sorting Select
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', (e) => {
        store.state.sortBy = e.target.value;
        this.loadProducts();
      });
    }

    // 6. Price Slider
    if (this.elements.priceSlider) {
      this.elements.priceSlider.addEventListener('input', (e) => {
        const maxVal = parseInt(e.target.value, 10);
        store.state.maxPrice = maxVal;
        if (this.elements.priceMaxLabel) {
          this.elements.priceMaxLabel.textContent = formatINR(maxVal);
        }
      });
      this.elements.priceSlider.addEventListener('change', () => {
        this.loadProducts();
      });
    }

    // 7. Stock Filter Checkbox
    if (this.elements.stockFilterCheckbox) {
      this.elements.stockFilterCheckbox.addEventListener('change', (e) => {
        store.state.inStockOnly = e.target.checked;
        this.loadProducts();
      });
    }

    // 8. Clear Filters Button
    if (this.elements.clearFiltersBtn) {
      this.elements.clearFiltersBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // 9. Delegated Product Card Interactions (Card click, Add to Cart, Wishlist)
    document.addEventListener('click', async (e) => {
      // Toggle Wishlist
      const wishlistBtn = e.target.closest('[data-action="toggle-wishlist"]');
      if (wishlistBtn) {
        e.stopPropagation();
        const id = parseInt(wishlistBtn.dataset.productId, 10);
        const product = store.state.products.find(p => p.id === id);
        if (product) {
          store.toggleWishlist(product);
        }
        return;
      }

      // Add to Cart from Card
      const addCartBtn = e.target.closest('[data-action="add-cart"]');
      if (addCartBtn) {
        e.stopPropagation();
        const id = parseInt(addCartBtn.dataset.productId, 10);
        const product = store.state.products.find(p => p.id === id);
        if (product) {
          store.addToCart(product, 1);
        }
        return;
      }

      // Quick View / View Details
      const viewDetailsBtn = e.target.closest('[data-action="view-details"]') || e.target.closest('.product-card');
      if (viewDetailsBtn && !e.target.closest('button')) {
        const id = parseInt(viewDetailsBtn.dataset.productId, 10);
        if (id) {
          await this.openProductModal(id);
        }
        return;
      }

      // Modal Add to Cart
      const modalAddCart = e.target.closest('[data-action="modal-add-cart"]');
      if (modalAddCart) {
        const id = parseInt(modalAddCart.dataset.productId, 10);
        const qtySelect = document.getElementById('modal-product-qty');
        const qty = qtySelect ? parseInt(qtySelect.value, 10) : 1;
        const product = store.state.products.find(p => p.id === id) || store.state.selectedProduct;
        if (product) {
          store.addToCart(product, qty);
          this.closeModals();
        }
        return;
      }

      // Modal Buy Now
      const modalBuyNow = e.target.closest('[data-action="modal-buy-now"]');
      if (modalBuyNow) {
        const id = parseInt(modalBuyNow.dataset.productId, 10);
        const qtySelect = document.getElementById('modal-product-qty');
        const qty = qtySelect ? parseInt(qtySelect.value, 10) : 1;
        const product = store.state.products.find(p => p.id === id) || store.state.selectedProduct;
        if (product) {
          store.addToCart(product, qty);
          this.closeModals();
          this.openCheckoutModal();
        }
        return;
      }

      // Cart Quantity Controls
      const cartDec = e.target.closest('[data-action="cart-decrease"]');
      if (cartDec) {
        const id = parseInt(cartDec.dataset.productId, 10);
        const item = store.state.cart.find(i => i.product.id === id);
        if (item) {
          store.updateCartQuantity(id, item.quantity - 1);
        }
        return;
      }

      const cartInc = e.target.closest('[data-action="cart-increase"]');
      if (cartInc) {
        const id = parseInt(cartInc.dataset.productId, 10);
        const item = store.state.cart.find(i => i.product.id === id);
        if (item) {
          store.updateCartQuantity(id, item.quantity + 1);
        }
        return;
      }

      const cartRemove = e.target.closest('[data-action="cart-remove"]');
      if (cartRemove) {
        const id = parseInt(cartRemove.dataset.productId, 10);
        store.removeFromCart(id);
        return;
      }

      // Wishlist Move to Cart
      const moveCart = e.target.closest('[data-action="wishlist-move-to-cart"]');
      if (moveCart) {
        const id = parseInt(moveCart.dataset.productId, 10);
        const product = store.state.wishlist.find(p => p.id === id);
        if (product) {
          store.addToCart(product, 1);
          store.toggleWishlist(product);
          showToast(`Moved "${product.name.slice(0, 20)}..." to Cart!`, 'success');
        }
        return;
      }

      // Close Drawers
      if (e.target.closest('[data-action="close-drawers"]')) {
        this.closeDrawers();
        return;
      }

      // Close Modals
      if (e.target.closest('[data-action="close-modals"]')) {
        this.closeModals();
        return;
      }

      // View My Orders from Confirmation
      if (e.target.closest('[data-action="view-my-orders"]')) {
        this.closeModals();
        this.openOrdersModal();
        return;
      }

      // Apply Coupon
      if (e.target.id === 'btn-apply-coupon') {
        const input = document.getElementById('cart-coupon-input');
        if (input && input.value.trim()) {
          const res = store.applyCoupon(input.value);
          showToast(res.message, res.success ? 'success' : 'error');
        }
        return;
      }

      // Remove Coupon
      if (e.target.closest('[data-action="remove-coupon"]')) {
        store.removeCoupon();
        showToast('Coupon removed', 'success');
        return;
      }

      // Pincode Check inside Modal
      if (e.target.id === 'btn-check-pincode') {
        this.handlePincodeCheck();
        return;
      }

      // Payment Method Card Selection
      const pmCard = e.target.closest('.payment-method-card');
      if (pmCard) {
        document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
        pmCard.classList.add('selected');
        const radio = pmCard.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      }
    });

    // 10. Drawer Toggles
    if (this.elements.cartBtn) {
      this.elements.cartBtn.addEventListener('click', () => this.openCartDrawer());
    }
    if (this.elements.closeCartDrawerBtn) {
      this.elements.closeCartDrawerBtn.addEventListener('click', () => this.closeDrawers());
    }
    if (this.elements.cartDrawerOverlay) {
      this.elements.cartDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.cartDrawerOverlay) this.closeDrawers();
      });
    }

    if (this.elements.wishlistBtn) {
      this.elements.wishlistBtn.addEventListener('click', () => this.openWishlistDrawer());
    }
    if (this.elements.closeWishlistDrawerBtn) {
      this.elements.closeWishlistDrawerBtn.addEventListener('click', () => this.closeDrawers());
    }
    if (this.elements.wishlistDrawerOverlay) {
      this.elements.wishlistDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.wishlistDrawerOverlay) this.closeDrawers();
      });
    }

    if (this.elements.ordersBtn) {
      this.elements.ordersBtn.addEventListener('click', () => this.openOrdersModal());
    }

    // Modal Close
    if (this.elements.modalCloseBtn) {
      this.elements.modalCloseBtn.addEventListener('click', () => this.closeModals());
    }
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.modalOverlay) this.closeModals();
      });
    }

    // Checkout Modal
    if (this.elements.btnProceedCheckout) {
      this.elements.btnProceedCheckout.addEventListener('click', () => {
        if (store.state.cart.length === 0) {
          showToast('Your cart is empty', 'error');
          return;
        }
        this.closeDrawers();
        this.openCheckoutModal();
      });
    }

    if (this.elements.closeCheckoutModalBtn) {
      this.elements.closeCheckoutModalBtn.addEventListener('click', () => {
        this.elements.checkoutModalOverlay.classList.remove('open');
      });
    }

    if (this.elements.checkoutModalOverlay) {
      this.elements.checkoutModalOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.checkoutModalOverlay) {
          this.elements.checkoutModalOverlay.classList.remove('open');
        }
      });
    }

    // Checkout Form Submission (Actual PostgreSQL Order Placement)
    if (this.elements.checkoutForm) {
      this.elements.checkoutForm.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
    }

    // Keyboard ESC to close any modal or drawer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModals();
        this.closeDrawers();
      }
    });
  }

  // Load and Render Categories
  async loadCategories() {
    const cats = await api.getCategories();
    store.state.categories = cats;

    if (this.elements.categoryNavList) {
      // Build top category bar
      let html = `
        <li class="category-nav-item active" data-category="All">
          <span class="category-icon">🛍️</span>
          <span>All Categories</span>
        </li>
      `;
      cats.forEach(c => {
        html += `
          <li class="category-nav-item" data-category="${c.name}">
            <span class="category-icon">${c.icon}</span>
            <span>${c.name}</span>
          </li>
        `;
      });
      this.elements.categoryNavList.innerHTML = html;
    }

    if (this.elements.categoryRadios) {
      // Build sidebar radio list
      let radioHtml = `
        <label class="filter-radio-label">
          <input type="radio" name="sidebar-category" value="All" checked />
          <span>All Categories</span>
        </label>
      `;
      cats.forEach(c => {
        radioHtml += `
          <label class="filter-radio-label">
            <input type="radio" name="sidebar-category" value="${c.name}" />
            <span>${c.icon} ${c.name}</span>
          </label>
        `;
      });
      this.elements.categoryRadios.innerHTML = radioHtml;
    }
  }

  // Load and Render Products
  async loadProducts() {
    this.elements.productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
        <div style="font-size: 2rem; animation: pulseGlow 1.5s infinite;">⏳</div>
        <p style="margin-top: 0.5rem; color: var(--text-muted);">Loading realistic catalogue...</p>
      </div>
    `;

    const params = {
      category: store.state.activeCategory,
      search: store.state.searchQuery,
      sort: store.state.sortBy,
      maxPrice: store.state.maxPrice,
      inStockOnly: store.state.inStockOnly
    };

    const products = await api.getProducts(params);
    store.state.products = products;
    this.renderProductGrid(products);
  }

  renderProductGrid(products) {
    if (this.elements.resultsCount) {
      this.elements.resultsCount.textContent = products.length;
    }

    if (this.elements.currentCategoryHeading) {
      this.elements.currentCategoryHeading.textContent = store.state.activeCategory === 'All' 
        ? 'All Lifestyle Products' 
        : store.state.activeCategory;
    }

    if (products.length === 0) {
      this.elements.productsGrid.innerHTML = `
        <div class="empty-catalog-state">
          <div class="empty-icon">🔍</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">No Products Found</h3>
          <p style="color: var(--text-muted); max-width: 420px; margin: 0 auto 1.25rem;">
            No items matched your current filters. Try resetting the category, search term, or price range.
          </p>
          <button type="button" class="btn btn-primary btn-sm" id="btn-empty-reset">Reset All Filters</button>
        </div>
      `;
      const btnReset = document.getElementById('btn-empty-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => this.resetFilters());
      }
      return;
    }

    this.elements.productsGrid.innerHTML = products.map(renderProductCard).join('');
  }

  // Set Active Category and Sync Tabs/Radios
  setActiveCategory(category) {
    store.state.activeCategory = category;

    // Update Top Nav Bar
    if (this.elements.categoryNavList) {
      this.elements.categoryNavList.querySelectorAll('.category-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
      });
    }

    // Update Sidebar Radio
    if (this.elements.categoryRadios) {
      const radio = this.elements.categoryRadios.querySelector(`input[value="${category}"]`);
      if (radio) radio.checked = true;
    }

    this.loadProducts();
  }

  // Reset Filters
  resetFilters() {
    store.state.activeCategory = 'All';
    store.state.searchQuery = '';
    store.state.sortBy = 'popular';
    store.state.maxPrice = 3000;
    store.state.inStockOnly = false;

    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
      this.elements.searchClearBtn.classList.remove('visible');
    }
    if (this.elements.sortSelect) this.elements.sortSelect.value = 'popular';
    if (this.elements.priceSlider) this.elements.priceSlider.value = '3000';
    if (this.elements.priceMaxLabel) this.elements.priceMaxLabel.textContent = '₹3,000';
    if (this.elements.stockFilterCheckbox) this.elements.stockFilterCheckbox.checked = false;

    this.setActiveCategory('All');
  }

  // Open Product Details Modal
  async openProductModal(productId) {
    const data = await api.getProductById(productId);
    if (!data || !data.data) {
      showToast('Product details unavailable', 'error');
      return;
    }

    store.state.selectedProduct = data.data;
    this.elements.modalContainer.innerHTML = renderProductDetailModal(data.data, data.related || []);
    this.elements.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // Pincode Delivery Check Inside Modal
  handlePincodeCheck() {
    const input = document.getElementById('modal-pincode-input');
    const resultDiv = document.getElementById('modal-pincode-result');
    if (!input || !resultDiv) return;

    const val = input.value.trim();
    if (!/^\d{6}$/.test(val)) {
      resultDiv.innerHTML = `<span style="color: var(--danger);">⚠️ Please enter a valid 6-digit Indian pincode</span>`;
      return;
    }

    // Dynamic realistic Indian pincode simulation
    const days = (parseInt(val.slice(-1), 10) % 3) + 2;
    resultDiv.innerHTML = `
      <span style="color: var(--success); font-weight: 700;">
        ✓ Delivery available to Pincode ${val}!
      </span>
      <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
        Expected by <strong>${new Date(Date.now() + days * 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong> | Cash on Delivery Available
      </div>
    `;
  }

  // Drawers & Modals
  openCartDrawer() {
    this.renderCart();
    this.elements.cartDrawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  openWishlistDrawer() {
    this.renderWishlist();
    this.elements.wishlistDrawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeDrawers() {
    this.elements.cartDrawerOverlay.classList.remove('open');
    this.elements.wishlistDrawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeModals() {
    this.elements.modalOverlay.classList.remove('open');
    this.elements.checkoutModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Open Checkout Modal
  openCheckoutModal() {
    const totals = store.getCartTotals();
    if (this.elements.checkoutPayableAmount) {
      this.elements.checkoutPayableAmount.textContent = formatINR(totals.finalTotal);
    }
    if (this.elements.checkoutItemsCount) {
      this.elements.checkoutItemsCount.textContent = totals.itemCount;
    }
    this.elements.checkoutModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // Open Orders Modal
  async openOrdersModal() {
    const orders = await api.getOrders();
    this.elements.modalContainer.innerHTML = renderOrdersHistory(orders);
    this.elements.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // Handle Checkout Form Submission (PostgreSQL Write)
  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const customerName = form.customer_name.value.trim();
    const customerPhone = form.customer_phone.value.trim();
    const customerEmail = form.customer_email.value.trim();
    const pincode = form.pincode.value.trim();
    const city = form.city.value.trim();
    const state = form.state.value;
    const address = form.address.value.trim();
    const paymentMethod = form.payment_method.value || 'Cash on Delivery';

    if (!customerName || !customerPhone || !pincode || !city || !state || !address) {
      showToast('Please fill all required address fields', 'error');
      return;
    }

    if (!/^\d{10}$/.test(customerPhone.replace(/[\s-+]/g, '').slice(-10))) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    const totals = store.getCartTotals();
    const items = store.state.cart.map(i => ({
      product_id: i.product.id,
      quantity: i.quantity
    }));

    const orderPayload = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      shipping_address: address,
      city: city,
      state: state,
      pincode: pincode,
      payment_method: paymentMethod,
      discount_amount: totals.couponDiscount,
      items: items
    };

    // Show loading state on button
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Processing Order with PostgreSQL...</span>`;

    try {
      const res = await api.createOrder(orderPayload);
      if (res.success && res.data) {
        // Clear Cart
        store.clearCart();

        // Close Checkout Modal & Open Order Confirmation
        this.elements.checkoutModalOverlay.classList.remove('open');
        this.elements.modalContainer.innerHTML = renderOrderConfirmation(res.data);
        this.elements.modalOverlay.classList.add('open');
        showToast('Order placed successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to place order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to backend database', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>⚡ Confirm & Place Order</span>`;
    }
  }

  // Update Cart Drawer UI
  renderCart() {
    const totals = store.getCartTotals();
    if (this.elements.cartDrawerBody) {
      this.elements.cartDrawerBody.innerHTML = renderCartDrawer(
        store.state.cart,
        totals,
        store.state.appliedCoupon
      );
    }
    if (this.elements.cartDrawerSubtotal) {
      this.elements.cartDrawerSubtotal.textContent = formatINR(totals.finalTotal);
    }
    if (this.elements.btnProceedCheckout) {
      this.elements.btnProceedCheckout.disabled = store.state.cart.length === 0;
    }
  }

  // Update Wishlist Drawer UI
  renderWishlist() {
    if (this.elements.wishlistDrawerBody) {
      this.elements.wishlistDrawerBody.innerHTML = renderWishlistDrawer(store.state.wishlist);
    }
  }

  // Refresh Wishlist Icon States on Rendered Cards
  refreshProductWishlistIcons() {
    document.querySelectorAll('.product-card').forEach(card => {
      const id = parseInt(card.dataset.productId, 10);
      const isWishlisted = store.isInWishlist(id);
      const btn = card.querySelector('.product-wishlist-btn');
      if (btn) {
        btn.classList.toggle('active', isWishlisted);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isWishlisted ? '#e11d48' : 'none');
      }
    });
  }

  // Update Checkout Totals
  updateCheckoutTotals() {
    const totals = store.getCartTotals();
    if (this.elements.checkoutPayableAmount) {
      this.elements.checkoutPayableAmount.textContent = formatINR(totals.finalTotal);
    }
  }

  // Update Badges on Header
  updateBadges() {
    const totals = store.getCartTotals();
    if (this.elements.cartBadge) {
      this.elements.cartBadge.textContent = totals.itemCount;
      this.elements.cartBadge.style.display = totals.itemCount > 0 ? 'flex' : 'none';
    }

    if (this.elements.wishlistBadge) {
      const count = store.state.wishlist.length;
      this.elements.wishlistBadge.textContent = count;
      this.elements.wishlistBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app;
  window.appCategory = (cat) => app.setActiveCategory(cat);
  app.init();
});

