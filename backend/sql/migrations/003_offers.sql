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
    CONSTRAINT CK_offers_bundle_fields CHECK (
        (offer_type = 'bundle'
            AND product_id IS NULL
            AND bundle_price IS NOT NULL
            AND bundle_price >= 0
            AND discount_type IS NULL
            AND discount_value IS NULL)
        OR
        (offer_type = 'product_discount'
            AND product_id IS NOT NULL
            AND bundle_price IS NULL
            AND discount_type IN ('percentage', 'fixed')
            AND discount_value IS NOT NULL
            AND discount_value >= 0)
    ),
    CONSTRAINT CK_offers_percentage_value CHECK (
        discount_type <> 'percentage' OR discount_value <= 100
    ),
    CONSTRAINT FK_offers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bundle_offer_products (
    offer_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (offer_id, product_id),
    CONSTRAINT FK_bundle_offer_products_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    CONSTRAINT FK_bundle_offer_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_offers_active_dates
    ON offers (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_offers_product_id
    ON offers (product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_offer_products_product_id
    ON bundle_offer_products (product_id);
