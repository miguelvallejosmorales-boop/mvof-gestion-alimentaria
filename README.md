# 🍽️ MVOF · Gestión Alimentaria · v3.0

Sistema de minutas, recetas y planificación nutricional para casinos e instituciones,
con **Biblioteca Nutricional INTA**, autenticación por perfiles y gestión de usuarios.

## ✨ Novedades v3.0
- 🎨 **Rediseño moderno** manteniendo la paleta verde salvia (sage).
- 🌿 **Badge de origen** en ingredientes (INTA / INTA match / Propio) + filtro.
- 🐛 **Fixes**: service worker reescrito (network-first), cache-busting `?v=3.0.0`,
  y código defensivo (adiós al `Cannot set properties of null`).
- ⚡ PWA instalable, safe-area para iPhone, responsive pulido.

## 🚀 Deploy en Vercel
1. Sube TODO el contenido de esta carpeta al repo (reemplaza lo anterior).
2. `git add . && git commit -m "feat: v3.0 rediseño + INTA + fixes" && git push`
3. Vercel redepliega solo (~30s).
4. **Primera vez** (para soltar la caché vieja): abre `tudominio/reset-sw.html`
   y toca "Desregistrar SW", o en PC haz Ctrl+Shift+R.

## 🔑 Usuarios demo
| Usuario | Contraseña | Perfil |
|---------|-----------|--------|
| admin | admin123 | Administrador |
| nutri_prod | nutri123 | Nutricionista Producción |
| nutri_clin | clinica123 | Nutricionista Clínica |
| cocina | cocina123 | Cocina |

## 🗄️ Backend (Supabase)
Schema `minutas`. Credenciales precargadas en `assets/js/config.js` (editables
desde ⚙️ Configuración). Recuerda tener expuesto el schema `minutas` en
Settings → API → Exposed schemas, y las vistas `nutrition.*` para la Biblioteca.

## 📁 Estructura
```
index.html · sw.js · manifest.json · vercel.json · reset-sw.html · package.json
assets/
  css/ base layout components modules badge auth pwa barcode print responsive
  js/  config auth permissions app minutas recetas dashboard compras
       usuarios auditoria barcode scanner inventario pwa
  img/ logo.svg + iconos PWA
```

## 🎨 Paleta (sage)
`#5B7C6E` · `#45695A` · `#3D5449` · fondos `#F6F8F6` / `#FFFFFF` · texto `#141C18`.

© 2026 MVOF · Miguel Vallejos Morales
