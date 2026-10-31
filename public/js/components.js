// ShopEase UI Components & HTML Renderers
import { store } from './state.js';

// Format Indian Rupee currency
export function formatINR(amount) {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// 1. Render Single Product Card
export function renderProductCard(product) {
  const isWishlisted = store.isInWishlist(product.id);
  const discount = product.discount || Math.round(((product.original_price - product.price) / product.original_price) * 100);

  return `
    <article class="product-card animate-fade" data-product-id="${product.id}" id="product-card-${product.id}">
      <div class="product-image-wrap">
        <span class="badge badge-discount product-badge-float">${discount}% OFF</span>
        <button 
          type="button" 
          class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" 
          data-action="toggle-wishlist" 
          data-product-id="${product.id}"
          title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}"
          aria-label="Wishlist toggle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? '#e11d48' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <img 
          src="${product.image_url}" 
          alt="${escapeHtml(product.name)}" 
          loading="lazy" 
          onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';"
        />
      </div>

      <div class="product-content">
        <div class="product-category-tag">${escapeHtml(product.category)}</div>
        <h3 class="product-title" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>

        <div class="product-pricing">
          <span class="current-price">${formatINR(product.price)}</span>
          <span class="original-price">${formatINR(product.original_price)}</span>
          <span class="discount-percent">${discount}% off</span>
        </div>

        <div class="product-meta-row">
          <div class="rating-pill">
            <span>★</span>
            <span>${product.rating || '4.5'}</span>
          </div>
          <span class="review-count-text">(${product.review_count || 120} reviews)</span>
          <span class="free-delivery-tag">🚚 Free Delivery</span>
        </div>

        <div class="product-card-actions">
          <button 
            type="button" 
            class="btn btn-secondary btn-sm btn-block" 
            data-action="view-details" 
            data-product-id="${product.id}"
          >
            Quick View
          </button>
          <button 
            type="button" 
            class="btn btn-primary btn-sm btn-block" 
            data-action="add-cart" 
            data-product-id="${product.id}"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  `;
}

// 2. Render Product Details Modal Content
export function renderProductDetailModal(product, related = []) {
  const isWishlisted = store.isInWishlist(product.id);
  const discount = product.discount || Math.round(((product.original_price - product.price) / product.original_price) * 100);
  const savings = parseFloat(product.original_price) - parseFloat(product.price);
  const specs = typeof product.specifications === 'string' 
    ? JSON.parse(product.specifications || '{}') 
    : (product.specifications || {});

  let specsRows = '';
  for (const [key, val] of Object.entries(specs)) {
    specsRows += `
      <tr>
        <th>${escapeHtml(key)}</th>
        <td>${escapeHtml(val)}</td>
      </tr>
    `;
  }

  let relatedHtml = '';
  if (related && related.length > 0) {
    relatedHtml = `
      <div style="margin-top: 2rem; border-top: 1px solid var(--border-light); padding-top: 1.5rem;">
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Similar Products You May Like</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">
          ${related.map(r => `
            <div style="border: 1px solid var(--border-light); border-radius: 8px; padding: 0.5rem; text-align: center; cursor: pointer;" data-action="view-details" data-product-id="${r.id}">
              <img src="${r.image_url}" alt="${escapeHtml(r.name)}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 4px; margin-bottom: 0.4rem;" />
              <div style="font-size: 0.75rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(r.name)}</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary);">${formatINR(r.price)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="product-detail-grid">
      <div class="detail-gallery">
        <span class="badge badge-discount" style="position: absolute; top: 12px; left: 12px; z-index: 2; padding: 0.35rem 0.65rem;">
          ${discount}% SPECIAL DISCOUNT
        </span>
        <img 
          src="${product.image_url}" 
          alt="${escapeHtml(product.name)}" 
          class="detail-main-img" 
          onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';"
        />
        <div style="display: flex; gap: 0.75rem; margin-top: 1rem; align-items: center; justify-content: center;">
          <span class="badge badge-trust">🛡️ 100% Genuine</span>
          <span class="badge badge-seller">👑 Meesho Trusted Supplier</span>
          <span class="badge badge-warning">🔄 7-Day Easy Return</span>
        </div>
      </div>

      <div class="detail-info">
        <div class="detail-category-bread">${escapeHtml(product.category)}</div>
        <h2 class="detail-title">${escapeHtml(product.name)}</h2>

        <div class="detail-rating-row">
          <div class="rating-pill">
            <span>★</span>
            <span>${product.rating || '4.5'}</span>
          </div>
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
            ${product.review_count || 120} Verified Customer Ratings
          </span>
          <span style="font-size: 0.85rem; color: var(--success); font-weight: 700; margin-left: auto;">
            ● In Stock (${product.stock_quantity || 25} available)
          </span>
        </div>

        <div class="detail-price-box">
          <div style="display: flex; align-items: baseline; gap: 0.75rem;">
            <span style="font-size: 1.8rem; font-weight: 900; color: var(--text-primary);">${formatINR(product.price)}</span>
            <span style="font-size: 1.05rem; color: var(--text-muted); text-decoration: line-through;">${formatINR(product.original_price)}</span>
            <span style="font-size: 1rem; font-weight: 800; color: var(--success);">${discount}% off</span>
          </div>
          <div class="detail-savings">
            🎉 You save ${formatINR(savings)} on this supplier deal!
          </div>
        </div>

        <p class="detail-description">${escapeHtml(product.description)}</p>

        <!-- Pincode Checker -->
        <div class="pincode-check-box">
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem;">
            <span>📍 Check Delivery to Your Pincode:</span>
          </label>
          <div class="pincode-input-row">
            <input type="text" id="modal-pincode-input" placeholder="e.g. 560001" maxlength="6" />
            <button type="button" class="btn btn-outline btn-sm" id="btn-check-pincode">Check</button>
          </div>
          <div class="pincode-result" id="modal-pincode-result">
            🚚 Free Delivery across India in ${product.delivery_days || '3-5 Days'}
          </div>
        </div>

        <!-- Specifications -->
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">Product Highlights & Specs</h4>
          <table class="specs-table">
            <tbody>
              ${specsRows || '<tr><th>Origin</th><td>India</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Quantity & Actions -->
        <div class="detail-actions-row">
          <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-subtle); padding: 0.35rem 0.75rem; border-radius: var(--radius-sm);">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary);">Qty:</label>
            <select id="modal-product-qty" style="background: transparent; border: none; font-weight: 700; font-size: 0.95rem; cursor: pointer;">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          <button 
            type="button" 
            class="btn btn-secondary" 
            style="flex: 1;" 
            data-action="modal-add-cart" 
            data-product-id="${product.id}"
          >
            🛒 Add to Cart
          </button>

          <button 
            type="button" 
            class="btn btn-primary" 
            style="flex: 1.2;" 
            data-action="modal-buy-now" 
            data-product-id="${product.id}"
          >
            ⚡ Buy Now
          </button>

          <button 
            type="button" 
            class="btn btn-outline btn-icon" 
            data-action="toggle-wishlist" 
            data-product-id="${product.id}" 
            title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isWishlisted ? '#e11d48' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        ${relatedHtml}
      </div>
    </div>
  `;
}

// 3. Render Cart Drawer Contents
export function renderCartDrawer(cart, totals, appliedCoupon) {
  if (cart.length === 0) {
    return `
      <div style="text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🛒</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Your Cart is Empty</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
          Explore Indian lifestyle, fashion & decor products at lowest wholesale prices!
        </p>
        <button type="button" class="btn btn-primary" data-action="close-drawers">Start Shopping</button>
      </div>
    `;
  }

  const itemsHtml = cart.map(item => `
    <div class="cart-item-card" id="cart-item-${item.product.id}">
      <img src="${item.product.image_url}" alt="${escapeHtml(item.product.name)}" class="cart-item-img" />
      <div class="cart-item-info">
        <h4 class="cart-item-title">${escapeHtml(item.product.name)}</h4>
        <div class="cart-item-price">${formatINR(item.product.price)}</div>
        <div class="cart-qty-controls">
          <button type="button" class="cart-qty-btn" data-action="cart-decrease" data-product-id="${item.product.id}">-</button>
          <span class="cart-qty-val">${item.quantity}</span>
          <button type="button" class="cart-qty-btn" data-action="cart-increase" data-product-id="${item.product.id}">+</button>
        </div>
      </div>
      <button type="button" class="cart-item-remove-btn" data-action="cart-remove" data-product-id="${item.product.id}" title="Remove item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  return `
    <div class="cart-items-list">
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.825rem; font-weight: 700; color: #047857; display: flex; align-items: center; gap: 0.5rem;">
        <span>🚚</span> 100% Free Delivery Applied to All Items!
      </div>

      ${itemsHtml}

      <!-- Coupon section -->
      <div style="background: #f8fafc; border: 1px solid var(--border-light); border-radius: 8px; padding: 0.85rem; margin-top: 0.5rem;">
        <div style="font-size: 0.825rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.4rem;">
          🏷️ Have a Promo Coupon?
        </div>
        ${appliedCoupon ? `
          <div style="display: flex; align-items: center; justify-content: space-between; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.5rem 0.75rem; border-radius: 6px;">
            <div>
              <strong style="color: var(--success); font-size: 0.85rem;">${appliedCoupon.code}</strong>
              <div style="font-size: 0.75rem; color: #047857;">${appliedCoupon.label}</div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-action="remove-coupon" style="color: var(--danger); border-color: #fca5a5;">Remove</button>
          </div>
        ` : `
          <div class="coupon-input-group">
            <input type="text" id="cart-coupon-input" placeholder="e.g. WELCOME100" />
            <button type="button" class="btn btn-outline btn-sm" id="btn-apply-coupon">Apply</button>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            Try <span style="font-weight: 700; color: var(--primary); cursor: pointer;" onclick="document.getElementById('cart-coupon-input').value='WELCOME100'">WELCOME100</span> or <span style="font-weight: 700; color: var(--primary); cursor: pointer;" onclick="document.getElementById('cart-coupon-input').value='FESTIVE15'">FESTIVE15</span>
          </div>
        `}
      </div>

      <!-- Price Breakdown -->
      <div class="price-breakup" style="margin-top: 1rem;">
        <div class="price-row">
          <span>Total M.R.P:</span>
          <span>${formatINR(totals.mrpTotal)}</span>
        </div>
        <div class="price-row">
          <span>Supplier Catalog Discount:</span>
          <span style="color: var(--success);">- ${formatINR(totals.catalogDiscount)}</span>
        </div>
        ${totals.couponDiscount > 0 ? `
          <div class="price-row">
            <span>Coupon Savings:</span>
            <span style="color: var(--success);">- ${formatINR(totals.couponDiscount)}</span>
          </div>
        ` : ''}
        <div class="price-row">
          <span>Delivery Charges:</span>
          <span class="free-green">FREE (₹0)</span>
        </div>
        <div class="price-row total-row">
          <span>Total Order Value:</span>
          <span>${formatINR(totals.finalTotal)}</span>
        </div>
      </div>
    </div>
  `;
}

// 4. Render Wishlist Drawer Contents
export function renderWishlistDrawer(wishlist) {
  if (wishlist.length === 0) {
    return `
      <div style="text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">💖</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Your Wishlist is Empty</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
          Save your favourite ethnic kurtis, jhumkis, plants and crafts for later!
        </p>
        <button type="button" class="btn btn-primary" data-action="close-drawers">Explore Products</button>
      </div>
    `;
  }

  const itemsHtml = wishlist.map(product => `
    <div style="display: grid; grid-template-columns: 70px 1fr auto; gap: 0.85rem; padding: 0.85rem; border: 1px solid var(--border-light); border-radius: 8px; background: #ffffff; align-items: center;">
      <img src="${product.image_url}" alt="${escapeHtml(product.name)}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px;" />
      <div>
        <h4 style="font-size: 0.875rem; font-weight: 600; line-height: 1.3; margin-bottom: 0.25rem;">${escapeHtml(product.name)}</h4>
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">${formatINR(product.price)}</div>
        <button type="button" class="btn btn-primary btn-sm" data-action="wishlist-move-to-cart" data-product-id="${product.id}">
          Move to Cart
        </button>
      </div>
      <button type="button" class="cart-item-remove-btn" data-action="toggle-wishlist" data-product-id="${product.id}" title="Remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  return `
    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
        You have saved <strong>${wishlist.length} item${wishlist.length > 1 ? 's' : ''}</strong>
      </div>
      ${itemsHtml}
    </div>
  `;
}

// 5. Render Order Confirmation Screen
export function renderOrderConfirmation(order) {
  const estDate = new Date();
  estDate.setDate(estDate.getDate() + 4);
  const formattedEstDate = estDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return `
    <div style="padding: 2.5rem 2rem; text-align: center;">
      <div style="width: 70px; height: 70px; border-radius: 50%; background: #ecfdf5; color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1.25rem; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        ✓
      </div>
      <span class="badge badge-trust" style="font-size: 0.85rem; padding: 0.35rem 0.85rem; margin-bottom: 0.75rem;">
        Payment: ${escapeHtml(order.payment_method)}
      </span>
      <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary);">
        Order Placed Successfully!
      </h2>
      <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
        Thank you, <strong>${escapeHtml(order.customer_name)}</strong>. Your order has been recorded in the database.
      </p>

      <div style="background: #f8fafc; border: 1px solid var(--border-light); border-radius: 12px; padding: 1.25rem; text-align: left; max-width: 520px; margin: 0 auto 1.5rem;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Order Number</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${escapeHtml(order.order_number)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Estimated Delivery</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--success);">${formattedEstDate}</div>
          </div>
        </div>

        <div style="margin-bottom: 0.75rem;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Shipping To</div>
          <div style="font-size: 0.875rem; font-weight: 600;">${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_phone)})</div>
          <div style="font-size: 0.825rem; color: var(--text-secondary);">${escapeHtml(order.shipping_address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pincode)}</div>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-light); padding-top: 0.75rem; font-weight: 800; font-size: 1.05rem;">
          <span>Total Paid (INR):</span>
          <span>${formatINR(order.total_amount)}</span>
        </div>
      </div>

      <!-- Tracking Stepper -->
      <div class="tracking-stepper" style="max-width: 520px; margin: 0 auto 2rem;">
        <div class="stepper-step completed">
          <div class="step-circle">✓</div>
          <span class="step-label">Confirmed</span>
        </div>
        <div class="stepper-step active">
          <div class="step-circle">2</div>
          <span class="step-label">Packing</span>
        </div>
        <div class="stepper-step">
          <div class="step-circle">3</div>
          <span class="step-label">Shipped</span>
        </div>
        <div class="stepper-step">
          <div class="step-circle">4</div>
          <span class="step-label">Delivered</span>
        </div>
      </div>

      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button type="button" class="btn btn-outline" data-action="view-my-orders">View in My Orders</button>
        <button type="button" class="btn btn-primary" data-action="close-modals">Continue Shopping</button>
      </div>
    </div>
  `;
}

// 6. Render My Orders History Modal Content
export function renderOrdersHistory(orders) {
  if (!orders || orders.length === 0) {
    return `
      <div style="text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">📦</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">No Orders Found</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
          You haven't placed any orders yet. Start exploring the Meesho-inspired collection!
        </p>
        <button type="button" class="btn btn-primary" data-action="close-modals">Shop Now</button>
      </div>
    `;
  }

  const listHtml = orders.map(order => {
    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsSummary = (order.items || []).map(i => `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <img src="${i.product_image}" alt="${escapeHtml(i.product_name)}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px;" />
        <div style="font-size: 0.85rem; font-weight: 600; flex: 1;">${escapeHtml(i.product_name)}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">${i.quantity} x ${formatINR(i.unit_price)}</div>
      </div>
    `).join('');

    return `
      <div class="order-history-card">
        <div class="order-history-header">
          <div>
            <span class="order-id-code">${escapeHtml(order.order_number)}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-trust">${escapeHtml(order.order_status || 'Confirmed')}</span>
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${formatINR(order.total_amount)}</div>
          </div>
        </div>

        <div class="order-history-items" style="margin-bottom: 0.85rem;">
          ${itemsSummary}
        </div>

        <div style="font-size: 0.8rem; color: var(--text-secondary); background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span>📍 Deliver to: <strong>${escapeHtml(order.city)}, ${escapeHtml(order.state)}</strong></span>
          <span>Payment: <strong>${escapeHtml(order.payment_method)}</strong></span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="padding: 1.5rem 2rem;">
      <h3 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
        <span>📦</span> My Orders History (${orders.length})
      </h3>
      <div class="orders-list">
        ${listHtml}
      </div>
    </div>
  `;
}

// 7. Toast Notification Utility
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Escape helper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
