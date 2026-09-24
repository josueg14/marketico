const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool } = require('./db');
const { httpError, wrap } = require('./util');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.JWT_SECRET) console.warn('⚠️  Define JWT_SECRET en producción');

const COOKIE = 'mk_token';
const router = express.Router();

/* ---------- utilidades ---------- */
const avatarOf = (u) => (u.avatar_id ? `/img/${u.avatar_id}` : u.avatar_url || null);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: avatarOf(u),
  bio: u.bio || '',
  city: u.city || '',
  phone: u.phone || '',
  created_at: u.created_at,
});

function setSession(res, user) {
  const token = jwt.sign({ uid: user.id }, SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

/* ---------- middlewares ---------- */
async function loadUser(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE];
  if (token) {
    try {
      const { uid } = jwt.verify(token, SECRET);
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [uid]);
      req.user = rows[0] || null;
    } catch (_) {
      req.user = null;
    }
  }
  next();
}

const requireAuth = (req, res, next) =>
  req.user ? next() : next(httpError(401, 'Debes iniciar sesión'));

const requireRole = (role) => (req, res, next) => {
  if (!req.user) return next(httpError(401, 'Debes iniciar sesión'));
  if (req.user.role !== role) {
    return next(
      httpError(403, role === 'seller' ? 'Solo las cuentas de vendedor pueden hacer esto' : 'Solo las cuentas de comprador pueden hacer esto')
    );
  }
  next();
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

/* ---------- correo y contraseña ---------- */
router.post(
  '/api/auth/register',
  authLimiter,
  wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role;

    if (name.length < 2 || name.length > 60) throw httpError(400, 'Escribe tu nombre (entre 2 y 60 caracteres)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'El correo no es válido');
    if (password.length < 8) throw httpError(400, 'La contraseña debe tener al menos 8 caracteres');
    if (!['buyer', 'seller'].includes(role)) throw httpError(400, 'Elige si eres comprador o vendedor');

    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount) throw httpError(409, 'Ya existe una cuenta con ese correo');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, hash, role]
    );
    setSession(res, rows[0]);
    res.status(201).json({ user: publicUser(rows[0]) });
  })
);

router.post(
  '/api/auth/login',
  authLimiter,
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role;

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) throw httpError(401, 'Correo o contraseña incorrectos');
    if (!user.password_hash) throw httpError(401, 'Esta cuenta se creó con Google o Facebook. Usa esos botones para entrar.');
    if (!(await bcrypt.compare(password, user.password_hash))) throw httpError(401, 'Correo o contraseña incorrectos');
    if (role && user.role !== role) {
      throw httpError(403, `Esta cuenta es de ${user.role === 'seller' ? 'vendedor' : 'comprador'}. Cambia de pestaña para entrar.`);
    }
    setSession(res, user);
    res.json({ user: publicUser(user) });
  })
);

router.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

router.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

/* ---------- OAuth (Google y Facebook) ---------- */
const baseUrl = (req) =>
  (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

async function postForm(url, data) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data),
  });
  return r.json();
}
const getJson = async (url, token) => {
  const r = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  return r.json();
};

const PROVIDERS = {
  google: {
    id: () => process.env.GOOGLE_CLIENT_ID,
    secret: () => process.env.GOOGLE_CLIENT_SECRET,
    authUrl: (o) =>
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: o.id,
        redirect_uri: o.redirect,
        response_type: 'code',
        scope: 'openid email profile',
        state: o.state,
        prompt: 'select_account',
      }),
    async profile(code, o) {
      const t = await postForm('https://oauth2.googleapis.com/token', {
        code,
        client_id: o.id,
        client_secret: o.secret,
        redirect_uri: o.redirect,
        grant_type: 'authorization_code',
      });
      if (!t.access_token) throw new Error('Google no devolvió token');
      const p = await getJson('https://openidconnect.googleapis.com/v1/userinfo', t.access_token);
      return { id: p.sub, email: p.email_verified ? p.email : null, name: p.name, picture: p.picture };
    },
  },
  facebook: {
    id: () => process.env.FACEBOOK_APP_ID,
    secret: () => process.env.FACEBOOK_APP_SECRET,
    authUrl: (o) =>
      'https://www.facebook.com/v19.0/dialog/oauth?' +
      new URLSearchParams({
        client_id: o.id,
        redirect_uri: o.redirect,
        state: o.state,
        scope: 'email,public_profile',
      }),
    async profile(code, o) {
      const t = await getJson(
        'https://graph.facebook.com/v19.0/oauth/access_token?' +
          new URLSearchParams({ client_id: o.id, client_secret: o.secret, redirect_uri: o.redirect, code })
      );
      if (!t.access_token) throw new Error('Facebook no devolvió token');
      const p = await getJson(
        'https://graph.facebook.com/me?' +
          new URLSearchParams({ fields: 'id,name,email,picture.width(300).height(300)', access_token: t.access_token })
      );
      return { id: p.id, email: p.email || null, name: p.name, picture: p.picture && p.picture.data && p.picture.data.url };
    },
  },
};

