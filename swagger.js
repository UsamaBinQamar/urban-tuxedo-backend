const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    version: "1.0.0",
    title: "Urban Tuxedo API",
    description: "API documentation for Urban Tuxedo Backend",
  },
  host:
    process.env.NODE_ENV === "production"
      ? "urban-tuxedo-backend.vercel.app"
      : "localhost:3000",
  basePath: "/",
  schemes: ["https", "http"],
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    {
      name: "Auth",
      description: "Authentication endpoints",
    },
  ],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Bearer token authorization",
    },
  },
  definitions: {
    User: {
      username: "johndoe",
      email: "john@example.com",
      password: "password123",
      role: "user",
    },
  },
};

const outputFile = "./swagger-output.json";
const routes = ["./api/index.js", "./routes/*.js"];

swaggerAutogen(outputFile, routes, doc)
  .then(() => {
    console.log("Swagger documentation generated");
  })
  .catch((err) => {
    console.error("Error generating swagger documentation:", err);
  });
