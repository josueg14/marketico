const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { pool, tx } = require('./db');
const { requireAuth, requireRole, publicUser } = require('./auth');
const { httpError, wrap } = require('./util');

const router = express.Router();

const CATEGORIES = ['Electrónica', 'Vehículos', 'Hogar', 'Moda', 'Deportes', 'Inmuebles', 'Juguetes', 'Herramientas', 'Mascotas', 'Libros', 'Otros'];
const CONDITIONS = ['nuevo', 'como nuevo', 'usado'];
const MAX_IMAGES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(httpError(400, 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.')),
});

/* ---------- fragmentos SQL reutilizables ---------- */
const AVATAR = (a) => `COALESCE('/img/' || ${a}.avatar_id::text, ${a}.avatar_url)`;
const COVER = `(SELECT image_id FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1)`;
const RATING = (a) => `(SELECT ROUND(AVG(rating), 1) FROM reviews WHERE seller_id = ${a}.id)`;
const RCOUNT = (a) => `(SELECT COUNT(*) FROM reviews WHERE seller_id = ${a}.id)::int`;

const LIST_SQL = `
  SELECT p.id, p.title, p.price, p.category, p.item_condition, p.city, p.accepts_trade, p.status, p.views, p.created_at,
         ${COVER} AS cover,
         u.id AS seller_id, u.name AS seller_name, ${AVATAR('u')} AS seller_avatar,
         ${RATING('u')} AS seller_rating, ${RCOUNT('u')} AS seller_reviews,
         EXISTS (SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = $1) AS favorited
  FROM products p JOIN users u ON u.id = p.seller_id`;

const fmtProduct = (r) => ({
  ...r,
  price: Number(r.price),
  seller_rating: r.seller_rating == null ? null : Number(r.seller_rating),
});

/* ---------- imágenes ---------- */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'image/gif';
  return null;
}

async function saveImage(client, file) {
  const mime = sniff(file.buffer); // verificamos el contenido real, no solo la extensión
  if (!mime) throw httpError(400, 'Uno de los archivos no es una imagen válida');
  const { rows } = await client.query('INSERT INTO images (mime, data) VALUES ($1, $2) RETURNING id', [mime, file.buffer]);
  return rows[0].id;
}

router.get(
  '/img/:id',
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.sendStatus(404);
    const { rows } = await pool.query('SELECT mime, data FROM images WHERE id = $1', [id]);
    if (!rows[0]) return res.sendStatus(404);
    res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.send(rows[0].data);
  })
);

router.get('/api/meta', (req, res) => {
  res.json({
    categories: CATEGORIES,
    conditions: CONDITIONS,
    maxImages: MAX_IMAGES,
    providers: {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    },
  });
});

/* ---------- productos ---------- */
function validateProduct(b) {
  const title = String(b.title || '').trim();
  const description = String(b.description || '').trim();
  const price = Number(b.price);
  const category = String(b.category || '');
  const condition = String(b.condition || 'usado');
  const city = String(b.city || '').trim().slice(0, 60);
  if (title.length < 3 || title.length > 100) throw httpError(400, 'El título debe tener entre 3 y 100 caracteres');
  if (description.length < 10 || description.length > 3000) throw httpError(400, 'La descripción debe tener entre 10 y 3000 caracteres');
  if (!Number.isFinite(price) || price < 0 || price > 1e10) throw httpError(400, 'Escribe un precio válido');
  if (!CATEGORIES.includes(category)) throw httpError(400, 'Elige una categoría');
  if (!CONDITIONS.includes(condition)) throw httpError(400, 'Estado del artículo no válido');
  return { title, description, price, category, condition, city, trade: ['on', 'true', '1'].includes(String(b.trade)) };
}

function parseOrder(raw, nFiles) {
  let arr = [];
  try {
    arr = JSON.parse(raw || '[]');
  } catch (_) {}
  if (!Array.isArray(arr) || (!arr.length && nFiles)) arr = Array.from({ length: nFiles }, (_, i) => 'n:' + i);
  return arr.map(String);
}

