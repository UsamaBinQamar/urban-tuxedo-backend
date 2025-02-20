const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "Urban Tuxedo API",
    description: "API documentation for Urban Tuxedo Backend",
  },
  host: "localhost:3000",
  schemes: ["http"],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./index.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);
