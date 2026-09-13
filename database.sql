-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('OC', 'CC', 'SC', 'Category')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(50) NOT NULL,
    type VARCHAR(100),
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_modtime
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- Create login_rate_limits Table
CREATE TABLE IF NOT EXISTS login_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    failed_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE
);

-- Create Demands Table
CREATE TABLE IF NOT EXISTS demands (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'under review' CHECK (status IN ('under review', 'approved', 'rejected')),
    negotiated INTEGER CHECK (negotiated >= 0),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_demands_modtime
BEFORE UPDATE ON demands
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();


CREATE UNIQUE INDEX unique_user_item_unit
ON demands (user_id, LOWER(item_name), LOWER(unit));

-- Create Negotiations Table
CREATE TABLE IF NOT EXISTS negotiations (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, -- Category User ID
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    cc_present UUID[], -- Array of Logistics CC User IDs
    category_representatives TEXT[], -- Array of names of category representatives
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_negotiations_modtime
BEFORE UPDATE ON negotiations
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Create Mappings Table
CREATE TABLE IF NOT EXISTS mappings (
    id SERIAL PRIMARY KEY,
    demand_id INTEGER NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_mappings_modtime
BEFORE UPDATE ON mappings
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    mapping_id INTEGER NOT NULL REFERENCES mappings(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    returnable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