// Guarda imágenes nuevas, respeta el orden enviado ("e:ID" existente, "n:IDX" nueva) y borra las descartadas
async function applyImages(c, pid, current, files, orderRaw) {
  const newIds = [];
  for (const f of files) newIds.push(await saveImage(c, f));
  const final = [];
  for (const o of parseOrder(orderRaw, files.length)) {
    const [k, v] = o.split(':');
    const n = Number(v);
    if (k === 'e' && current.includes(n) && !final.includes(n)) final.push(n);
    if (k === 'n' && newIds[n] && !final.includes(newIds[n])) final.push(newIds[n]);
  }
  for (const iid of newIds) if (!final.includes(iid)) final.push(iid);
  if (!final.length) throw httpError(400, 'Sube al menos una imagen');
  if (final.length > MAX_IMAGES) throw httpError(400, `Máximo ${MAX_IMAGES} imágenes por publicación`);

  const removed = current.filter((x) => !final.includes(x));
  if (removed.length) await c.query('DELETE FROM images WHERE id = ANY($1::int[])', [removed]);
  await c.query('DELETE FROM product_images WHERE product_id = $1', [pid]);
  for (let i = 0; i < final.length; i++) {
    await c.query('INSERT INTO product_images (product_id, image_id, position) VALUES ($1,$2,$3)', [pid, final[i], i]);
  }
}

router.get(
  '/api/products',
  wrap(async (req, res) => {
    const { q, category, min, max, sort, trade, seller } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 24;
    const params = [req.user ? req.user.id : 0];
    const add = (v) => (params.push(v), '$' + params.length);
    const where = [seller ? `p.status IN ('active','sold')` : `p.status = 'active'`];

    if (q) {
      const s = add('%' + String(q).slice(0, 80).replace(/[%_]/g, '\\$&') + '%');
      where.push(`(p.title ILIKE ${s} OR p.description ILIKE ${s})`);
    }
    if (category) where.push(`p.category = ${add(String(category))}`);
    if (min !== undefined && min !== '' && !isNaN(min)) where.push(`p.price >= ${add(Number(min))}`);
    if (max !== undefined && max !== '' && !isNaN(max)) where.push(`p.price <= ${add(Number(max))}`);
    if (trade === '1') where.push('p.accepts_trade = true');
    if (seller) where.push(`p.seller_id = ${add(parseInt(seller, 10) || 0)}`);

    const order = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', popular: 'p.views DESC, p.created_at DESC' }[sort] || 'p.created_at DESC';
    const sql = `${LIST_SQL} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}`;
    const { rows } = await pool.query(sql, params);
    res.json({ items: rows.slice(0, limit).map(fmtProduct), hasMore: rows.length > limit });
  })
);

