\c hardware_store;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20) DEFAULT 'admin',
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(150),
    address         TEXT,
    gstin           VARCHAR(20),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(50) UNIQUE NOT NULL,
    barcode         VARCHAR(100) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id     INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_price      DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
    mrp             DECIMAL(10,2),
    gst_rate        DECIMAL(5,2) DEFAULT 18.00,
    hsn_code        VARCHAR(20),
    current_stock   INTEGER NOT NULL DEFAULT 0,
    minimum_stock   INTEGER NOT NULL DEFAULT 10,
    unit            VARCHAR(20) DEFAULT 'piece',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name     ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode  ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

CREATE INDEX IF NOT EXISTS idx_products_search
    ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE TABLE IF NOT EXISTS invoices (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(50) UNIQUE NOT NULL,
    customer_name   VARCHAR(150),
    customer_phone  VARCHAR(20),
    customer_gstin  VARCHAR(20),
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_gst       DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(20) DEFAULT 'cash',
    payment_status  VARCHAR(20) DEFAULT 'paid',
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id),
    product_name    VARCHAR(255) NOT NULL,
    sku             VARCHAR(50),
    quantity        INTEGER NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    gst_rate        DECIMAL(5,2) NOT NULL,
    gst_amount      DECIMAL(10,2) NOT NULL,
    total_price     DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products(id),
    movement_type   VARCHAR(20) NOT NULL,
    quantity        INTEGER NOT NULL,
    reference_id    INTEGER,
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (name, email, password, role)
VALUES (
    'Store Admin',
    'admin@hardwarestore.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, description) VALUES
    ('Electrical',  'Wires, switches, sockets, MCBs'),
    ('Plumbing',    'Pipes, fittings, taps, valves'),
    ('Hand Tools',  'Hammers, screwdrivers, pliers'),
    ('Power Tools', 'Drills, grinders, saw machines'),
    ('Fasteners',   'Screws, nuts, bolts, anchors'),
    ('Paints',      'Wall paints, primers, enamels'),
    ('Safety',      'Helmets, gloves, safety shoes'),
    ('Adhesives',   'Fevicol, M-seal, epoxy')
ON CONFLICT (name) DO NOTHING;

SELECT 'Database setup complete! ✅' AS status;
