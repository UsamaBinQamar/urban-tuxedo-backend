# Urban Tuxedo Backend - Quick Setup 🚀

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/urban-tuxedo-backend.git
cd urban-tuxedo-backend
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure MongoDB

1. Login to [MongoDB Atlas](https://cloud.mongodb.com)
2. Get your connection string from database
3. Create `.env` file and add:

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
JWT_SECRET=your_secret_key
```

## 4. Start Server

```bash
# Development mode (auto-reload)
npm run dev

# OR Production mode
npm start
```

## 5. View API Documentation

Generate & view Swagger docs:

```bash
# Generate docs first
npm run swagger-gen

# Access API docs at:
http://localhost:3000/api-docs
```

---