router.get(
  '/api/favorites',
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `${LIST_SQL} WHERE p.status <> 'paused' AND p.id IN (SELECT product_id FROM favorites WHERE user_id = $1) ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(fmtProduct));
  })
);

async function recordView(req, product) {
  if (req.user && req.user.id === product.seller_id) return; // no contamos las vistas del dueño
  const key = req.user
    ? 'u' + req.user.id
    : 'a' + crypto.createHash('sha256').update((req.ip || '') + (req.get('user-agent') || '')).digest('hex').slice(0, 16);
  const r = await pool.query(
    `INSERT INTO product_views (product_id, viewer_id, viewer_key)
     SELECT $1::int, $2::int, $3::text
     WHERE NOT EXISTS (SELECT 1 FROM product_views WHERE product_id = $1::int AND viewer_key = $3::text AND created_at > now() - interval '30 minutes')`,
    [product.id, req.user ? req.user.id : null, key]
  );
  if (r.rowCount) await pool.query('UPDATE products SET views = views + 1 WHERE id = $1', [product.id]);
}

router.get(
  '/api/products/:id',
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) throw httpError(404, 'Publicación no encontrada');
    const { rows } = await pool.query(
      `SELECT p.*, u.name AS seller_name, u.bio AS seller_bio, u.city AS seller_city, u.created_at AS seller_since,
              ${AVATAR('u')} AS seller_avatar, ${RATING('u')} AS seller_rating, ${RCOUNT('u')} AS seller_reviews,
              (SELECT COUNT(*) FROM favorites WHERE product_id = p.id)::int AS favorites,
              EXISTS (SELECT 1 FROM favorites WHERE product_id = p.id AND user_id = $2) AS favorited
       FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = $1`,
      [id, req.user ? req.user.id : 0]
    );
    const p = rows[0];
    if (!p || (p.status === 'paused' && (!req.user || req.user.id !== p.seller_id))) throw httpError(404, 'Publicación no encontrada');
    const imgs = await pool.query('SELECT image_id FROM product_images WHERE product_id = $1 ORDER BY position', [id]);
    recordView(req, p).catch((e) => console.error('view', e.message));
    res.json({ ...fmtProduct(p), images: imgs.rows.map((r) => r.image_id) });
  })
);

router.post(
  '/api/products',
  requireRole('seller'),
  upload.array('images', MAX_IMAGES),
  wrap(async (req, res) => {
    const d = validateProduct(req.body);
    const files = req.files || [];
    if (!files.length) throw httpError(400, 'Sube al menos una imagen');
    const id = await tx(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO products (seller_id, title, description, price, category, item_condition, city, accepts_trade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [req.user.id, d.title, d.description, d.price, d.category, d.condition, d.city, d.trade]
      );
      await applyImages(c, rows[0].id, [], files, req.body.order);
      return rows[0].id;
    });
    res.status(201).json({ id });
  })
);

router.put(
  '/api/products/:id',
  requireRole('seller'),
  upload.array('images', MAX_IMAGES),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const d = validateProduct(req.body);
    await tx(async (c) => {
      const own = await c.query('SELECT id FROM products WHERE id = $1 AND seller_id = $2 FOR UPDATE', [id, req.user.id]);
      if (!own.rowCount) throw httpError(404, 'Publicación no encontrada');
      await c.query(
        `UPDATE products SET title=$1, description=$2, price=$3, category=$4, item_condition=$5, city=$6, accepts_trade=$7 WHERE id=$8`,
        [d.title, d.description, d.price, d.category, d.condition, d.city, d.trade, id]
      );
      const cur = (await c.query('SELECT image_id FROM product_images WHERE product_id = $1', [id])).rows.map((r) => r.image_id);
      await applyImages(c, id, cur, req.files || [], req.body.order);
    });
    res.json({ id });
  })
);

router.patch(
  '/api/products/:id/status',
  requireRole('seller'),
  wrap(async (req, res) => {
    const status = req.body.status;
    if (!['active', 'paused', 'sold'].includes(status)) throw httpError(400, 'Estado no válido');
    const r = await pool.query('UPDATE products SET status = $1 WHERE id = $2 AND seller_id = $3', [status, parseInt(req.params.id, 10), req.user.id]);
    if (!r.rowCount) throw httpError(404, 'Publicación no encontrada');
    res.json({ ok: true });
  })
);

router.delete(
  '/api/products/:id',
  requireRole('seller'),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await tx(async (c) => {
      const imgs = (await c.query('SELECT image_id FROM product_images WHERE product_id = $1', [id])).rows.map((r) => r.image_id);
      const del = await c.query('DELETE FROM products WHERE id = $1 AND seller_id = $2', [id, req.user.id]);
      if (!del.rowCount) throw httpError(404, 'Publicación no encontrada');
      if (imgs.length) await c.query('DELETE FROM images WHERE id = ANY($1::int[])', [imgs]);
    });
    res.json({ ok: true });
  })
);

router.post(
  '/api/products/:id/favorite',
  requireAuth,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const del = await pool.query('DELETE FROM favorites WHERE user_id = $1 AND product_id = $2', [req.user.id, id]);
    if (del.rowCount) return res.json({ favorited: false });
    const exists = await pool.query('SELECT 1 FROM products WHERE id = $1', [id]);
    if (!exists.rowCount) throw httpError(404, 'Publicación no encontrada');
    await pool.query('INSERT INTO favorites (user_id, product_id) VALUES ($1,$2)', [req.user.id, id]);
    res.json({ favorited: true });
  })
);

/* ---------- perfiles ---------- */
router.put(
  '/api/me',
  requireAuth,
  upload.single('avatar'),
  wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 60) throw httpError(400, 'Escribe tu nombre (entre 2 y 60 caracteres)');
    const bio = String(req.body.bio || '').trim().slice(0, 500);
    const city = String(req.body.city || '').trim().slice(0, 60);
    const phone = String(req.body.phone || '').trim().slice(0, 30);

    const user = await tx(async (c) => {
      let avatarId = req.user.avatar_id;
      let avatarUrl = req.user.avatar_url;
      if (req.file) {
        const newId = await saveImage(c, req.file);
        if (avatarId) await c.query('DELETE FROM images WHERE id = $1', [avatarId]);
        avatarId = newId;
        avatarUrl = null;
      } else if (req.body.removeAvatar === '1') {
        if (avatarId) await c.query('DELETE FROM images WHERE id = $1', [avatarId]);
        avatarId = null;
        avatarUrl = null;
      }
      const { rows } = await c.query(
        'UPDATE users SET name=$1, bio=$2, city=$3, phone=$4, avatar_id=$5, avatar_url=$6 WHERE id=$7 RETURNING *',
        [name, bio, city, phone, avatarId, avatarUrl, req.user.id]
      );
      return rows[0];
    });
    res.json({ user: publicUser(user) });
  })
);

router.get(
  '/api/users/:id',
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const u = (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    if (!u) throw httpError(404, 'Perfil no encontrado');
    const stats = (await pool.query(
      `SELECT ROUND(AVG(rating),1) AS rating, COUNT(*)::int AS reviews FROM reviews WHERE seller_id = $1`, [id]
    )).rows[0];
    const counts = (await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status='active')::int AS active, COUNT(*) FILTER (WHERE status='sold')::int AS sold FROM products WHERE seller_id = $1`, [id]
    )).rows[0];
    const list = (await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, b.id AS buyer_id, b.name AS buyer_name, ${AVATAR('b')} AS buyer_avatar
       FROM reviews r JOIN users b ON b.id = r.buyer_id WHERE r.seller_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [id]
    )).rows;

    let canReview = false;
    let myReview = null;
    if (req.user && req.user.role === 'buyer' && u.role === 'seller') {
      canReview = (await pool.query('SELECT 1 FROM conversations WHERE buyer_id = $1 AND seller_id = $2', [req.user.id, id])).rowCount > 0;
      myReview = list.find((r) => r.buyer_id === req.user.id) || null;
    }
    res.json({
      id: u.id, name: u.name, role: u.role, avatar: u.avatar_id ? `/img/${u.avatar_id}` : u.avatar_url,
      bio: u.bio, city: u.city, created_at: u.created_at,
      rating: stats.rating == null ? null : Number(stats.rating), reviews: stats.reviews,
      active: counts.active, sold: counts.sold, list, canReview, myReview,
    });
  })
);

