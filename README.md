# Mi Progresión · Tropa Scout

Web para que los jóvenes registren su progresión personal (el Excel "TROPA – Progresión personal") y los adultos de programa la revisen.
Hecha con React + Vite, base de datos y usuarios en **Supabase** (gratis), publicada en **Vercel**.

## Qué incluye
- **Jóvenes:** crean cuenta, marcan indicadores de las 6 áreas (etapas 3 y 4), Aventurero, especialidades (bronce/plata/oro + punta de flecha), vida de grupo (campamentos y excursiones), créditos y cuaderno de notas. Ven su camino hacia Explorador (90), Pionero (140) y Scout de Bolívar (177).
- **Adultos:** panel con todos los jóvenes, filtros, pendientes de revisión, **aprobar o pedir ajustes con comentario** por cada logro, "Aprobar todo", y descarga de resumen en CSV (abre en Excel).
- Seguridad en la base de datos: un joven solo ve lo suyo; solo un adulto puede aprobar; nadie puede hacerse adulto sin el código secreto.

## Puesta en marcha (≈15 min)

### 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. **SQL Editor** → pega todo `supabase/schema.sql` → *Run*.
3. En el mismo SQL Editor, cambia el código de adultos:
   `update app_settings set value = 'TU-CODIGO-SECRETO' where key = 'adult_code';`
4. **Authentication → Providers → Email:** desactiva *Confirm email* (así los jóvenes entran de inmediato). Si lo dejas activo, deben confirmar su correo.
5. **Authentication → URL Configuration:** pon como *Site URL* la dirección de tu web en Vercel (sirve para recuperar contraseña).
6. **Project Settings → API:** copia *Project URL* y la clave *anon public*.

### 2. Vercel
1. Sube esta carpeta a un repositorio de GitHub e impórtalo en https://vercel.com/new (Framework: Vite, se detecta solo).
2. En *Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. *Deploy*.

### 3. Primer uso
- Los adultos entran a **Crear cuenta → "Soy adulto del programa"** e ingresan el código secreto.
- Los jóvenes crean su cuenta normal con el enlace de la web.

## Probar sin configurar nada (modo demo)
```bash
npm install
npm run demo      # entra con ana@demo.com (joven) o adulto@demo.com (adulto)
```
Los datos del demo viven solo en tu navegador.

## Notas
- Si un joven olvida su contraseña, usa "Olvidé mi contraseña" (le llega un correo). Hermanos con el mismo correo pueden usar `padre+nombre@gmail.com`.
- Son datos de menores: usa la web solo con autorización de los representantes y no compartas el código de adulto.
- Los textos de indicadores salen del Excel (se corrigieron dos erratas: "de oro" → "de otros", "al aporte" → "el aporte"). Para editarlos: `src/lib/raw.js`.
- Metas y umbrales (Explorador >80 de 90, Pionero >110 de 140, Bolívar >135 de 177, mínimo 16 créditos) están en `src/lib/data.js`.

## Actualización: registro en la ASV y ficha médica (solo estado)
Si ya instalaste la versión anterior, corre **una vez** `supabase/migracion_2_registro_asv.sql` en el SQL Editor (Run). Antes de eso la web funciona igual, solo oculta esa tarjeta.
- Los adultos marcan por joven: *inscrito en la ASV (IMPEESA)* + año, y *ficha médica entregada* + fecha. El joven solo lo ve.
- **No se guarda ningún dato médico** en esta web. El contenido de la ficha se queda en el papel o en IMPEESA.
- Esta web **no se conecta con IMPEESA** (no hay API pública ni autorización). Si la ASV la habilita, se puede integrar después.

## Actualización 3: patrulla y mejoras
Corre **una vez** `supabase/migracion_3_patrulla.sql` en el SQL Editor **antes** de subir esta versión a GitHub. Sin ella, guardar la patrulla desde "Mi perfil" dará error.
- Nuevos registros: la patrulla es obligatoria. Los ya registrados ven un aviso en Inicio que los lleva a "Mi perfil".
- Panel de adultos: patrulla en cada joven, filtro por patrulla, filtro "sin actividad (30 días)" y columna Patrulla en el CSV.
- Joven: insignias automáticas, sugerencia de "siguiente paso", filtro "solo los que me faltan" en cada área, confirmación al desmarcar algo ya aprobado, botón imprimir.
- Instalable en el celular ("Agregar a pantalla de inicio") con ícono de flor de lis.

## Actualización 4 — Los adultos pueden marcar indicadores a los jóvenes

Sirve para ciclos institucionales, programas mundiales o actividades donde los jóvenes no saben qué indicadores cumplieron.

**Orden para actualizar (importante):**
1. En Supabase → SQL Editor, ejecuta una sola vez `supabase/migracion_4_marcar_adultos.sql`.
2. Después sube el código nuevo a GitHub (Vercel despliega solo).

**Cómo se usa**
- **Panel → Registrar actividad**: eliges la actividad (y opcionalmente +1 crédito), los jóvenes (con filtro por patrulla) y los indicadores. Puedes guardar la selección como plantilla; las plantillas son compartidas entre adultos.
- **Ficha de un joven → cualquier indicador**: botón para marcarlo indicando «¿Por qué actividad?».
- Lo marcado por adultos queda **aprobado** y con el nombre de la actividad. El joven lo ve en su inicio como «Tus adultos te marcaron logros».
- Si el joven desmarca algo aprobado por un adulto, se le pide confirmación.

## Actualización 5 — Los niveles solo cuentan lo aprobado por adultos

**Orden para actualizar:** 1) ejecuta `supabase/migracion_5_niveles_aprobados.sql` en Supabase → SQL Editor (una sola vez); 2) sube el código nuevo a GitHub.

Un nivel se alcanza únicamente cuando un adulto aprobó TODO esto (y los niveles van en orden):
- **Explorador:** más de 80 indicadores aprobados, 6 campamentos, 12 excursiones y 16 créditos.
- **Pionero:** más de 110 indicadores aprobados, 3 campamentos y 6 excursiones.
- **Scout de Bolívar:** más de 135 indicadores aprobados, 4 campamentos y 8 excursiones.

Lo que el joven marca por su cuenta espera revisión y no cuenta para el nivel. Los créditos los registran solo los adultos (el joven ya no puede agregarlos). El inicio muestra una tarjeta «Para ser …» con lo que falta.
