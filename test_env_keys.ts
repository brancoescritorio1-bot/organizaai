import dotenv from "dotenv";
dotenv.config();

console.log("Environment variables:", Object.keys(process.env).filter(k => k.toLowerCase().includes("db") || k.toLowerCase().includes("postgres") || k.toLowerCase().includes("url") || k.toLowerCase().includes("conn") || k.toLowerCase().includes("key") || k.toLowerCase().includes("secret")));
