import { useEffect, useMemo, useState } from "react";
import { words } from "./vocab";
import _ from "lodash";
import { io, Socket } from "socket.io-client";

const TSNE = require("tsne-js");

interface Round {
  guess: string;
  actual: string;
  distance: number;
  seq: number;
}

type History = Round[];

interface Word {
  string: string;
  meanDist: number;
  lastSeen: number;
  history: History;
}

type Vocab = {
  words: Word[];
};

const SET_SIZE = 5;
const WORD_FORGIVE_LENGTH = 4;

function getVocab(history: History, wordList: string[]): Vocab {
  const histories: { [word: string]: History } = {};

  for (const word of wordList) histories[word] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const round = history[i];
    histories[round.actual] = [...(histories[round.actual] ?? []), round];
    //histories[round.guess] = [...(histories[round.guess] ?? []), round];
  }

  const words: Word[] = [];
  for (const string in histories) {
    const wordHistory = histories[string],
      word: Word = {
        string,
        meanDist: 0.1,
        lastSeen: Infinity,
        history: _.take(wordHistory, WORD_FORGIVE_LENGTH),
      };
    let dsum = 0;
    for (const round of word.history) {
      word.lastSeen = Math.min(
        word.lastSeen || Infinity,
        history.length - round.seq
      );
      dsum += round.distance;
    }
    if (word.lastSeen === Infinity) word.lastSeen = SET_SIZE + 1;
    word.meanDist = dsum / (word.history.length && WORD_FORGIVE_LENGTH); /// word.history.length;
    words.push(word);
  }
  return { words };
}

function norm<T>(a: T[], p: (v: T) => number): (v: T) => number {
  const maxLen = _.maxBy(a, (v) => p(v)),
    minLen = _.minBy(a, (v) => p(v));
  return (v) => {
    if (!maxLen || !minLen) return NaN;
    else if (a.length === 1) return p(v);
    else return (p(v) - p(minLen)) / Math.max(p(maxLen) - p(minLen), 1e-10);
  };
}

function wavg(vaws: [number, number][]) {
  return _.sumBy(vaws, (v) => v[0] * v[1]) / _.sumBy(vaws, (v) => v[1]);
}

function round(n: number) {
  return Math.floor(n * 100) / 100;
}

function sampleVocab(vocab: Vocab, seq: number) {
  if (!vocab.words.length) return;

  const meanDistSorted = _.sortBy(vocab.words, (w) => -w.meanDist);
  let i = 0;
  for (; i < meanDistSorted.length; i++) {
    const word = meanDistSorted[i];
    if ((word.meanDist || 0) < 1) break;
  }
  const thresh = Math.floor(i / SET_SIZE) * SET_SIZE + SET_SIZE;

  // console.log(
  //   _.take(meanDistSorted, 100)
  //     .map((j) => [j.string, j.meanDist].join(' '))
  //     .join("\n")
  // );

  const normDist = norm(meanDistSorted, (v) => v.meanDist),
    normSeen = norm(meanDistSorted, (v) => v.lastSeen),
    scored = _.sortBy(
      meanDistSorted.map((word, idx) => {
        const score =
            1 -
            wavg([
              [normDist(word), 1],
              [1 - normSeen(word), 1],
            ]),
          res: [Word, number] = [
            word,
            idx <= thresh && _.isNaN(score) ? 1 : score,
          ];
        return res;
      }),
      (s) => -s[1]
    ),
    set = _.sortBy(_.take(scored, SET_SIZE), (s) => -s[0].lastSeen);

  console.log(
    _.takeWhile(scored, (s) => s[1])
      .map((s) =>
        [
          round(s[1]),
          s[0].string,
          round(s[0].meanDist),
          s[0].history.length,
          s[0].lastSeen,
        ].join(" ")
      )
      .join("\n")
  );

  return set[seq % SET_SIZE][0];
}

let x: History = [];
try {
  x = JSON.parse(localStorage.getItem("ahh")!) ?? [];
} catch {}

const API_URL = `http://${window.location.hostname}:3001`;

export default function App() {
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    const s = io(API_URL);
    s.on("connect", () => {
      setSocket(s);
    });
  }, []);

  return socket ? <Tpicker socket={socket} /> : <div>connecting...</div>;
}

interface TrainerProps {
  socket: Socket;
}

function Tpicker(props: TrainerProps) {
  const [encoder, setEncoder] = useState<boolean | null>(null);

  return encoder === null ? (
    <div>
      <button onClick={() => setEncoder(true)}>ENCODE</button>
      <button onClick={() => setEncoder(false)}>DECODE</button>
    </div>
  ) : encoder ? (
    <Encoder {...props} />
  ) : (
    <Decoder {...props} />
  );
}

function Encoder(props: TrainerProps) {
  const [word, setWord] = useState<string>();
  useEffect(() => {
    props.socket.on("word", (w) => setWord(w));
  }, []);
  return <div>encode {word}</div>;
}

function Decoder(props: TrainerProps) {
  const [history, setHistory] = useState<History>(x),
    vocab = useMemo(
      () =>
        getVocab(
          history,
          words
          //_.range(100).map((r) => r + "")
        ),
      [Math.floor(history.length / SET_SIZE)]
    ),
    nextWord = useMemo(
      () => sampleVocab(vocab, history.length),
      [vocab, history.length]
    );

  useEffect(() => {
    localStorage.setItem("ahh", JSON.stringify(history));
    console.log(history.length);
  }, [history.length]);

  const [encoding, setEncoding] = useState(0),
    [guess, setGuess] = useState<string>(),
    [loading, setLoading] = useState(false),
    [lastRound, setLastRound] = useState<Round>();

  useEffect(() => {
    if (nextWord) props.socket.emit("word", nextWord.string);
  }, [nextWord?.string]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {nextWord ? (
        encoding === 0 ? (
          <div>
            <p>wait for encoder</p>
            <button autoFocus onClick={() => setEncoding(1)}>
              ok
            </button>
          </div>
        ) : encoding === 1 ? (
          <div>
            <p>decode</p>
            <input
              autoFocus
              disabled={loading}
              value={guess ?? ""}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  setLoading(true);
                  const dist = compare(
                    await getEmbedding(nextWord.string),
                    await getEmbedding(guess ?? "")
                  );
                  const round: Round = {
                    actual: nextWord.string,
                    guess: guess ?? "",
                    distance: dist,
                    seq: history.length,
                  };
                  setLoading(false);
                  setGuess(undefined);
                  setEncoding(2);
                  setLastRound(round);
                  setHistory([...history, round]);
                }
              }}
            />
          </div>
        ) : (
          lastRound && (
            <div>
              <p>answer was "{lastRound.actual}"</p>
              <p>
                grade:{" "}
                {
                  "fdcba"[
                    Math.floor(norm(history, (r) => r.distance)(lastRound) * 4)
                  ]
                }
              </p>
              <button
                autoFocus
                onClick={async () => {
                  setEncoding(0);
                }}
              >
                ok
              </button>
            </div>
          )
        )
      ) : null}
    </div>
  );
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await (
    await fetch(`${API_URL}/embed/${encodeURIComponent(text)}`)
  ).json();
  return res;
}

export function compare(a: number[], b: number[]) {
  const len = Math.min(a.length, b.length);
  let dab = 0,
    da = 0,
    db = 0,
    dim = 0;
  while (dim < len) {
    const ca = a[dim];
    const cb = b[dim];
    dab += ca * cb;
    da += ca * ca;
    db += cb * cb;
    dim += 1;
  }

  const mag = Math.sqrt(da * db);
  return mag === 0 ? 0 : dab / mag;
}
