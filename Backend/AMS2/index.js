import express from "express";
import initApp from "./src/app.router.js";
import * as dotenv from "dotenv";
dotenv.config();


const app = express();
initApp(app,express)


app.listen(process.env.PORT||10000, () => {
    console.log("Server running on port: " + process.env.PORT);
})
export { app }