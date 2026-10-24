# 🌟 Muro Digital de Reconocimiento · Jóvenes creaTIvos 2026

Aplicación Fullstack (**Express + Mongoose + MongoDB Atlas** en el backend y **React + Vite** en el frontend) para la actividad presencial/remota de integración grupal **"Reconociéndonos: Compartiendo lo positivo"**.

## 🗓️ Etapas integradas de la dinámica (11:15 – 12:00)

1. **11:15 – 11:20 · Organización actividad (`RegistroParticipante.jsx` y `RompehieloGrupo.jsx`)**:
   - Explicación del propósito de la actividad, cronograma visible y organización en **grupos de 4 personas** (manual al ingresar o automática con el botón **"👥 Armar grupos de 4"**).
2. **11:20 – 11:30 · Rompehielo: Conociéndonos mejor (`RompehieloGrupo.jsx`)**:
   - Cada joven comparte algo que sus compañeros no saben sobre él o ella y qué le gusta hacer cuando no está estudiando o programando.
3. **11:30 – 11:45 · Reconociéndonos (`FormularioReconocimiento.jsx`)**:
   - Rotación digital de hojas por grupo: seguimiento de las hojas firmadas en tu grupo de 4 y envío de notas de **cualidad**, **fortaleza** o **agradecimiento**.
4. **11:45 – 11:55 · Compartiendo lo positivo (`BuzonNotas.jsx`)**:
   - Cada participante consulta su hoja personal (`Mi Hoja`) y puede **compartir voluntariamente** en el **Muro Grupal** algún mensaje que le haya gustado o sorprendido.
5. **11:55 – 12:00 · Cierre grupal (`CierreGrupal.jsx`)**:
   - Cada joven expresa en **una sola palabra** cómo se sintió durante la actividad, conformando el mural de cierre en tiempo real.

---

## 🚀 Ejecución Local

### 1. Backend (`/backend`)
```bash
cd backend
cp .env.example .env
# Opcional: Configura tu MONGODB_URI de MongoDB Atlas en .env
# (Si aún no configuras MONGODB_URI, el servidor usa almacenamiento en memoria automáticamente para pruebas locales)
npm install
npm run dev
```

### 2. Frontend (`/frontend`)
```bash
cd frontend
npm install
npm run dev
```
Abre `http://localhost:5173` en tu navegador.
