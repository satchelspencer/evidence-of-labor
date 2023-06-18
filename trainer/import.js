import { readdirSync, copyFileSync } from "fs";
import _ from "lodash";
import { join } from "path";

const base = "/Volumes/POST_VERBAL/frames/frames-512";

function pad(x) {
  return (
    _.range(5 - x.length)
      .map((a) => "0")
      .join("") + x
  );
}

let i = 0;
for (const dir of readdirSync(base)) {
  const frames = _.sampleSize(_.range(400, 500), 3);
  for (const frame of frames) {
    try {
      copyFileSync(
        join(base, dir, pad(frame + "") + ".jpg"),
        "./data/frames/" + i++ + ".jpg"
      );
    } catch {}
  }
  console.log(frames);
}