router.post(
  '/api/users/:id/reviews',
  requireRole('buyer'),
  wrap(async (req, res) => {
    const sellerId = parseInt(req.params.id, 10);
    const rating = parseInt(req.body.rating, 10);
    const comment = String(req.body.comment || '').trim().slice(0, 600);
    if (!(rating >= 1 && rating <= 5)) throw httpError(400, 'Elige una calificación de 1 a 5 estrellas');
    const seller = (await pool.query(`SELECT id FROM users WHERE id = $1 AND role = 'seller'`, [sellerId])).rows[0];
    if (!seller) throw httpError(404, 'Vendedor no encontrado');
    const talked = await pool.query('SELECT 1 FROM conversations WHERE buyer_id = $1 AND seller_id = $2', [req.user.id, sellerId]);
    if (!talked.rowCount) throw httpError(403, 'Solo puedes calificar a vendedores con los que hayas conversado');
    await pool.query(
      `INSERT INTO reviews (seller_id, buyer_id, rating, comment) VALUES ($1,$2,$3,$4)
       ON CONFLICT (seller_id, buyer_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = now()`,
      [sellerId, req.user.id, rating, comment]
    );
    res.json({ ok: true });
  })
);

/* ---------- chat P2P ---------- */
router.post(
  '/api/conversations',
  requireRole('buyer'),
  wrap(async (req, res) => {
    const pid = parseInt(req.body.product_id, 10);
    const p = (await pool.query('SELECT id, seller_id, status FROM products WHERE id = $1', [pid])).rows[0];
    if (!p || p.status === 'paused') throw httpError(404, 'Publicación no encontrada');
    await pool.query(
      'INSERT INTO conversations (product_id, buyer_id, seller_id) VALUES ($1,$2,$3) ON CONFLICT (product_id, buyer_id) DO NOTHING',
      [pid, req.user.id, p.seller_id]
    );
    const c = (await pool.query('SELECT id FROM conversations WHERE product_id = $1 AND buyer_id = $2', [pid, req.user.id])).rows[0];
    res.json({ id: c.id });
  })
);

