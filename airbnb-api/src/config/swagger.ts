import swaggerJSDoc from "swagger-jsdoc";
import {env} from "../config/env"; // wherever your env config is

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "1.0.0",
      description: "Production-grade Airbnb clone REST API",
      contact: {
        name: "API Support",
        email: "support@airbnb-api.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: "Development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // VERY IMPORTANT — must point to where your route files are
  apis: ["src/modules/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);