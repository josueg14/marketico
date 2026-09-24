# Marketico

Marketplace entre personas (P2P) con dos tipos de cuenta —**comprador** y **vendedor**—, login con Google y Facebook, chat con ofertas, perfiles con foto, calificaciones de vendedores y un panel de analíticas para saber quién vio cada publicación.

**Stack:** Node.js + Express · PostgreSQL · JavaScript vanilla (SPA sin build) · listo para Render.

## Funciones

- **Dos formas de entrar:** pestañas Comprador / Vendedor en el login y el registro.
- **Google y Facebook:** OAuth 2.0 implementado directamente (sin Passport). Los botones aparecen solo si configuras las credenciales.
- **Publicaciones:** título, descripción, precio (₡), categoría, estado del artículo, ciudad y opción de trueque. Hasta **5 imágenes por archivo** (no por enlace), con arrastrar y soltar, portada y reordenamiento. Las fotos se comprimen en el navegador antes de subir.
- **Panel del vendedor:** vistas totales y de 7 días, visitantes únicos, favoritos, conversaciones, gráfico de 14 días, **quién vio tus publicaciones** y estadísticas por artículo.
- **Chat P2P:** conversaciones por artículo, mensajes de texto y **ofertas de precio**, contador de no leídos.
- **Perfiles:** foto, nombre, ciudad, teléfono y biografía. Perfil público con productos y reseñas.
- **Reseñas:** los compradores califican de 1 a 5 estrellas a un vendedor (solo si conversaron con él). Una reseña por comprador, editable.
- **Favoritos, búsqueda, filtros** (categoría, precio, trueque, orden) y paginación.
- **Responsive:** en celular usa barra de navegación inferior.
- **Seguridad:** contraseñas con bcrypt, sesión en cookie httpOnly (JWT), Helmet, límite de intentos en login, validación del tipo real de las imágenes (no se confía en la extensión).

## Estructura

```
marketico/
├── server.js            # arranque de Express
├── render.yaml          # blueprint de Render (web + PostgreSQL)
├── package.json
├── .env.example
├── src/
│   ├── db.js            # conexión y esquema SQL (se crea solo al iniciar)
│   ├── auth.js          # registro, login, Google, Facebook, sesión
│   ├── routes.js        # API: productos, perfiles, chat, reseñas, panel
│   └── util.js
└── public/
    ├── index.html
    ├── css/styles.css
    └── js/app.js        # la SPA completa
```

## Correr en local

Necesitas Node 18+ y PostgreSQL.

```bash
createdb marketico
cp .env.example .env      # edita DATABASE_URL y JWT_SECRET
npm install
npm run dev
```

Abre <http://localhost:3000>. Las tablas se crean automáticamente la primera vez.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Marketico"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/marketico.git
git push -u origin main
```

El archivo `.gitignore` ya excluye `.env` y `node_modules`.

## Desplegar en Render

1. En [render.com](https://render.com) elige **New → Blueprint** y conecta tu repositorio.
2. Render lee `render.yaml` y crea la base de datos PostgreSQL y el servicio web. `JWT_SECRET` y `DATABASE_URL` se configuran solos.
3. Cuando termine, copia la URL asignada (por ejemplo `https://marketico.onrender.com`).
4. En el servicio web, ve a **Environment** y define `BASE_URL` con esa URL (sin `/` al final). Guarda: Render reinicia la app.
5. Configura Google y Facebook (abajo) y pega las credenciales en las variables de entorno.

> **Plan gratuito:** el servicio se duerme tras un rato sin visitas y la primera carga tarda unos segundos. La base de datos gratuita de Render tiene vencimiento; para producción real usa un plan de pago. Las imágenes se guardan en la base de datos, así que no se pierden cuando el servicio se reinicia.

## Login con Google

1. Entra a [Google Cloud Console → Credenciales](https://console.cloud.google.com/apis/credentials) y crea un **ID de cliente OAuth** de tipo *Aplicación web*.
2. En **URI de redireccionamiento autorizados** agrega:
   - `https://TU-APP.onrender.com/auth/google/callback`
   - `http://localhost:3000/auth/google/callback` (para local)
3. Copia el ID y el secreto a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
4. Configura la pantalla de consentimiento (nombre de la app, correo de soporte). Mientras esté en modo *Prueba*, agrega tu correo como usuario de prueba.

## Login con Facebook

1. Entra a [Meta for Developers](https://developers.facebook.com/apps) y crea una app de tipo *Consumidor* (o *Autenticar y solicitar datos de usuarios*).
2. Agrega el producto **Inicio de sesión con Facebook** → Configuración.
3. En **URI de redireccionamiento de OAuth válidos** agrega:
   - `https://TU-APP.onrender.com/auth/facebook/callback`
   - `http://localhost:3000/auth/facebook/callback`
4. En Configuración → Básica copia el *ID de la app* y la *Clave secreta* a `FACEBOOK_APP_ID` y `FACEBOOK_APP_SECRET`.
5. Mientras la app esté en modo *Desarrollo*, solo pueden entrar los roles de la app (tú y los testers). Para abrirla al público, cambia a modo *Activo*.

Al usar Google o Facebook desde la pestaña **Vendedor** o **Comprador**, la cuenta nueva se crea con ese rol. Si el correo ya existe, se vincula a la cuenta existente.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL |
| `DATABASE_SSL` | `true` / `false`. Por defecto `true` en producción |
| `JWT_SECRET` | Secreto largo y aleatorio para firmar sesiones |
| `BASE_URL` | URL pública de la app, sin `/` al final |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales de Google |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Credenciales de Facebook |
| `PORT` | Puerto (Render lo asigna solo) |

## API (resumen)

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Sesión |
| GET | `/api/auth/me`, `/api/meta` | Usuario actual y catálogos |
| GET | `/api/products` | Listado con filtros |
| GET/PUT/DELETE | `/api/products/:id` | Detalle, editar, borrar |
| POST | `/api/products` | Crear (vendedor, multipart con `images`) |
| PATCH | `/api/products/:id/status` | Activo / pausado / vendido |
| POST | `/api/products/:id/favorite` | Guardar o quitar favorito |
| PUT | `/api/me` | Editar mi perfil y foto |
| GET | `/api/users/:id` | Perfil público y reseñas |
| POST | `/api/users/:id/reviews` | Calificar vendedor |
| GET/POST | `/api/conversations`, `/api/conversations/:id/messages` | Chat y ofertas |
| GET | `/api/dashboard` | Analíticas del vendedor |

## Ideas para seguir creciendo

Notificaciones por correo, pagos o reserva de artículos, verificación de teléfono, moderación de publicaciones, WebSockets en lugar de sondeo para el chat.

## Licencia

MIT
