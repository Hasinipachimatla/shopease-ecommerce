const fs = require('fs');
const path = require('path');
const { pool, query } = require('./config');
const { categories, products } = require('./seedData');

async function initAndSeedDb() {
  const client = await pool.connect();
  try {
    console.log('Initializing PostgreSQL database schema...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('Schema verified/created.');

    // Seed categories
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, slug, icon, description, banner_color)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE 
         SET slug = EXCLUDED.slug, icon = EXCLUDED.icon, description = EXCLUDED.description, banner_color = EXCLUDED.banner_color`,
        [cat.name, cat.slug, cat.icon, cat.description, cat.banner_color]
      );
    }
    console.log('Categories seeded.');

    // Fetch category map
    const catRes = await client.query('SELECT id, name FROM categories');
    const catMap = {};
    catRes.rows.forEach(row => {
      catMap[row.name] = row.id;
    });

    // Check existing products count
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    const productCount = parseInt(countRes.rows[0].count, 10);

    if (productCount < 30) {
      console.log(`Current product count is ${productCount}. Seeding 36 realistic catalogue products...`);
      // Delete old products if any partial seed happened
      await client.query('DELETE FROM products');
      
      for (const prod of products) {
        const catId = catMap[prod.category] || null;
        await client.query(
          `INSERT INTO products 
           (name, slug, description, category, category_id, price, original_price, discount, stock_quantity, rating, review_count, image_url, badge, delivery_days, specifications)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            prod.name,
            prod.slug,
            prod.description,
            prod.category,
            catId,
            prod.price,
            prod.original_price,
            prod.discount,
            prod.stock_quantity,
            prod.rating,
            prod.review_count,
            prod.image_url,
            prod.badge,
            prod.delivery_days,
            JSON.stringify(prod.specifications || {})
          ]
        );
      }
      console.log('Products seeded successfully (36 products across 6 categories).');
    } else {
      console.log(`Database already contains ${productCount} products.`);
    }

  } catch (err) {
    console.error('Database initialization/seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (require.main === module) {
  initAndSeedDb()
    .then(() => {
      console.log('Database initialization complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initAndSeedDb };
