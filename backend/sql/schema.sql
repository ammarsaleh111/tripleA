CREATE TABLE IF NOT EXISTS users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_role CHECK (role IN ('customer', 'admin'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    phone_number VARCHAR(20) NULL,
    reward_points INT NOT NULL DEFAULT 0,
    tier_status VARCHAR(20) NOT NULL DEFAULT 'Member',
    CONSTRAINT CK_user_profiles_tier_status CHECK (tier_status IN ('Member', 'Silver', 'Gold', 'Elite')),
    CONSTRAINT FK_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS addresses (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'US',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT FK_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT NULL,
    parent_id INT NULL,
    CONSTRAINT UQ_categories_slug UNIQUE (slug),
    CONSTRAINT FK_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    materials_care TEXT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    has_flavor BOOLEAN NOT NULL DEFAULT FALSE,
    has_weight BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT UQ_products_slug UNIQUE (slug),
    CONSTRAINT FK_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT NOT NULL,
    sku VARCHAR(100) NOT NULL,
    size VARCHAR(50) NULL,
    color VARCHAR(50) NULL,
    color_hex VARCHAR(10) NULL,
    flavor VARCHAR(50) NULL,
    weight_value DECIMAL(10, 2) NULL,
    weight_unit VARCHAR(2) NULL,
    price_modifier DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_product_variants_sku UNIQUE (sku),
    CONSTRAINT CK_product_variants_weight_unit CHECK (weight_unit IS NULL OR weight_unit IN ('g', 'kg')),
    CONSTRAINT FK_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_images (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT NOT NULL,
    variant_id INT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT FK_product_images_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS offers (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    offer_type VARCHAR(20) NOT NULL,
    product_id INT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    bundle_price DECIMAL(10, 2) NULL,
    discount_type VARCHAR(20) NULL,
    discount_value DECIMAL(10, 2) NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT CK_offers_type CHECK (offer_type IN ('bundle', 'product_discount')),
    CONSTRAINT CK_offers_dates CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT FK_offers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bundle_offer_products (
    offer_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (offer_id, product_id),
    CONSTRAINT FK_bundle_offer_products_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    CONSTRAINT FK_bundle_offer_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carts (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT FK_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cart_id INT NOT NULL,
    variant_id INT NULL,
    offer_id INT NULL,
    item_type VARCHAR(20) NOT NULL DEFAULT 'product',
    variant_selections JSONB NULL,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT CK_cart_items_type CHECK (item_type IN ('product', 'bundle')),
    CONSTRAINT CK_cart_items_target CHECK (
        (item_type = 'product' AND variant_id IS NOT NULL AND offer_id IS NULL)
        OR
        (item_type = 'bundle' AND variant_id IS NULL AND offer_id IS NOT NULL)
    ),
    CONSTRAINT CK_cart_items_selections CHECK (
        variant_selections IS NULL OR jsonb_typeof(variant_selections) = 'object'
    ),
    CONSTRAINT FK_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT FK_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT FK_cart_items_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    user_id INT NULL,
    shipping_address_id INT NULL,
    customer_name VARCHAR(255) NULL,
    customer_phone VARCHAR(50) NULL,
    customer_email VARCHAR(255) NULL,
    customer_address TEXT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    tracking_number VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT UQ_orders_order_number UNIQUE (order_number),
    CONSTRAINT CK_orders_status CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    CONSTRAINT FK_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT FK_orders_address FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INT NOT NULL,
    variant_id INT NULL,
    offer_id INT NULL,
    item_type VARCHAR(20) NOT NULL DEFAULT 'product',
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    metadata JSONB NULL,
    CONSTRAINT CK_order_items_type CHECK (item_type IN ('product', 'bundle')),
    CONSTRAINT FK_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT FK_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    CONSTRAINT FK_order_items_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL,
    title VARCHAR(255) NULL,
    comment TEXT NULL,
    is_verified_buyer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT CK_reviews_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT FK_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT FK_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    admin_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT CK_contact_messages_status CHECK (status IN ('new', 'read', 'resolved')),
    CONSTRAINT FK_contact_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_category_slug ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_user_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_cart_items_offer ON cart_items (offer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_offer ON order_items (offer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);
