# Guía de despliegue — Rental Smart (paso a paso)

Esta guía deja la web en internet, conectada a la base de datos y al dominio
`Rentalsmart.pe`. No necesitas saber programar. Sigue los pasos en orden.

Tiempo estimado: 30–45 minutos.

---

## ANTES DE EMPEZAR — ten a la mano
- [ ] Cuenta de Supabase con un proyecto creado (y la contraseña de la BD guardada).
- [ ] Cuenta de Netlify.
- [ ] Cuenta de Resend (opcional, para el email de aviso).
- [ ] Acceso a GoDaddy donde compraste `Rentalsmart.pe`.
- [ ] La carpeta `web-rentalsmart` (esta misma).

---

## PASO 1 · Crear la base de datos en Supabase

1. Entra a tu proyecto en [supabase.com](https://supabase.com).
2. Menú izquierdo → **SQL Editor** → botón **New query**.
3. Abre el archivo `supabase/schema.sql` de esta carpeta, copia TODO su contenido y pégalo.
4. Pulsa **Run** (abajo a la derecha). Debe decir "Success".
5. Verifica: menú izquierdo → **Table Editor** → debe aparecer la tabla **leads** (vacía).

### Copiar las 2 claves que necesitaremos
6. Menú izquierdo → **Project Settings** (engranaje) → **API**.
7. Copia y guarda en un bloc de notas temporal:
   - **Project URL** → es tu `SUPABASE_URL` (ej: `https://abcd1234.supabase.co`).
   - **service_role** (en "Project API keys", pulsa "Reveal") → es tu `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ La clave **service_role** es SECRETA. No la pongas en la web, no la mandes por chat,
> no la subas a GitHub. Solo vivirá dentro de Netlify (Paso 3).

---

## PASO 2 · Subir la web a Netlify

Tienes dos formas. La **A (arrastrar)** es la más simple.

### Opción A — Arrastrar la carpeta (sin GitHub)
1. Entra a [app.netlify.com](https://app.netlify.com).
2. Pestaña **Sites** → arrastra la carpeta `web-rentalsmart` completa a la zona
   que dice "Drag and drop your site output folder here".
3. Netlify la sube y te da una URL temporal tipo `https://random-name.netlify.app`.
   La web ya se ve, pero el formulario aún NO guarda (faltan las claves → Paso 3).

> Para futuras actualizaciones: vuelve a arrastrar la carpeta sobre el mismo sitio
> (pestaña **Deploys** → "Drag and drop").

### Opción B — Con GitHub (recomendado si quieres auto-publicar)
1. Sube la carpeta `web-rentalsmart` a un repositorio nuevo en GitHub.
2. En Netlify → **Add new site** → **Import an existing project** → GitHub → elige el repo.
3. Build command: (déjalo vacío). Publish directory: `.`  Functions directory: `netlify/functions`.
4. Deploy. Cada vez que cambies algo en GitHub, Netlify republica solo.

---

## PASO 3 · Configurar las variables de entorno (las claves)

1. En Netlify, abre tu sitio → **Site configuration** → **Environment variables**.
2. Pulsa **Add a variable** → **Add a single variable** y crea estas (una por una):

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | tu Project URL del Paso 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | tu clave service_role del Paso 1 |
   | `NOTIFY_EMAIL` | `Rentalsmart.peru@gmail.com` |
   | `RESEND_API_KEY` | (opcional) tu clave de Resend — ver Paso 4 |
   | `FROM_EMAIL` | (opcional) `Rental Smart <onboarding@resend.dev>` |

3. Tras guardarlas, ve a **Deploys** → **Trigger deploy** → **Deploy site**
   (para que las funciones tomen las nuevas variables).

---

## PASO 4 · Email de aviso con Resend (opcional pero recomendado)

Si quieres recibir un correo por cada lead:
1. Entra a [resend.com](https://resend.com) → **API Keys** → **Create API Key** →
   copia la clave (empieza con `re_...`).
2. Pégala en Netlify como `RESEND_API_KEY` (Paso 3) y vuelve a desplegar.
3. Con la clave recién creada y sin dominio verificado, Resend solo deja enviar
   correos **a tu propia cuenta de Resend**. Como te registraste con
   `Rentalsmart.peru@gmail.com`, los avisos a ese correo funcionarán.
4. (Más adelante) Para enviar desde `notificaciones@rentalsmart.pe`: en Resend →
   **Domains** → añade `rentalsmart.pe` y agrega los registros DNS que te indique
   en GoDaddy. Luego cambia `FROM_EMAIL` a `Rental Smart <notificaciones@rentalsmart.pe>`.

---

## PASO 5 · Conectar el dominio Rentalsmart.pe

1. En Netlify → tu sitio → **Domain management** → **Add a domain** →
   escribe `rentalsmart.pe` → **Verify** → **Add domain**.
2. Netlify te mostrará a qué apuntar. Lo más simple:
   - Añade también `www.rentalsmart.pe`.
   - Netlify te dará una opción de **nameservers** o de **registros DNS**.
3. En **GoDaddy** → **My Products** → `rentalsmart.pe` → **DNS** / **Manage DNS**:
   - **Forma fácil (registros):** crea un registro **A** para `@` apuntando a la IP
     que indique Netlify (`75.2.60.5`), y un registro **CNAME** para `www`
     apuntando a tu subdominio `tu-sitio.netlify.app`.
   - (Sigue exactamente los valores que muestre Netlify; pueden variar.)
4. Espera la propagación (de minutos hasta 24–48h). Netlify activa el **HTTPS**
   (candado) automáticamente cuando el dominio resuelve.

---

## PASO 6 · Probar todo de punta a punta

1. Abre `https://rentalsmart.pe` (o la URL `.netlify.app`).
2. Baja al formulario, llénalo con datos de prueba y envía.
3. Debe aparecer "¡Gracias! ... te contactamos en menos de 1 hora".
4. En Supabase → **Table Editor** → **leads** → debe estar tu registro de prueba.
5. Si activaste Resend, revisa que llegó el correo a `Rentalsmart.peru@gmail.com`.

Si algo falla: Netlify → tu sitio → **Logs** → **Functions** → `submit-lead`
muestra el error exacto.

---

## CÓMO VER Y EXPORTAR LOS LEADS (tu "base de datos")

- **Ver:** Supabase → **Table Editor** → **leads**. Ahí ves cada contacto con fecha.
- **Filtrar/ordenar:** usa los controles de la tabla (por zona, por fecha…).
- **Exportar a Excel/CSV:** en la vista de la tabla → menú **…** → **Export to CSV**.
- **Avisos en vivo:** te llegan al correo (si activaste Resend).

---

## RESUMEN DE QUÉ CLAVE VA DÓNDE

| Clave | De dónde sale | Dónde se pega | ¿Secreta? |
|---|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API | Netlify env vars | No (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Netlify env vars | **SÍ** |
| `RESEND_API_KEY` | Resend → API Keys | Netlify env vars | **SÍ** |
| `NOTIFY_EMAIL` | tu correo | Netlify env vars | No |

Nunca pongas las claves marcadas **SÍ** dentro de `index.html` ni en GitHub.
