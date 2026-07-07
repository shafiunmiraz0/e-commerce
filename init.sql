-- Database is created by POSTGRES_DB env var in docker-compose
-- Tables are created in the ecommerce_db database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    full_name VARCHAR(200),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    avatar VARCHAR(500),
    auth_provider VARCHAR(20) DEFAULT 'local',
    google_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    image VARCHAR(500),
    gallery TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    stock INTEGER DEFAULT 0,
    sold INTEGER DEFAULT 0,
    rating DECIMAL(2, 1) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_name VARCHAR(200),
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_country VARCHAR(100),
    shipping_phone VARCHAR(20),
    payment_method VARCHAR(50) DEFAULT 'cod',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(300),
    product_image VARCHAR(500),
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Default admin user is created by config/init-db.js (password: admin123)

-- Insert categories
INSERT INTO categories (name, slug, icon, description) VALUES
('Electronics', 'electronics', '📱', 'Smartphones, tablets, gadgets and more'),
('Fashion', 'fashion', '👕', 'Clothing, shoes and accessories'),
('Home & Garden', 'home-garden', '🏠', 'Furniture, decor and garden supplies'),
('Beauty', 'beauty', '💄', 'Skincare, makeup and beauty tools'),
('Sports', 'sports', '⚽', 'Sports equipment and activewear'),
('Toys & Games', 'toys-games', '🎮', 'Toys, games and entertainment'),
('Automotive', 'automotive', '🚗', 'Car accessories and parts'),
('Books', 'books', '📚', 'Books, magazines and stationery')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, slug, description, price, original_price, image, category_id, stock, sold, rating, reviews_count, is_featured) VALUES
('Wireless Bluetooth Earbuds Pro', 'wireless-bluetooth-earbuds-pro', 'Premium wireless earbuds with active noise cancellation, 30-hour battery life, and IPX5 waterproof rating. Crystal clear audio with deep bass.', 29.99, 59.99, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400', 1, 500, 1243, 4.5, 892, true),
('Smart Watch Ultra X1', 'smart-watch-ultra-x1', 'Advanced smartwatch with health monitoring, GPS tracking, 7-day battery life. Compatible with iOS and Android.', 45.99, 89.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 1, 300, 876, 4.7, 654, true),
('Vintage Canvas Backpack', 'vintage-canvas-backpack', 'Durable canvas backpack with leather accents. Multiple compartments, laptop sleeve, and adjustable straps.', 24.99, 49.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 2, 200, 567, 4.3, 423, true),
('Minimalist Desk Lamp LED', 'minimalist-desk-lamp-led', 'Modern LED desk lamp with adjustable brightness, color temperature control, and USB charging port.', 18.99, 35.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400', 3, 150, 345, 4.6, 298, true),
('Portable Bluetooth Speaker', 'portable-bluetooth-speaker', 'Waterproof portable speaker with 360-degree sound, 20-hour playtime, and built-in microphone.', 22.99, 44.99, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', 1, 400, 789, 4.4, 567, true),
('Organic Face Serum Set', 'organic-face-serum-set', 'Natural skincare set with vitamin C, hyaluronic acid, and retinol serums. Cruelty-free and vegan.', 15.99, 32.99, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400', 4, 250, 456, 4.8, 345, true),
('Yoga Mat Premium Non-Slip', 'yoga-mat-premium-non-slip', 'Extra thick 6mm yoga mat with alignment lines. Eco-friendly TPE material, lightweight and durable.', 19.99, 39.99, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', 5, 350, 678, 4.5, 432, false),
('Wireless Phone Charger Stand', 'wireless-phone-charger-stand', 'Fast wireless charging stand compatible with all Qi-enabled devices. 15W rapid charging with LED indicator.', 12.99, 25.99, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400', 1, 600, 912, 4.2, 678, false),
('LED Strip Lights RGB', 'led-strip-lights-rgb', 'Smart LED strip lights with app control, 16 million colors, music sync mode. 5 meters with remote.', 14.99, 29.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', 3, 450, 543, 4.3, 321, false),
('Running Shoes Ultra Boost', 'running-shoes-ultra-boost', 'Lightweight running shoes with responsive cushioning and breathable mesh upper. Available in multiple colors.', 34.99, 69.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 2, 180, 432, 4.6, 289, true),
('Stainless Steel Water Bottle', 'stainless-steel-water-bottle', 'Double-wall vacuum insulated bottle. Keeps drinks cold 24h or hot 12h. BPA-free, 750ml capacity.', 9.99, 19.99, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', 5, 800, 1234, 4.4, 876, false),
('Mechanical Gaming Keyboard', 'mechanical-gaming-keyboard', 'RGB backlit mechanical keyboard with blue switches. Full N-key rollover, programmable macros.', 39.99, 79.99, 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400', 1, 250, 345, 4.7, 234, true);
