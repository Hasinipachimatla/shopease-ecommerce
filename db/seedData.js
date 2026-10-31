// 36 Realistic Indian Lifestyle & Fashion Products for ShopEase (Meesho-inspired)

const categories = [
  {
    name: "Women's Fashion",
    slug: 'womens-fashion',
    icon: '👗',
    description: 'Ethnic sarees, designer kurtis, anarkalis, festive lehengas and daily fusion wear.',
    banner_color: '#fce7f3'
  },
  {
    name: 'Jewellery & Accessories',
    slug: 'jewellery-accessories',
    icon: '✨',
    description: 'Kundan necklaces, oxidised silver jhumkas, meenakari earrings, bangles and potli bags.',
    banner_color: '#fef3c7'
  },
  {
    name: 'Beauty & Makeup',
    slug: 'beauty-makeup',
    icon: '💄',
    description: 'Ayurvedic skincare oils, smudge-proof kajal, matte liquid lipsticks and herbal masks.',
    banner_color: '#ffe4e6'
  },
  {
    name: 'Plants & Gardening',
    slug: 'plants-gardening',
    icon: '🌿',
    description: 'Air-purifying indoor plants, ceramic pots, macrame planters and ergonomic garden tools.',
    banner_color: '#dcfce7'
  },
  {
    name: 'DIY & Crafts',
    slug: 'diy-crafts',
    icon: '🎨',
    description: 'Resin art kits, mandala dotting tools, embroidery hoops and natural soy candle wax sets.',
    banner_color: '#e0e7ff'
  },
  {
    name: 'Home Decor',
    slug: 'home-decor',
    icon: '🪔',
    description: 'Brass urli bowls, bohemian tufted cushions, aroma diffusers, and handcrafted jute rugs.',
    banner_color: '#ffedd5'
  }
];

