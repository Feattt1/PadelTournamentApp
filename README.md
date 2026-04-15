# 🎾 Padel Championship Manager

Gestor de campeonatos de pádel para clubes. Inscripciones, fase de grupos, eliminatorias, resultados y clasificaciones.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** MySQL (Prisma ORM)

## Desarrollo

```bash
npm install
cp server/.env.example server/.env   # Configurar DATABASE_URL y JWT_SECRET
cd server
npx prisma generate
npx prisma db push                  # Crear tablas en MySQL (requiere MySQL en ejecución)
npx prisma db seed                  # Crear clubes: La9Padel, DelPlataPadel, ElRanchoPadel
cd ..
npm run dev                         # Inicia cliente (puerto 5173) y servidor (puerto 3001)
```

### Primer usuario admin

1. Regístrate en `/register`
2. Actualiza el rol en MySQL: `UPDATE Usuario SET rol = 'ADMIN' WHERE email = 'tu@email.com';`
3. O crea un script de seed para el primer admin

### Perfil de jugador y parejas

Para inscribir parejas en campeonatos, necesitas:
1. Crear perfil de jugador: POST `/api/jugadores` con `{ categoria: 1-7, nivel: "opcional" }`
2. Crear pareja: POST `/api/parejas` con `{ jugador1Id, jugador2Id }` (ambos deben tener perfil de jugador)

## Producción

- Frontend: Vercel
- Backend: Vercel Serverless o Railway
- Base de datos: PlanetScale / Railway / MySQL
# Padel-App-by-Feat
