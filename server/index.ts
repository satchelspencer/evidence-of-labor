import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import express from "express";
import fs from "fs";
import { Server } from "socket.io";

import { embed } from "./embed.js";
import grandiose from "grandiose-mac";
import sharp from "sharp";

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

server.get("/sources", async (req, res) => {
  try {
    const sources = await grandiose.find({ showLocalSources: true });
    res.json(sources);
  } catch {
    res.end("fail");
  }
});

const receivers: { [name: string]: grandiose.Receiver } = {},
  cameras = {
    left: "MEVO-28D9W (Mevo-28D9W)",
  };

async function getReceiver(cameraName: string) {
  let receiver = receivers[cameraName];

  if (!receiver) {
    for (let i = 0; i < 10; i++) {
      try {
        const sources = await grandiose.find({}, 1000),
          source = sources.find((s) => s.name === cameraName)!;

        receiver = await grandiose.receive({
          source,
          colorFormat: grandiose.COLOR_FORMAT_RGBX_RGBA,
          allowVideoFields: false,
        });
        break;
      } catch {}
    }

    receivers[cameraName] = receiver!;
  }

  return receiver!;
}

async function getImage(cameraName: string) {
  const receiver = await getReceiver(cameraName);

  let buff: Buffer;

  for (let i = 0; i < 10; i++) {
    try {
      const image = await receiver.video(10000);
      buff = await sharp(image.data, {
        raw: {
          width: image.xres,
          height: image.yres,
          channels: 4,
        },
      })
        .resize({ height: 500 })
        .extract({
          top: 0,
          left: Math.floor((500 * (16 / 9) - 500) / 2),
          width: 500,
          height: 500,
        })
        .toFormat("jpg")
        .toBuffer();
      break;
    } catch {}
  }

  return buff!;
}

server.get("/live", async (req, res) => {
  res.contentType("jpg");
  res.end(await getImage(cameras.left));
});

server.get("/embed/:strng", (req, res) => {
  embed(req.params.strng).then((r) => {
    res.json(r);
  });
});

server.get("/frame/:strng", (req, res) => {
  res.sendFile(process.cwd() + "/data/frames/" + req.params.strng + ".jpg");
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
