# Rental Smart — Landing Page

Landing de captación para Rental Smart (gestión de Airbnb en Surco y San Borja).
El cliente conoce el servicio y deja sus datos en un formulario que se guarda en
una base de datos y dispara un email de aviso.

## Stack
- **Frontend:** HTML/CSS/JS estático, single-file (`index.html`). Sin build.
- **Hosting:** Netlify (+ Netlify Functions).
- **Backend del formulario:** `netlify/functions/submit-lead.js` (fetch nativo, sin deps).
- **Base de datos:** Supabase (Postgres), tabla `leads`.
- **Email de aviso:** Resend (opcional).

## Estructura
```
web-rentalsmart/
├── index.html                    # la landing completa
├── assets/                       # favicons + logos (del brand pack)
├── netlify/functions/submit-lead.js
├── netlify.toml                  # config de Netlify
├── supabase/schema.sql           # crea la tabla leads
├── .env.example                  # variables de entorno (referencia)
└── docs/DESPLIEGUE.md            # guía de despliegue paso a paso
```

## Marca
Sigue `1. MKT/rentalsmart_pack/MANUAL_DE_MARCA.md`:
Midnight `#1A2538` + Cream `#F5F0E6` + Terracotta `#C66B3D` (acento <10%);
tipos Outfit + Geist Mono + Instrument Serif; mínimo 60% espacio negativo.

## Probar en local
```
python3 -m http.server 8765 --directory web-rentalsmart
```
(El formulario solo guarda en producción, con las variables de entorno de Netlify.)

## Desplegar
Ver `docs/DESPLIEGUE.md`.
