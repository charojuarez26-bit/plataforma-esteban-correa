# Esteban Correa - Personal Trainer Platform

Plataforma integral de alto rendimiento para la gestión y entrenamiento de atletas y alumnos de **Esteban Correa Personal Trainer**.

> **"Construí tu mejor versión"**  
> *DISCIPLINA • CONSTANCIA • RESULTADOS*

---

## ⚡ 1. Optimización para Loc-OS Linux
Esta aplicación fue diseñada y optimizada para ejecutarse con **bajo consumo de memoria RAM y CPU** en distribuciones ligeras como **Loc-OS Linux** (basada en Debian) y entornos web/móviles responsivos:
- **Build ultraligero:** Vite + React 18 + Tailwind CSS.
- **Entorno Node portátil listo:** Incluye binarios compatibles en `.node/bin` si el sistema anfitrión no tiene Node.js instalado globalmente.
- **Script de 1-Click:** Archivo `./iniciar.sh` ejecutable desde terminal o gestor de archivos en Loc-OS.

---

## 🚀 2. Inicio Rápido en Loc-OS Linux

### Opción A: Mediante el script directo
Abre una terminal en esta carpeta y ejecuta:
```bash
./iniciar.sh
```

### Opción B: Mediante npm estándar
```bash
npm run dev
```
La aplicación quedará disponible en:  
👉 **http://localhost:3000** (y visible en tu red local para probar desde tu celular o tablet).

---

## 🔐 3. Credenciales y Modos de Acceso

La plataforma cuenta con dos roles completamente diferenciados y botones de acceso rápido de prueba (1-Click):

### 🏋️ Rol 1: Entrenador (Admin)
- **Email:** `esteban@correafit.com`
- **Contraseña:** `admin123`
- **Capacidades:**
  - **Dashboard Principal:** Métricas en vivo (Clientes Activos, Entrenamientos Hoy, Evaluaciones Pendientes, Planes por Vencer), gráfico de adherencia semanal y accesos rápidos.
  - **Gestión de Clientes:** Fichas individuales con pestañas (Resumen, Rutinas, Progreso, Pagos, Notas), modal para alta de alumnos y generación automática de códigos de acceso.
  - **Biblioteca de Ejercicios & Creador de Rutinas:** Filtros por grupo muscular (*Pecho, Espalda, Piernas, Hombros, Brazos, Core*), pautas técnicas y asignador con series, repes, peso sugerido y descansos.
  - **Seguimiento Antropométrico:** Gráfica de peso en el tiempo y tabla comparativa de medidas con variaciones (+/- cm en cintura, cadera, brazo, etc.).
  - **Agenda / Turnos:** Vistas Mes/Semana/Día con diferenciación visual de turnos Presenciales vs Online y panel de detalle.
  - **Finanzas:** Balance de ingresos mensuales, medios de pago y seguimiento de cuotas al día/vencidas.

### 📱 Rol 2: Alumno (Portal Móvil)
- **Acceso simplificado sin contraseña.**
- **Nombre:** `Martín Gómez` | **Código:** `MG-4821`
- *(Alternativa: `Lucía Fernández` | Código: `LF-9023`)*
- **Capacidades:**
  1. **Mi Rutina:** Ejercicios del día con instrucciones técnicas, series, repeticiones y **checklist interactivo de series completadas**.
  2. **Mi Progreso:** Sus gráficos personales de evolución de peso y medidas.
  3. **Mi Plan:** Detalle de cuota, fecha de vencimiento y estado de pago.
  4. **Contacto:** Enlace directo de WhatsApp con mensaje personalizado hacia el entrenador.

---

## 🗄️ 4. Base de Datos & Supabase

El archivo [supabase/schema.sql](file:///home/exe/Descargas/estiv/supabase/schema.sql) incluye la definición completa DDL y políticas de seguridad:
- Tablas: `coaches`, `clients`, `exercises`, `routines`, `routine_exercises`, `evaluations`, `payments` y `appointments`.
- **Row Level Security (RLS)** activado.
- Función RPC `get_student_portal(p_code, p_name)` para consulta blindada del alumno.

### Para conectar tu Supabase en producción:
1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Rellena las variables:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon
   VITE_COACH_WHATSAPP=54911xxxxxxxx
   ```
3. Ejecuta el script SQL en el **SQL Editor** de Supabase.

*Nota: Si no configuras las variables `.env`, la aplicación funcionará fluidamente en **Modo Local Reactivo (Demo)** con persistencia en `localStorage`.*

---

## 🎨 5. Identidad Visual & Diseño
- **Fondo:** `#0a0a0c` y `#121216`
- **Tarjetas:** `#18181f` con bordes `#272733`
- **Acento Deportivo:** Rojo `#e50914` / `#ef4444`
- **Tipografías:** *Montserrat* (títulos de fuerza) e *Inter* (lectura limpia).