router.get(
  '/api/conversations',
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT c.id, c.product_id, p.title AS product_title, p.price AS product_price, ${COVER} AS cover,
              o.id AS other_id, o.name AS other_name, ${AVATAR('o')} AS other_avatar,
              lm.body AS last_body, lm.kind AS last_kind, lm.created_at AS last_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.read_at IS NULL)::int AS unread
       FROM conversations c
       JOIN products p ON p.id = c.product_id
       JOIN users o ON o.id = CASE WHEN c.buyer_id = $1 THEN c.seller_id ELSE c.buyer_id END
       LEFT JOIN LATERAL (SELECT body, kind, created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) lm ON true
       WHERE c.buyer_id = $1 OR c.seller_id = $1
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...r, product_price: Number(r.product_price) })));
  })
);

router.get(
  '/api/conversations/:id/messages',
  requireAuth,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const me = req.user.id;
    const after = parseInt(req.query.after, 10) || 0;
    let conversation;
    if (!after) {
      const cv = (await pool.query(
        `SELECT c.id, c.product_id, p.title AS product_title, p.price AS product_price, ${COVER} AS cover,
                o.id AS other_id, o.name AS other_name, o.role AS other_role, ${AVATAR('o')} AS other_avatar
         FROM conversations c JOIN products p ON p.id = c.product_id
         JOIN users o ON o.id = CASE WHEN c.buyer_id = $2 THEN c.seller_id ELSE c.buyer_id END
         WHERE c.id = $1 AND (c.buyer_id = $2 OR c.seller_id = $2)`,
        [id, me]
      )).rows[0];
      if (!cv) throw httpError(404, 'Conversación no encontrada');
      conversation = { ...cv, product_price: Number(cv.product_price) };
    } else {
      const ok = await pool.query('SELECT 1 FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)', [id, me]);
      if (!ok.rowCount) throw httpError(404, 'Conversación no encontrada');
    }
    await pool.query('UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL', [id, me]);
    const { rows } = await pool.query(
      'SELECT id, sender_id, kind, body, amount, created_at FROM messages WHERE conversation_id = $1 AND id > $2 ORDER BY id LIMIT 300',
      [id, after]
    );
    res.json({
      conversation,
      messages: rows.map((m) => ({ ...m, id: Number(m.id), amount: m.amount == null ? null : Number(m.amount) })),
    });
  })
);

router.post(
  '/api/conversations/:id/messages',
  requireAuth,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ok = await pool.query('SELECT 1 FROM conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)', [id, req.user.id]);
    if (!ok.rowCount) throw httpError(404, 'Conversación no encontrada');

    const kind = req.body.kind === 'offer' ? 'offer' : 'text';
    const body = String(req.body.body || '').trim().slice(0, 2000);
    let amount = null;
    if (kind === 'offer') {
      if (req.user.role !== 'buyer') throw httpError(403, 'Solo los compradores pueden hacer ofertas');
      amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Escribe un monto válido para tu oferta');
    } else if (!body) {
      throw httpError(400, 'Escribe un mensaje');
    }
    const { rows } = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, kind, body, amount) VALUES ($1,$2,$3,$4,$5) RETURNING id, sender_id, kind, body, amount, created_at',
      [id, req.user.id, kind, body, amount]
    );
    const m = rows[0];
    res.status(201).json({ ...m, id: Number(m.id), amount: m.amount == null ? null : Number(m.amount) });
  })
);

