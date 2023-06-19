import * as dotenv from "dotenv";
import _ from "lodash";
dotenv.config({ path: ".env.local" });

import express from "express";
import fs from "fs";
import { Server } from "socket.io";

import { embed } from "./embed.js";
import grandiose from "grandiose-mac";
import sharp from "sharp";
import beep from "beepbeep";

// const mat = new video.Mat(500, 500, 16)
// console.log(mat.show());

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
    left: "28D9W",
    right: "28D32",
    center: "28CQN",
  };

async function getReceiver(cameraName: string) {
  let receiver = receivers[cameraName];

  if (!receiver) {
    for (let i = 0; i < 10; i++) {
      try {
        const sources = await grandiose.find({}, 1000),
          source = sources.find((s) => s.name.includes(cameraName))!;

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

async function run() {
  let i =
    _.max(
      fs.readdirSync(`./data/capture`).map((d) => {
        try {
          return parseInt(d.match(/(\d+)\.jpg/)?.[1] ?? "-1");
        } catch {
          return -1;
        }
      })
    ) + 1;
  while (true) {
    const img = await getImage(cameras.center);
    beep();
    fs.writeFileSync(`./data/capture/${i++}.jpg`, img);
    await new Promise((r) => setTimeout(r, 4000));
  }
}

//run();

server.get("/live/:which", async (req, res) => {
  res.contentType("jpg");
  res.end(await getImage(cameras[req.params.which]));
});

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
