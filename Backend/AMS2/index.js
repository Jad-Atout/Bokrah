import express from "express";
import initApp from "./src/app.router.js";
import * as dotenv from "dotenv";
dotenv.config();


const app = express();
initApp(app,express)


app.listen( parseInt(process.env.PORT),() => {
    console.log(`🚀 Server running on port ${parseInt(process.env.PORT)}`);
})
export { app }