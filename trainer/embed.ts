import fetch from "node-fetch";
import * as fs from "fs";
import _ from "lodash";

const cache: { [inp: string]: number[] } = {};

const CACHE_PATH = "./data/cache.json";

try {
  Object.assign(cache, JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")));
} catch {}

const saveCache = _.throttle(() => {
  fs.writeFile(CACHE_PATH, JSON.stringify(cache), () => {});
}, 1000);

export async function embed(text: string): Promise<number[]> {
  const cached = cache[text];
  if (cached) return cached;
  const res = (await (
      await fetch("https://api.openai.com/v1/embeddings", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          authorization: "Bearer " + process.env.OPENAI_KEY,
        },
        body: JSON.stringify({ input: text, model: "text-embedding-ada-002" }),
      })
    ).json()) as any,
    vect = res["data"][0]["embedding"];
  await new Promise((e) => setTimeout(e, 500));
  cache[text] = vect;
  saveCache();
  return vect;
}
