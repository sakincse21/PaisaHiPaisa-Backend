import dotenv from "dotenv";

dotenv.config();

interface IEnvConfig {
  PORT: string;
  MONGODB_URL: string;
  NODE_ENV: "development" | "production";
  BCRYPT_SALT: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  SUPER_ADMIN_PASSWORD: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PHONENO: string;
  SUPER_ADMIN_NIDNO: string;
  SUPER_ADMIN_NAME: string;
  FRONTEND_URL: string;
  BACKEND_URL: string;
  SSL:{
    STORE_ID: string;
    STORE_PASSWORD: string;
    STORE_STATUS: string;
    SUCCESS_URL: string;
    FAIL_URL: string;
    CANCEL_URL: string;
    REDIRECT_URL: string;
  },
  GMAIL:{
    EMAIL: string;
    APP_PASSWORD: string;
  }

}

const loadEnvVariables = (): IEnvConfig => {
  const requiredEnvVariables: string[] = ["PORT", "MONGODB_URL", "NODE_ENV",
    "BCRYPT_SALT", "JWT_SECRET", "JWT_EXPIRE", "SUPER_ADMIN_PASSWORD",
    "SUPER_ADMIN_EMAIL","SUPER_ADMIN_NAME","SUPER_ADMIN_PHONENO",
    "SUPER_ADMIN_NIDNO","FRONTEND_URL", "STORE_ID", "STORE_PASSWORD", "STORE_STATUS", "SUCCESS_URL", "CANCEL_URL", "FAIL_URL", "REDIRECT_URL",
    "EMAIL", "APP_PASSWORD", "BACKEND_URL"
  ];
  requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable ${key}`);
    }
  });
  return {
    PORT: process.env.PORT as string,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    MONGODB_URL: process.env.MONGODB_URL!,
    NODE_ENV: process.env.NODE_ENV as "development" | "production",
    BCRYPT_SALT: process.env.BCRYPT_SALT as string,
    JWT_SECRET: process.env.JWT_SECRET as string,
    JWT_EXPIRE: process.env.JWT_EXPIRE as string,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD as string,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL as string,
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME as string,
    SUPER_ADMIN_NIDNO: process.env.SUPER_ADMIN_NIDNO as string,
    SUPER_ADMIN_PHONENO: process.env.SUPER_ADMIN_PHONENO as string,
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    BACKEND_URL: process.env.BACKEND_URL as string,
    SSL:{
      STORE_ID: process.env.STORE_ID as string,
      STORE_PASSWORD: process.env.STORE_PASSWORD as string,
      STORE_STATUS: process.env.STORE_STATUS as string,
      SUCCESS_URL: process.env.SUCCESS_URL as string,
      FAIL_URL: process.env.FAIL_URL as string,
      CANCEL_URL: process.env.CANCEL_URL as string,
      REDIRECT_URL: process.env.REDIRECT_URL as string
    },
    GMAIL:{
      EMAIL: process.env.EMAIL as string,
      APP_PASSWORD: process.env.APP_PASSWORD as string,
    }
  };
};

export const envVars = loadEnvVariables();
