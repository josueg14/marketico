const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
const useSsl = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});
pool.on('error', (e) => console.error('Error en el pool de PostgreSQL:', e.message));

// Las imágenes se guardan en la propia base de datos (BYTEA) para que no se
// pierdan en Render, cuyo disco es efímero.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('buyer','seller')),
  avatar_id INT REFERENCES images(id) ON DELETE SET NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  city TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  google_id TEXT UNIQUE,
  facebook_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  item_condition TEXT NOT NULL DEFAULT 'usado',
  city TEXT DEFAULT '',
  accepts_trade BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','sold')),
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);

CREATE TABLE IF NOT EXISTS product_images (
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_id INT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, image_id)
);

CREATE TABLE IF NOT EXISTS product_views (
  id BIGSERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewer_id INT REFERENCES users(id) ON DELETE SET NULL,
  viewer_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_views_product ON product_views(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','offer')),
  body TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14,2),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (seller_id, buyer_id)
);
`;

async function init() {
  if (!url) throw new Error('Falta la variable DATABASE_URL');
  await pool.query(SCHEMA);
  console.log('Base de datos lista');
}

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, init, tx };
