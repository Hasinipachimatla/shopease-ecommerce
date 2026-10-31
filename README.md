# ShopEase — Indian Lifestyle & Fashion Marketplace

ShopEase is an Indian lifestyle and fashion e-commerce marketplace inspired by **Meesho**. It offers wholesale and retail access to authentic Indian apparel, handmade jewellery, herbal beauty products, indoor gardening essentials, DIY craft kits, and ethnic home decor directly from local artisans, weavers, and suppliers.

---

## 🌟 Key Features

1. **Six Curated Lifestyle Categories (36 Realistic Products):**
   - 👗 **Women's Fashion:** Pure Chanderi silk anarkalis, georgette sarees, banarasi weaves, chikankari kurtis, cotton maxi sets.
   - ✨ **Jewellery & Accessories:** Kundan choker sets, oxidised silver peacock jhumkas, 24K gold-plated bangles, meenakari earrings, potli bags.
   - 💄 **Beauty & Makeup:** Ayurvedic kumkumadi glow oil, velvet matte lipsticks, rose toner mist, charcoal peel-off mask, smudge-proof herbal kajal.
   - 🌿 **Plants & Gardening:** Sansevieria snake plants, Monstera Deliciosa, macrame plant hangers, golden pothos, succulent combos, rust-proof toolkits.
   - 🎨 **DIY & Crafts:** Crystal clear epoxy resin kits, mandala dot painting sets, hand embroidery hoops, soy candle making wax, terracotta clay sets.
   - 🪔 **Home Decor:** Handcrafted brass Ganesha urli bowls, bohemian tufted cushions, ceramic aroma diffusers, braided jute floor rugs, brass elephant burners.
   *(Zero electronics, phones, or computer gadgets as requested)*

2. **Search, Filter & Sort:**
   - Instant search across product titles, descriptions, and categories.
   - Horizontal category story pills + sidebar radio filters.
   - Price range slider (₹200 to ₹3,000 INR).
   - In-stock availability filter.
   - Multiple sorting options: Popularity, Price (Low to High / High to Low), Customer Ratings, Biggest Discount, New Arrivals.

3. **Interactive Product Details:**
   - High-resolution product images with zoom and badge tags (*"Meesho Best Seller"*, *"Artisan Crafted"*).
   - Detailed Indian specifications (Fabric, Material, Net Quantity, Country of Origin: India).
   - **Interactive Pincode Delivery Checker:** Enter any 6-digit Indian pincode (e.g., `560001`, `110001`, `400001`) for delivery date and COD estimation.
   - Quantity selector (+/-) with quick "Add to Cart" and "Buy Now".

4. **Wishlist & Cart System:**
   - Persistent wishlist with animated heart toggle and one-click "Move to Cart".
   - Slide-out cart drawer with quantity adjustments, item removal, and live price breakdown (Total M.R.P., Supplier Discount, Delivery Charges).
   - **Active Promotional Coupons:**
     - `WELCOME100`: Flat ₹100 discount on first order.
     - `FESTIVE15`: 15% discount for the festive mela.

5. **PostgreSQL Checkout & Order Placement:**
   - Seamless checkout modal supporting complete Indian address format (Full Name, 10-digit mobile number, Street/Locality, Pincode, City, State dropdown).
   - Payment method selection: Cash on Delivery (COD), UPI (GPay, PhonePe, Paytm, BHIM), Cards, and Net Banking.
   - **Live PostgreSQL Transactions:** Inserts orders in `orders` and `order_items` tables, decrements product stock quantities, and produces tracking order numbers (e.g., `SE-IN-XXXXX`).
   - Order confirmation screen with 4-step progress tracker (*Confirmed -> Packing -> Shipped -> Delivered*).
   - **My Orders History:** View and track all past orders directly fetched from the PostgreSQL database.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express 5, `pg` (node-postgres connection pool).
- **Database:** PostgreSQL 17 (`shopease_db`).
- **Frontend:** Semantic HTML5, Vanilla CSS with custom properties design system (Meesho-inspired Magenta `#9c1c62`, Saffron Gold `#f59e0b`, Emerald Green `#059669`), and ES6 modular JavaScript.
- **Port:** `http://localhost:5000`

---

## 🚀 Getting Started

### 1. Database Setup
Ensure PostgreSQL is running locally on port 5432 with database `shopease_db`.
To manually run migrations and seed products:
```bash
npm run seed
```

### 2. Start the Server
```bash
npm start
```
Open `http://localhost:5000` in your web browser.

---

## 📋 API Endpoints

- `GET /api/categories` — List all 6 categories.
- `GET /api/products` — Filter, search, and sort products (`?category=...&search=...&sort=...&maxPrice=...`).
- `GET /api/products/:id` — Single product details and related recommendations.
- `POST /api/orders` — Create a new order (PostgreSQL transaction with stock deduction).
- `GET /api/orders` — List order history.
- `GET /api/orders/:orderNumber` — Retrieve specific order details.
