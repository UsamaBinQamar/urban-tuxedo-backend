Urban Tuxedo Backend
Quick Start Guide

1. Clone Repository
   bashCopygit clone [repository-url]
   cd urban-tuxedo-backend
2. Install Dependencies
   bashCopynpm install
3. Setup Environment
   Create .env file:
   envCopyPORT=3000
   MONGODB_URI=mongodb://localhost:27017/urban-tuxedo
   JWT_SECRET=your_jwt_secret
4. Run Application
   Development mode:
   bashCopynpm run dev
   Production mode:
   bashCopynpm start
5. Generate & Access Swagger Documentation
   Generate docs:
   bashCopynpm run swagger-gen
   Access Swagger UI:
   Copyhttp://localhost:3000/api-docs

That's it! The API documentation will be available at the Swagger URL once the server is running.