router.get(
  '/api/unread',
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.buyer_id = $1 OR c.seller_id = $1) AND m.sender_id <> $1 AND m.read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: rows[0].n });
  })
);

/* ---------- dashboard del vendedor ---------- */
router.get(
  '/api/dashboard',
  requireRole('seller'),
  wrap(async (req, res) => {
    const uid = req.user.id;
    const TZ = `'America/Costa_Rica'`;
    const [totals, series, products, viewers] = await Promise.all([
      pool.query(
        `SELECT
          (SELECT COUNT(*) FROM products WHERE seller_id = $1 AND status = 'active')::int AS active,
          (SELECT COUNT(*) FROM products WHERE seller_id = $1 AND status = 'sold')::int AS sold,
          (SELECT COUNT(*) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = $1)::int AS views,
          (SELECT COUNT(*) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = $1 AND v.created_at > now() - interval '7 days')::int AS views7,
          (SELECT COUNT(DISTINCT v.viewer_key) FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = $1)::int AS visitors,
          (SELECT COUNT(*) FROM favorites f JOIN products p ON p.id = f.product_id WHERE p.seller_id = $1)::int AS favorites,
          (SELECT COUNT(*) FROM conversations WHERE seller_id = $1)::int AS chats,
          (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.seller_id = $1 AND m.sender_id <> $1 AND m.read_at IS NULL)::int AS unread,
          (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE seller_id = $1) AS rating,
          (SELECT COUNT(*) FROM reviews WHERE seller_id = $1)::int AS reviews`,
        [uid]
      ),
      pool.query(
        `SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS views
         FROM generate_series(((now() AT TIME ZONE ${TZ})::date - 13)::timestamp, (now() AT TIME ZONE ${TZ})::date::timestamp, interval '1 day') d
         LEFT JOIN (
           SELECT (v.created_at AT TIME ZONE ${TZ})::date AS day, COUNT(*) AS n
           FROM product_views v JOIN products p ON p.id = v.product_id WHERE p.seller_id = $1 GROUP BY 1
         ) c ON c.day = d::date
         ORDER BY d`,
        [uid]
      ),
      pool.query(
        `SELECT p.id, p.title, p.price, p.status, p.category, p.created_at, ${COVER} AS cover,
                (SELECT COUNT(*) FROM product_views WHERE product_id = p.id)::int AS views,
                (SELECT COUNT(*) FROM product_views WHERE product_id = p.id AND created_at > now() - interval '7 days')::int AS views7,
                (SELECT COUNT(*) FROM favorites WHERE product_id = p.id)::int AS favorites,
                (SELECT COUNT(*) FROM conversations WHERE product_id = p.id)::int AS chats
         FROM products p WHERE p.seller_id = $1 ORDER BY p.created_at DESC`,
        [uid]
      ),
      pool.query(
        `SELECT v.created_at, p.id AS product_id, p.title, u.id AS user_id, u.name, ${AVATAR('u')} AS avatar
         FROM product_views v JOIN products p ON p.id = v.product_id LEFT JOIN users u ON u.id = v.viewer_id
         WHERE p.seller_id = $1 ORDER BY v.created_at DESC LIMIT 15`,
        [uid]
      ),
    ]);
    const t = totals.rows[0];
    res.json({
      totals: { ...t, rating: t.rating == null ? null : Number(t.rating) },
      series: series.rows,
      products: products.rows.map((p) => ({ ...p, price: Number(p.price) })),
      viewers: viewers.rows,
    });
  })
);

module.exports = router;
