import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express from "express";
import fs from "fs";

import { embed } from "./embed.js";

if (!fs.existsSync("data")) fs.mkdirSync("data");

const server = express();

server.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

server.get("/", (req, res) => {
  res.send(".");
});

server.get("/embed/:strng", (req, res) => {
  embed(req.params.strng).then((r) => {
    res.json(r);
  });
});

server.listen(3001, () => {
  console.log(`listening...`);
});

type P<T> = { [s: string]: T };
