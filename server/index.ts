import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express from "express";
import fs from "fs";
import { Server } from "socket.io";

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

const http = server.listen(3001, () => {
  console.log(`listening...`);
});

const io = new Server({
  serveClient: false,
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("word", (word) => {
    io.emit("word", word);
  });
});

io.listen(http);