const products = [
  // ================= 1. WOMEN'S FASHION (6 Products) =================
  {
    name: "Chanderi Silk Anarkali Kurta & Organza Dupatta Set",
    slug: "chanderi-silk-anarkali-kurta-dupatta-set",
    description: "Graceful festive 3-piece set featuring pure Chanderi silk flared Anarkali with intricate golden zari border work, matching pants, and a digitally printed organza dupatta with scalloped edges.",
    category: "Women's Fashion",
    price: 1249.00,
    original_price: 2999.00,
    discount: 58,
    stock_quantity: 45,
    rating: 4.8,
    review_count: 642,
    image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    badge: "Meesho Best Seller",
    delivery_days: "3-4 Days",
    specifications: {
      "Fabric": "Pure Chanderi Silk",
      "Pattern": "Zari Embroidered",
      "Sleeve Length": "Three-Quarter Sleeves",
      "Set Type": "Kurta with Bottomwear & Dupatta",
      "Occasion": "Festive / Wedding / Traditional",
      "Origin": "India (Jaipur, Rajasthan)"
    }
  },
  {
    name: "Floral Printed Georgette Saree with Unstitched Blouse",
    slug: "floral-printed-georgette-saree-blouse",
    description: "Ultra-lightweight premium georgette saree embellished with delicate pastel floral prints and thin lace border. Drapes effortlessly and is perfect for daytime events and office gatherings.",
    category: "Women's Fashion",
    price: 699.00,
    original_price: 1799.00,
    discount: 61,
    stock_quantity: 60,
    rating: 4.5,
    review_count: 389,
    image_url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
    badge: "Trending",
    delivery_days: "2-3 Days",
    specifications: {
      "Saree Fabric": "Pure Georgette",
      "Blouse Fabric": "Banglori Silk (0.8m)",
      "Length": "5.5 metres Saree + 0.8m Blouse",
      "Wash Care": "Hand Wash / Dry Clean",
      "Origin": "India (Surat, Gujarat)"
    }
  },
  {
    name: "Lucknowi Chikankari Hand-Embroidered Kurta & Palazzo",
    slug: "lucknowi-chikankari-embroidered-kurta-palazzo",
    description: "Authentic Lucknowi hand-crafted Chikankari modal cotton kurta with intricate shadow work embroidery on chest and hemline, paired with matching flared breathable palazzos.",
    category: "Women's Fashion",
    price: 999.00,
    original_price: 2199.00,
    discount: 54,
    stock_quantity: 32,
    rating: 4.7,
    review_count: 512,
    image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    badge: "Artisan Crafted",
    delivery_days: "3-5 Days",
    specifications: {
      "Fabric": "100% Breathable Modal Cotton",
      "Embroidery": "Handmade Lucknow Chikankari",
      "Fit": "Regular Comfort Fit",
      "Includes": "Kurta + Flared Palazzo",
      "Origin": "India (Lucknow, UP)"
    }
  },
  {
    name: "Traditional Banarasi Jacquard Woven Saree (Royal Crimson)",
    slug: "banarasi-jacquard-woven-saree-crimson",
    description: "Royal banarasi soft silk saree woven with rich golden zari floral jaal motifs all over. Comes with rich zari pallu and attached running unstitched brocade blouse piece.",
    category: "Women's Fashion",
    price: 1599.00,
    original_price: 3499.00,
    discount: 54,
    stock_quantity: 25,
    rating: 4.9,
    review_count: 820,
    image_url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80",
    badge: "Festive Pick",
    delivery_days: "3-4 Days",
    specifications: {
      "Fabric": "Banarasi Litchi Soft Silk",
      "Weave Type": "Jacquard Zari Weaving",
      "Pallu": "Heavy Golden Resham Zari",
      "Blouse Piece": "Included (Unstitched 80cm)",
      "Origin": "India (Varanasi, UP)"
    }
  },
  {
    name: "Embroidered Rayon Straight Daily Wear Kurti (Lilac & Ivory)",
    slug: "embroidered-rayon-straight-kurti-lilac",
    description: "Soft 14kg heavy rayon straight-fit kurti featuring delicate thread embroidery on neckline and sleeves. Breathable and comfortable for everyday college, work, or casual outings.",
    category: "Women's Fashion",
    price: 449.00,
    original_price: 999.00,
    discount: 55,
    stock_quantity: 80,
    rating: 4.4,
    review_count: 245,
    image_url: "https://images.unsplash.com/photo-1596783074418-4720977a0665?auto=format&fit=crop&w=800&q=80",
    badge: "Lowest Price",
    delivery_days: "2-4 Days",
    specifications: {
      "Fabric": "14kg Premium Rayon",
      "Neck": "Round Neck with Slit",
      "Length": "Calf Length (44 inches)",
      "Style": "Straight Cut",
      "Origin": "India"
    }
  },
  {
    name: "Cotton Tiered Ethnic Maxi Dress with Printed Shrug",
    slug: "cotton-tiered-ethnic-maxi-dress-shrug",
    description: "Stunning bohemian fusion two-piece outfit featuring a sleeveless tiered cotton maxi inner dress layered with a full-length floral block-printed front-open shrug.",
    category: "Women's Fashion",
    price: 799.00,
    original_price: 1599.00,
    discount: 50,
    stock_quantity: 38,
    rating: 4.6,
    review_count: 178,
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    badge: "Trending",
    delivery_days: "3-5 Days",
    specifications: {
      "Fabric": "100% Pure Cambric Cotton",
      "Layers": "Inner Slip Dress + Outer Shrug",
      "Pattern": "Hand Block Print Motif",
      "Length": "Floor Length",
      "Origin": "India (Sanganer, Rajasthan)"
    }
  },

  // ================= 2. JEWELLERY & ACCESSORIES (6 Products) =================
  {
    name: "Kundan & Pearl Choker Necklace Set with Maang Tikka",
    slug: "kundan-pearl-choker-necklace-maang-tikka",
    description: "Exquisite bridal & festive choker set with hand-set kundan stones, green faux-emerald drop beads, matching dangle earrings, and a dainty maang tikka with adjustable dori.",
    category: "Jewellery & Accessories",
    price: 499.00,
    original_price: 1499.00,
    discount: 66,
    stock_quantity: 50,
    rating: 4.8,
    review_count: 730,
    image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
    badge: "Meesho Best Seller",
    delivery_days: "2-4 Days",
    specifications: {
      "Base Material": "High Grade Brass Alloy",
      "Plating": "22K Micro Gold Plated",
      "Stone Type": "Kundan & Synthetic Pearls",
      "Set Contents": "1 Choker, 1 Pair Earrings, 1 Maang Tikka",
      "Origin": "India"
    }
  },
  {
    name: "Traditional Oxidised Silver Jhumkas (Peacock Motif)",
    slug: "oxidised-silver-jhumkas-peacock-motif",
    description: "Lightweight bohemian German silver oxidised jhumka earrings featuring embossed dancing peacock artwork and musical tiny ghungroo beads at the base.",
    category: "Jewellery & Accessories",
    price: 199.00,
    original_price: 599.00,
    discount: 66,
    stock_quantity: 110,
    rating: 4.6,
    review_count: 1420,
    image_url: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80",
    badge: "Super Saver",
    delivery_days: "2-3 Days",
    specifications: {
      "Base Material": "German Silver Alloy",
      "Finish": "Antique Oxidised Finish",
      "Weight": "28 grams (Lightweight for all-day wear)",
      "Closure": "Push Back Pin",
      "Origin": "India"
    }
  },
  {
    name: "24K Gold-Plated American Diamond Bangles (Set of 4)",
    slug: "gold-plated-american-diamond-bangles-set",
    description: "Sparkling micro-pave studded Swiss zircon bangles with dual tone rhodium and 24k gold plating. Scratch-resistant, skin-safe, and perfect to stack with glass bangles.",
    category: "Jewellery & Accessories",
    price: 549.00,
    original_price: 1299.00,
    discount: 57,
    stock_quantity: 42,
    rating: 4.5,
    review_count: 310,
    image_url: "https://images.unsplash.com/photo-1611591475879-1662580a5266?auto=format&fit=crop&w=800&q=80",
    badge: "Trending",
    delivery_days: "3-4 Days",
    specifications: {
      "Plating": "24K High Lustre Gold Micron",
      "Stones": "AAA+ Faceted Cubic Zirconia",
      "Pack": "Set of 4 Bangles",
      "Sizes Available": "2.4, 2.6, 2.8",
      "Origin": "India"
    }
  },
  {
    name: "Handcrafted Brass Meenakari Drop Earrings (Lotus Pattern)",
    slug: "brass-meenakari-drop-earrings-lotus",
    description: "Vibrant royal Rajasthani enamel meenakari work in turquoise and ruby red shades on cast brass. Adorned with tiny faux pearl droplets for an ethnic flair.",
    category: "Jewellery & Accessories",
    price: 279.00,
    original_price: 699.00,
    discount: 60,
    stock_quantity: 65,
    rating: 4.7,
    review_count: 215,
    image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    badge: "Artisan Handcrafted",
    delivery_days: "3-5 Days",
    specifications: {
      "Artform": "Jaipuri Meenakari",
      "Metal": "Solid Brass",
      "Color": "Turquoise Blue & Crimson Red",
      "Origin": "India (Jaipur, Rajasthan)"
    }
  },
  {
    name: "Ethnic Embroidered Silk Potli Bag with Golden Tassels",
    slug: "ethnic-embroidered-potli-bag-tassels",
    description: "Luxurious raw silk drawstring potli pouch embellished with zari thread embroidery, sequins, and pearl handle with long golden hanging pom-pom tassels.",
    category: "Jewellery & Accessories",
    price: 389.00,
    original_price: 899.00,
    discount: 56,
    stock_quantity: 55,
    rating: 4.7,
    review_count: 428,
    image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    badge: "Festive Essential",
    delivery_days: "2-4 Days",
    specifications: {
      "Material": "Raw Silk with Velvet Lining",
      "Closure": "Drawstring with Golden Latkans",
      "Capacity": "Accommodates phone, keys & makeup essentials",
      "Origin": "India"
    }
  },
  {
    name: "South Indian Temple Jewellery Floral Matte Finish Haram",
    slug: "temple-jewellery-matte-finish-haram-necklace",
    description: "Magnificent heritage South Indian long haram necklace set with goddess Lakshmi and peacock motifs in antique matte gold finish with ruby red and emerald stones.",
    category: "Jewellery & Accessories",
    price: 899.00,
    original_price: 2299.00,
    discount: 60,
    stock_quantity: 30,
    rating: 4.9,
    review_count: 580,
    image_url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    badge: "ShopEase Assured",
    delivery_days: "3-5 Days",
    specifications: {
      "Design": "Goddess Lakshmi Antique Temple Haram",
      "Finish": "Premium Matte Gold Polish",
      "Includes": "1 Long Haram Necklace + 1 Pair Matching Jhumkis",
      "Origin": "India (Coimbatore, Tamil Nadu)"
    }
  },

  // ================= 3. BEAUTY & MAKEUP (6 Products) =================
  {
    name: "Ayurvedic Kumkumadi Miraculous Glowing Face Oil (30ml)",
    slug: "ayurvedic-kumkumadi-glowing-face-oil",
    description: "Time-tested classical Ayurvedic recipe infused with Kashmiri saffron (Kesar), sandalwood, and 24 precious herbs that illuminate complexion and reduce dark spots naturally.",
    category: "Beauty & Makeup",
    price: 549.00,
    original_price: 1199.00,
    discount: 54,
    stock_quantity: 75,
    rating: 4.8,
    review_count: 912,
    image_url: "https://images.unsplash.com/photo-1608248597359-29115b9c0d38?auto=format&fit=crop&w=800&q=80",
    badge: "100% Ayurvedic",
    delivery_days: "2-3 Days",
    specifications: {
      "Key Ingredients": "Kashmiri Saffron, Sandalwood, Licorice, Lotus Extract",
      "Skin Type": "All Skin Types",
      "Volume": "30 ml Glass Dropper Bottle",
      "Formulation": "Paraben & Sulphate Free, Cold Pressed",
      "Origin": "India"
    }
  },
  {
    name: "Matte Liquid Velvet Long-Wear Lipstick Set (4 Pcs)",
    slug: "matte-liquid-velvet-lipstick-set-4pcs",
    description: "Transfer-proof, waterproof 12-hour staying liquid matte lipsticks in four rich shades curated for Indian warm skin tones: Berry Plum, Chai Nude, Ruby Red, and Terracotta.",
    category: "Beauty & Makeup",
    price: 399.00,
    original_price: 899.00,
    discount: 55,
    stock_quantity: 90,
    rating: 4.6,
    review_count: 1140,
    image_url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
    badge: "Meesho Best Seller",
    delivery_days: "2-3 Days",
    specifications: {
      "Finish": "Soft Velvet Matte",
      "Features": "Smudge-proof, Transfer-proof, Enriched with Vitamin E",
      "Quantity": "4 Lipsticks x 3ml",
      "Cruelty Free": "Yes",
      "Origin": "India"
    }
  },
  {
    name: "Pure Damask Rose & Kashmiri Saffron Hydrating Facial Mist (100ml)",
    slug: "pure-damask-rose-saffron-facial-mist",
    description: "Steam-distilled pure rose water infused with active saffron extracts. Balances skin pH, instantly refreshes tired skin, tightens open pores, and adds a dew-fresh sheen.",
    category: "Beauty & Makeup",
    price: 289.00,
    original_price: 599.00,
    discount: 51,
    stock_quantity: 65,
    rating: 4.7,
    review_count: 360,
    image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    badge: "Trending",
    delivery_days: "2-4 Days",
    specifications: {
      "Type": "100% Steam Distilled Floral Water",
      "Benefits": "Pore Minimizing, Instant Hydration, Toner",
      "Net Content": "100 ml Fine Mist Spray",
      "Alcohol Free": "Yes",
      "Origin": "India (Kannauj, UP)"
    }
  },
  {
    name: "Bamboo Charcoal Detoxifying Peel-Off Face Mask (100g)",
    slug: "bamboo-charcoal-detox-peel-off-mask",
    description: "Deep cleansing peel-off mask enriched with activated charcoal, tea tree oil, and aloe vera. Removes stubborn blackheads, unclogs pores, and absorbs excess oil without drying.",
    category: "Beauty & Makeup",
    price: 229.00,
    original_price: 499.00,
    discount: 54,
    stock_quantity: 85,
    rating: 4.4,
    review_count: 420,
    image_url: "https://images.unsplash.com/photo-1567928815104-b698075b1786?auto=format&fit=crop&w=800&q=80",
    badge: "Super Saver",
    delivery_days: "2-3 Days",
    specifications: {
      "Key Ingredients": "Activated Bamboo Charcoal, Tea Tree Oil, Aloe Vera",
      "Usage": "Bi-weekly deep pore cleanse",
      "Net Weight": "100 g",
      "Origin": "India"
    }
  },
  {
    name: "Waterproof 24-Hr Intense Black Kohl Kajal & Liner Combo",
    slug: "waterproof-intense-black-kohl-kajal-combo",
    description: "Ultra-pigmented jet-black herbal kajal pencil enriched with almond oil and camphor. Smooth glide, one-stroke opacity, smudge-proof up to 24 hours. Contact lens friendly.",
    category: "Beauty & Makeup",
    price: 179.00,
    original_price: 399.00,
    discount: 55,
    stock_quantity: 120,
    rating: 4.7,
    review_count: 1890,
    image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    badge: "Lowest Price",
    delivery_days: "2-3 Days",
    specifications: {
      "Finish": "Deep Jet Black Matte",
      "Infusion": "Sweet Almond Oil & Triphala",
      "Pack": "1 Retractable Kajal + 1 Precision Liquid Liner",
      "Ophthalmologically Tested": "Yes",
      "Origin": "India"
    }
  },
  {
    name: "Vitamin C 10% Radiant Glow Face Brightening Serum (30ml)",
    slug: "vitamin-c-radiant-glow-brightening-serum",
    description: "Potent antioxidant serum powered by 10% Ethyl Ascorbic Acid, Kakadu plum extracts, and Hyaluronic acid. Fades pigmentation, boosts collagen, and imparts instant glow.",
    category: "Beauty & Makeup",
    price: 449.00,
    original_price: 999.00,
    discount: 55,
    stock_quantity: 70,
    rating: 4.7,
    review_count: 675,
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
    badge: "Dermatologically Tested",
    delivery_days: "2-4 Days",
    specifications: {
      "Actives": "10% Vitamin C, 1% Ferulic Acid, Hyaluronic Acid",
      "Target": "Dullness, Sun Spots, Uneven Tone",
      "Volume": "30 ml UV-Protective Amber Bottle",
      "Origin": "India"
    }
  },

  // ================= 4. PLANTS & GARDENING (6 Products) =================
  {
    name: "Natural Air-Purifying Snake Plant with White Ceramic Planter",
    slug: "air-purifying-snake-plant-ceramic-planter",
    description: "Hardy Sansevieria snake plant that thrives on low light and cleans indoor toxins while producing oxygen at night. Comes potted in a high-gloss handmade white ceramic pot.",
    category: "Plants & Gardening",
    price: 399.00,
    original_price: 799.00,
    discount: 50,
    stock_quantity: 50,
    rating: 4.8,
    review_count: 530,
    image_url: "https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=800&q=80",
    badge: "NASA Air Purifier",
    delivery_days: "3-4 Days",
    specifications: {
      "Plant Type": "Sansevieria Trifasciata (Snake Plant)",
      "Pot Type": "4-Inch Handcrafted Ceramic Planter with Drainage",
      "Watering": "Once every 10-14 days",
      "Placement": "Bedroom / Living Room / Office Desk",
      "Origin": "India"
    }
  },
  {
    name: "Monstera Deliciosa (Swiss Cheese Plant) in Self-Watering Pot",
    slug: "monstera-deliciosa-self-watering-pot",
    description: "Tropical statement indoor plant with iconic fenestrated heart-shaped green leaves. Thrives in bright indirect sunlight and includes a smart sub-irrigation self-watering pot.",
    category: "Plants & Gardening",
    price: 599.00,
    original_price: 1299.00,
    discount: 53,
    stock_quantity: 35,
    rating: 4.9,
    review_count: 410,
    image_url: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80",
    badge: "Trending Decor",
    delivery_days: "3-5 Days",
    specifications: {
      "Botanical Name": "Monstera Deliciosa",
      "Height": "14-18 Inches with 4-5 Mature Leaves",
      "Soil Mix": "Coco peat, Perlite & Vermicompost",
      "Pot": "6-Inch Eco Self-Watering Planter",
      "Origin": "India"
    }
  },
  {
    name: "Handcrafted Cotton Macrame Hanging Plant Holders (Pack of 2)",
    slug: "handcrafted-macrame-hanging-plant-holders-pack-2",
    description: "Boho chic hand-knotted 100% natural cotton rope plant hangers with natural wooden rings. Fits planters from 4 to 9 inches diameter for indoor balconies and window sills.",
    category: "Plants & Gardening",
    price: 349.00,
    original_price: 799.00,
    discount: 56,
    stock_quantity: 60,
    rating: 4.6,
    review_count: 280,
    image_url: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=800&q=80",
    badge: "Handmade",
    delivery_days: "2-4 Days",
    specifications: {
      "Material": "4mm 100% Natural Organic Cotton Cord",
      "Length": "40 Inches (102 cm)",
      "Load Bearing": "Up to 8 kg each",
      "Pack": "Set of 2 Distinct Knotted Designs",
      "Origin": "India"
    }
  },
  {
    name: "Golden Pothos Money Plant in Terracotta Hand-Painted Pot",
    slug: "golden-pothos-money-plant-terracotta-pot",
    description: "Auspicious Vastu golden money plant with lush variegated yellow-green foliage. Presented in a rustic baked terracotta clay pot with traditional hand-painted Warli border art.",
    category: "Plants & Gardening",
    price: 299.00,
    original_price: 599.00,
    discount: 50,
    stock_quantity: 75,
    rating: 4.7,
    review_count: 650,
    image_url: "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=800&q=80",
    badge: "Good Luck Plant",
    delivery_days: "2-3 Days",
    specifications: {
      "Vastu Significance": "Attracts Positive Energy & Prosperity",
      "Pot Material": "Natural Terracotta Clay",
      "Care Level": "Very Easy (Beginner Friendly)",
      "Origin": "India"
    }
  },
  {
    name: "Rare Exotic Succulents & Cactus Collection (Pack of 4)",
    slug: "exotic-succulents-cactus-collection-pack-4",
    description: "Assortment of 4 vibrant, slow-growing healthy live succulents (Echeveria, Haworthia, Jade, Sedum) seated in modern pastel mini planters with decorative white marble pebbles.",
    category: "Plants & Gardening",
    price: 479.00,
    original_price: 999.00,
    discount: 52,
    stock_quantity: 40,
    rating: 4.5,
    review_count: 320,
    image_url: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=800&q=80",
    badge: "Bestseller Combo",
    delivery_days: "3-4 Days",
    specifications: {
      "Varieties": "Haworthia Zebra, Echeveria Elegans, Jade Mini, Sedum",
      "Pack Contents": "4 Live Plants + 4 Colorful Mini Planters + Decorative Pebbles",
      "Watering": "Once every 2 weeks",
      "Origin": "India"
    }
  },
  {
    name: "Heavy-Duty Stainless Steel Ergonomic Garden Tool Kit (5 Pcs)",
    slug: "stainless-steel-ergonomic-garden-tool-kit-5pcs",
    description: "Durable rust-proof garden set containing trowel, transplanter, hand rake cultivator, weeder, and bypass pruning shears with soft rubberized non-slip handles and storage pouch.",
    category: "Plants & Gardening",
    price: 499.00,
    original_price: 1099.00,
    discount: 54,
    stock_quantity: 50,
    rating: 4.8,
    review_count: 480,
    image_url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
    badge: "ShopEase Assured",
    delivery_days: "2-4 Days",
    specifications: {
      "Blade Material": "High-Grade Anti-Rust Cast Aluminum & Steel",
      "Handle": "Ergonomic Cushion Grip",
      "Set Includes": "Trowel, Transplanter, Cultivator, Weeder, Pruner",
      "Origin": "India"
    }
  },

  // ================= 5. DIY & CRAFTS (6 Products) =================
  {
    name: "Crystal Clear Epoxy Resin Art Starter Kit with Molds & Mica",
    slug: "epoxy-resin-art-starter-kit-molds-mica",
    description: "Complete DIY kit including 300g 2:1 ratio crystal clear resin and hardener, 6 silicone geode coaster molds, 8 vibrant metallic mica shimmer powders, glitter, cups, and stirrers.",
    category: "DIY & Crafts",
    price: 799.00,
    original_price: 1699.00,
    discount: 52,
    stock_quantity: 45,
    rating: 4.8,
    review_count: 610,
    image_url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    badge: "Meesho Best Seller",
    delivery_days: "2-4 Days",
    specifications: {
      "Resin Ratio": "2:1 Bubble-Free High Gloss Formula",
      "Molds": "6 Food-Grade Flexible Silicone Coaster Molds",
      "Pigments": "8 Pearlescent Mica Shades + Golden Foil Flakes",
      "Includes": "Measuring Cups, Gloves, Stir Sticks, Instruction Guide",
      "Origin": "India"
    }
  },
  {
    name: "Traditional Mandala Dot Painting Tool Kit & Canvas Boards",
    slug: "mandala-dot-painting-tools-canvas-boards",
    description: "Therapeutic mandala art kit equipped with 8 acrylic dotting rods, 5 double-sided ball stylus pens, 4 mandala stencils, paint tray, and 4 primed black circular art boards.",
    category: "DIY & Crafts",
    price: 389.00,
    original_price: 799.00,
    discount: 51,
    stock_quantity: 70,
    rating: 4.7,
    review_count: 450,
    image_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    badge: "Trending Hobby",
    delivery_days: "2-3 Days",
    specifications: {
      "Tools": "13 Dotting Styluses (ranging 0.5mm to 15mm)",
      "Canvases": "4 Pre-gessoed Black MDF Boards (8 inch)",
      "Accessories": "Paint Palette, 4 Geometric Stencils",
      "Origin": "India"
    }
  },
  {
    name: "Hand Embroidery Starter Kit with Bamboo Hoop & Floral Threads",
    slug: "hand-embroidery-starter-kit-bamboo-hoop",
    description: "All-in-one needlework kit featuring a 7-inch polished bamboo embroidery hoop, 3 pre-stamped floral cotton canvas cloths, 24 vibrant stranded cotton floss skeins, and needles.",
    category: "DIY & Crafts",
    price: 349.00,
    original_price: 699.00,
    discount: 50,
    stock_quantity: 65,
    rating: 4.6,
    review_count: 380,
    image_url: "https://images.unsplash.com/photo-1528458876885-5b6eac83d32b?auto=format&fit=crop&w=800&q=80",
    badge: "Handmade Love",
    delivery_days: "2-4 Days",
    specifications: {
      "Hoop": "7-Inch Adjustable Natural Bamboo Frame",
      "Fabric": "Pure Cotton with Water-Soluble Pre-printed Patterns",
      "Threads": "24 Colors DMC Standard Cotton Embroidery Floss",
      "Includes": "Needle Threader, 6 Needles, Stitch Tutorial Booklet",
      "Origin": "India"
    }
  },
  {
    name: "Natural Soy Wax Candle Making Kit with Aromatic Oils",
    slug: "natural-soy-wax-candle-making-kit",
    description: "Eco-friendly candle crafting set containing 500g 100% natural soy wax flakes, 4 vintage metal candle tins, pure lavender & vanilla fragrance oils, cotton wicks, and melting pot.",
    category: "DIY & Crafts",
    price: 649.00,
    original_price: 1399.00,
    discount: 53,
    stock_quantity: 40,
    rating: 4.7,
    review_count: 290,
    image_url: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80",
    badge: "Best Gift Idea",
    delivery_days: "3-5 Days",
    specifications: {
      "Wax Type": "100% Organic Biodegradable Soy Wax",
      "Scents": "French Lavender & Warm Madagascar Vanilla",
      "Containers": "4 Designer Floral Metal Tins with Lids",
      "Equipment": "Stainless Steel Wax Melting Pitcher included",
      "Origin": "India"
    }
  },
  {
    name: "Terracotta Clay Pottery Crafting Kit with Wooden Sculpting Tools",
    slug: "terracotta-clay-pottery-crafting-kit",
    description: "100% natural air-dry terracotta modeling clay (2kg) that requires no kiln firing. Accompanied by 8 double-ended boxwood sculpting tools, wire cutter, sponge, and acrylic sealer.",
    category: "DIY & Crafts",
    price: 459.00,
    original_price: 999.00,
    discount: 54,
    stock_quantity: 55,
    rating: 4.5,
    review_count: 215,
    image_url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80",
    badge: "Eco-Friendly",
    delivery_days: "3-4 Days",
    specifications: {
      "Clay": "2 Kg Refined Air-Drying Natural Terracotta Clay",
      "Drying Time": "24-48 Hours (No Oven or Kiln Required)",
      "Tools": "8 Professional Carving & Smoothing Wooden Tools",
      "Non-Toxic": "100% Safe & Natural",
      "Origin": "India (Khurja, UP)"
    }
  },
  {
    name: "Macrame Cotton Cord & Wooden Beads Crafting Bundle",
    slug: "macrame-cotton-cord-wooden-beads-bundle",
    description: "Generous 100-meter spool of 4mm single-strand unbleached cotton rope paired with 50 natural wooden beads, 4 wooden dowels, and 6 wooden rings for wall hangings and keychains.",
    category: "DIY & Crafts",
    price: 379.00,
    original_price: 799.00,
    discount: 52,
    stock_quantity: 80,
    rating: 4.6,
    review_count: 340,
    image_url: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80",
    badge: "Lowest Price",
    delivery_days: "2-3 Days",
    specifications: {
      "Cord Material": "100% Natural Biodegradable Cotton (4mm)",
      "Length": "100 Metres Continuous Spool",
      "Accessories": "50 Assorted Wooden Beads, 6 Rings, 4 Dowels",
      "Color": "Natural Off-White / Ecru",
      "Origin": "India"
    }
  },

  // ================= 6. HOME DECOR (6 Products) =================
  {
    name: "Handcrafted Brass Ganesha Urli Bowl with Floating Diya Set",
    slug: "brass-ganesha-urli-bowl-floating-diya",
    description: "Traditional royal golden brass urli bowl featuring ornate Lord Ganesha sculpture, peacock engravings, and bells. Fill with water, rose petals, and floating tea lights for auspicious festive entry decor.",
    category: "Home Decor",
    price: 849.00,
    original_price: 1999.00,
    discount: 57,
    stock_quantity: 40,
    rating: 4.9,
    review_count: 890,
    image_url: "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=800&q=80",
    badge: "Festive Grandeur",
    delivery_days: "3-5 Days",
    specifications: {
      "Material": "Solid Polished Brass with Lacquer Coating",
      "Diameter": "10 Inches (25 cm)",
      "Weight": "1.2 kg",
      "Ideal For": "Pooja Room, Living Room Centerpiece, Festive Gifting",
      "Origin": "India (Moradabad, UP)"
    }
  },
  {
    name: "Bohemian Handwoven Cotton Tufted Cushion Covers (Set of 2)",
    slug: "bohemian-handwoven-cotton-tufted-cushion-covers",
    description: "Chic textured throw pillow cases featuring geometric hand-tufted tribal patterns, fluffy fringe tassels, and concealed invisible zippers. Transforms sofas and bedding instantly.",
    category: "Home Decor",
    price: 499.00,
    original_price: 1199.00,
    discount: 58,
    stock_quantity: 65,
    rating: 4.7,
    review_count: 530,
    image_url: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80",
    badge: "Meesho Best Seller",
    delivery_days: "2-4 Days",
    specifications: {
      "Fabric": "Heavyweight 100% Woven Cotton Canvas",
      "Size": "16x16 Inches (40x40 cm)",
      "Closure": "Hidden Heavy-Duty Zipper",
      "Care": "Spot Clean or Hand Wash Cold",
      "Origin": "India (Panipat, Haryana)"
    }
  },
  {
    name: "Ceramic Electric Aroma Diffuser & Essential Oils Gift Pack",
    slug: "ceramic-electric-aroma-diffuser-essential-oils",
    description: "Artistic floral carved off-white ceramic lamp diffuser that casts warm ambient shadow patterns while gently vaporizing fragrance. Comes with 2 bottles of pure Mogra (Jasmine) and Sandalwood oils.",
    category: "Home Decor",
    price: 449.00,
    original_price: 999.00,
    discount: 55,
    stock_quantity: 50,
    rating: 4.6,
    review_count: 410,
    image_url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    badge: "Trending Decor",
    delivery_days: "2-3 Days",
    specifications: {
      "Body": "Matte Glazed White Porcelain Ceramic",
      "Power": "Corded Electric with Warm G9 Bulb Included",
      "Free Oils": "Pure Mogra (10ml) + Mysore Sandalwood (10ml)",
      "Origin": "India"
    }
  },
  {
    name: "Hand-Knotted Braided Jute Floor Area Rug (3x5 Feet)",
    slug: "hand-knotted-braided-jute-floor-rug",
    description: "Eco-friendly, reversible floor carpet meticulously woven by rural artisans using 100% natural golden jute fibres. Durable, biodegradable, and adds warm organic texture to any living room.",
    category: "Home Decor",
    price: 1199.00,
    original_price: 2799.00,
    discount: 57,
    stock_quantity: 28,
    rating: 4.8,
    review_count: 345,
    image_url: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80",
    badge: "Artisan Handloom",
    delivery_days: "3-5 Days",
    specifications: {
      "Material": "100% Pure Natural Indian Golden Jute",
      "Size": "3 x 5 Feet (90 x 150 cm)",
      "Weave": "Hand Braided Reversible Loop",
      "Thickness": "8-10 mm Plump Cushion Feel",
      "Origin": "India (Bhadohi, UP)"
    }
  },
  {
    name: "Traditional Brass Elephant Incense Burner & Dhoop Stand",
    slug: "brass-elephant-incense-burner-dhoop-stand",
    description: "Royal engraved solid brass elephant figurine featuring a removable carved howdah canopy. Releases fragrant smoke plumes while catching all burning ash cleanly inside.",
    category: "Home Decor",
    price: 599.00,
    original_price: 1299.00,
    discount: 53,
    stock_quantity: 45,
    rating: 4.8,
    review_count: 275,
    image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    badge: "ShopEase Assured",
    delivery_days: "2-4 Days",
    specifications: {
      "Metal": "Pure Heavy Cast Brass",
      "Finish": "Antique Vintage Patina Gold",
      "Weight": "480 grams",
      "Dimensions": "5 x 4 x 3.5 Inches",
      "Origin": "India (Moradabad, UP)"
    }
  },
  {
    name: "Mandala Tree of Life Cotton Wall Hanging Tapestry with Fringe",
    slug: "mandala-tree-of-life-cotton-wall-tapestry",
    description: "Vibrant screen-printed Rajasthani bohemian tapestry highlighting the sacred Tree of Life surrounded by elephant and peacock borders. Complete with natural wooden hanging rod and braided macrame cord.",
    category: "Home Decor",
    price: 549.00,
    original_price: 1199.00,
    discount: 54,
    stock_quantity: 60,
    rating: 4.7,
    review_count: 510,
    image_url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    badge: "Lowest Price",
    delivery_days: "2-3 Days",
    specifications: {
      "Fabric": "100% Crisp Cotton Sheeting",
      "Size": "40 x 55 Inches",
      "Printing": "Traditional Hand Screen Printing with Fast Colors",
      "Includes": "Wooden Hanging Rod + Macrame Loop",
      "Origin": "India (Jaipur, Rajasthan)"
    }
  }
];

module.exports = {
  categories,
  products
};
