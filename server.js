require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const { init } = require('./src/db');
const { authRouter, loadUser } = require('./src/auth');
const api = require('./src/routes');

const isProd = process.env.NODE_ENV === 'production';
const app = express();
app.set('trust proxy', 1); // Render está detrás de un proxy

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'], // https: para fotos de perfil de Google/Facebook
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        ...(isProd ? {} : { upgradeInsecureRequests: null }),
      },
    },
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(loadUser);

app.get('/healthz', (req, res) => res.send('ok'));
app.use(authRouter);
app.use(api);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '1h' : 0 }));

// Manejo de errores (incluye los de multer)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: 'Cada imagen debe pesar máximo 5 MB',
      LIMIT_UNEXPECTED_FILE: 'Máximo 5 imágenes por publicación',
      LIMIT_FILE_COUNT: 'Máximo 5 imágenes por publicación',
    };
    return res.status(400).json({ error: map[err.code] || 'No se pudo procesar el archivo' });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
init()
  .then(() => app.listen(PORT, () => console.log(`Marketico escuchando en el puerto ${PORT}`)))
  .catch((e) => {
    console.error('No se pudo iniciar:', e.message);
    process.exit(1);
  });