async function findOrCreate(provider, profile, role) {
  const col = provider === 'google' ? 'google_id' : 'facebook_id'; // valores fijos, seguros
  let { rows } = await pool.query(`SELECT * FROM users WHERE ${col} = $1`, [profile.id]);
  let user = rows[0];

  if (!user && profile.email) {
    ({ rows } = await pool.query('SELECT * FROM users WHERE email = $1', [profile.email.toLowerCase()]));
    user = rows[0];
    if (user) {
      await pool.query(`UPDATE users SET ${col} = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3`, [
        profile.id,
        profile.picture || null,
        user.id,
      ]);
    }
  }
  if (!user) {
    ({ rows } = await pool.query(
      `INSERT INTO users (name, email, role, avatar_url, ${col}) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [profile.name || 'Usuario', profile.email ? profile.email.toLowerCase() : null, role, profile.picture || null, profile.id]
    ));
    user = rows[0];
  }
  return user;
}

router.get('/auth/:provider', (req, res) => {
  const P = PROVIDERS[req.params.provider];
  if (!P) return res.redirect('/#/login');
  if (!P.id() || !P.secret()) {
    return res.redirect('/#/login?error=' + encodeURIComponent('Este método de acceso aún no está configurado'));
  }
  const role = req.query.role === 'seller' ? 'seller' : 'buyer';
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = jwt.sign({ role, nonce }, SECRET, { expiresIn: '10m' });
  res.cookie('mk_oauth', nonce, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 10 * 60 * 1000 });
  res.redirect(
    P.authUrl({ id: P.id(), redirect: `${baseUrl(req)}/auth/${req.params.provider}/callback`, state })
  );
});

router.get(
  '/auth/:provider/callback',
  wrap(async (req, res) => {
    const fail = (m) => res.redirect('/#/login?error=' + encodeURIComponent(m));
    const P = PROVIDERS[req.params.provider];
    if (!P) return fail('Método de acceso desconocido');
    if (req.query.error || !req.query.code) return fail('Acceso cancelado');

    let st;
    try {
      st = jwt.verify(String(req.query.state), SECRET);
    } catch (_) {
      return fail('La solicitud expiró. Inténtalo de nuevo.');
    }
    if (!st.nonce || st.nonce !== req.cookies.mk_oauth) return fail('No se pudo verificar la solicitud');
    res.clearCookie('mk_oauth');

    try {
      const profile = await P.profile(String(req.query.code), {
        id: P.id(),
        secret: P.secret(),
        redirect: `${baseUrl(req)}/auth/${req.params.provider}/callback`,
      });
      if (!profile.id) throw new Error('Perfil sin id');
      const user = await findOrCreate(req.params.provider, profile, st.role);
      setSession(res, user);
      res.redirect(user.role === 'seller' ? '/#/panel' : '/#/');
    } catch (e) {
      console.error('OAuth error:', e.message);
      fail('No pudimos iniciar sesión con ' + (req.params.provider === 'google' ? 'Google' : 'Facebook'));
    }
  })
);

module.exports = { authRouter: router, loadUser, requireAuth, requireRole, publicUser, avatarOf };
