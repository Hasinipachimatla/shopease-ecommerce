const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./db/config');
const { initAndSeedDb } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= API ROUTES =================

// 1. Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, icon, description, banner_color FROM categories ORDER BY id ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// 2. Get Products (with Search, Filter, Sort, Price range)
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice, inStockOnly } = req.query;

    let queryText = `
      SELECT p.*, c.name as category_name, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];

    // Filter by Category
    if (category && category !== 'All' && category !== 'all') {
      queryParams.push(category);
      queryText += ` AND (p.category ILIKE $${queryParams.length} OR c.slug ILIKE $${queryParams.length})`;
    }

    // Filter by Search (Name or Description)
    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim()}%`);
      queryText += ` AND (p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length} OR p.category ILIKE $${queryParams.length})`;
    }

    // Price range
    if (minPrice && !isNaN(minPrice)) {
      queryParams.push(parseFloat(minPrice));
      queryText += ` AND p.price >= $${queryParams.length}`;
    }
    if (maxPrice && !isNaN(maxPrice)) {
      queryParams.push(parseFloat(maxPrice));
      queryText += ` AND p.price <= $${queryParams.length}`;
    }

    // In Stock Only
    if (inStockOnly === 'true') {
      queryText += ` AND p.stock_quantity > 0`;
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        queryText += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        queryText += ' ORDER BY p.price DESC';
        break;
      case 'rating':
        queryText += ' ORDER BY p.rating DESC, p.review_count DESC';
        break;
      case 'discount':
        queryText += ' ORDER BY p.discount DESC';
        break;
      case 'newest':
        queryText += ' ORDER BY p.id DESC';
        break;
      case 'popular':
      default:
        queryText += ' ORDER BY p.review_count DESC, p.rating DESC';
        break;
    }

    const result = await pool.query(queryText, queryParams);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// 3. Get Single Product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.icon as category_icon, c.description as category_description
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch related products from same category
    const product = result.rows[0];
    const relatedResult = await pool.query(
      `SELECT id, name, price, original_price, discount, rating, review_count, image_url, badge
       FROM products
       WHERE category = $1 AND id != $2
       LIMIT 4`,
      [product.category, product.id]
    );

    res.json({
      success: true,
      data: product,
      related: relatedResult.rows
    });
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch product details' });
  }
});

// 4. Create Order (Checkout with PostgreSQL Transaction)
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      shipping_address,
      city,
      state,
      pincode,
      payment_method,
      items,
      discount_amount = 0
    } = req.body;

    // Validation
    if (!customer_name || !customer_phone || !shipping_address || !city || !state || !pincode) {
      return res.status(400).json({ success: false, error: 'Please provide all delivery address details' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    await client.query('BEGIN');

    // Calculate subtotal and verify products
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID ${item.product_id} does not exist`);
      }
      const prod = prodRes.rows[0];
      const qty = parseInt(item.quantity, 10) || 1;

      if (prod.stock_quantity < qty) {
        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}`);
      }

      const itemTotal = parseFloat(prod.price) * qty;
      subtotal += itemTotal;

      verifiedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        product_image: prod.image_url,
        quantity: qty,
        unit_price: prod.price,
        total_price: itemTotal
      });

      // Decrement stock quantity
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [qty, prod.id]);
    }

    const deliveryFee = 0.00; // Meesho style: Free delivery on all orders!
    const discount = parseFloat(discount_amount) || 0;
    const totalAmount = Math.max(0, subtotal - discount + deliveryFee);

    // Generate readable Indian Order Number (e.g., SE-IN-84932)
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `SE-IN-${Date.now().toString().slice(-4)}${randomSuffix}`;

    // Insert into orders
    const orderInsertRes = await client.query(
      `INSERT INTO orders 
       (order_number, customer_name, customer_phone, customer_email, shipping_address, city, state, pincode, payment_method, subtotal, discount_amount, delivery_fee, total_amount, order_status, tracking_step)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        orderNumber,
        customer_name,
        customer_phone,
        customer_email || null,
        shipping_address,
        city,
        state,
        pincode,
        payment_method || 'Cash on Delivery',
        subtotal,
        discount,
        deliveryFee,
        totalAmount,
        'Confirmed',
        1
      ]
    );

    const createdOrder = orderInsertRes.rows[0];

    // Insert order items
    for (const vItem of verifiedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [createdOrder.id, vItem.product_id, vItem.product_name, vItem.product_image, vItem.quantity, vItem.unit_price, vItem.total_price]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        ...createdOrder,
        items: verifiedItems
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to place order' });
  } finally {
    client.release();
  }
});

// 5. Get Past Orders (For order tracking & history)
app.get('/api/orders', async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20`
    );

    const orders = ordersRes.rows;
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// 6. Get Order By Order Number
app.get('/api/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const orderRes = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderRes.rows[0];
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = itemsRes.rows;

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// 7. Seed / Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ShopEase Backend', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA feel (Express 5 safe)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Start Server & Ensure DB Ready
async function startServer() {
  try {
    await initAndSeedDb();
    app.listen(PORT, () => {
      console.log(`🛍️ ShopEase server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
