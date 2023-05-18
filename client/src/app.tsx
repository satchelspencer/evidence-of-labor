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

type State = {
  history: History;
  words: string[];
};

const LS_KEY = "eol-state-new";

let x: State = { history: [], words };
try {
  x = JSON.parse(localStorage.getItem(LS_KEY)!) ?? x;
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
      {encoder === null ? (
        <div>
          <button onClick={() => setEncoder(true)}>ENCODE</button>
          <button onClick={() => setEncoder(false)}>DECODE</button>
        </div>
      ) : encoder ? (
        <Encoder {...props} />
      ) : (
        <Decoder {...props} />
      )}
    </div>
  );
}

function SaveLoad() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        padding: 10,
        display: "flex",
        flexDirection: "row",
        gap: 10,
      }}
    >
      <button
        onClick={() => {
          const inp = document.createElement("input");
          inp.type = "file";
          inp.hidden = true;
          inp.accept = ".json";
          inp.click();
          inp.onchange = () => {
            const o = new FileReader();
            o.onload = (e) => {
              localStorage.setItem(LS_KEY, e.target?.result + "");
              window.location.reload();
            };
            inp.files && o.readAsText(inp.files[0]);
          };
        }}
      >
        load
      </button>
      <button
        onClick={() => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(
            new Blob([localStorage.getItem(LS_KEY)!], { type: "text/json" })
          );
          a.download = `eol-${new Date().toISOString()}.json`;
          a.click();
        }}
      >
        save
      </button>
      <button
        onDoubleClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
      >
        clear
      </button>
    </div>
  );
}

function Encoder(props: TrainerProps) {
  const [word, setWord] = useState<string>();
  useEffect(() => {
    props.socket.on("word", (w) => setWord(w));
  }, []);
  return <div>{word}</div>;
}

function Decoder(props: TrainerProps) {
  const [state, setState] = useState<State>(x);

  console.log(state);

  const vocab = useMemo(
      () =>
        getVocab(
          state.history,
          state.words
          //_.range(100).map((r) => r + "")
        ),
      [Math.floor(state.history.length / SET_SIZE), state.words]
    ),
    nextWord = useMemo(
      () => sampleVocab(vocab, state.history.length),
      [vocab, state.history.length]
    );

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state.history.length]);

  const [encoding, setEncoding] = useState(true),
    [guess, setGuess] = useState<string>(),
    [loading, setLoading] = useState(false),
    [lastRound, setLastRound] = useState<Round>();

  useEffect(() => {
    if (nextWord) props.socket.emit("word", nextWord.string);
  }, [nextWord?.string]);

  return (
    <>
      {" "}
      {nextWord ? (
        encoding ? (
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
                    seq: state.history.length,
                  };
                  setLoading(false);
                  setGuess(undefined);
                  setEncoding(false);
                  setLastRound(round);
                  setState({ ...state, history: [...state.history, round] });
                }
              }}
            />
          </div>
        ) : lastRound ? (
          <div>
            <p>answer was "{lastRound.actual}"</p>
            <p>
              grade:{" "}
              {
                "fdcba"[
                  Math.floor(
                    norm(state.history, (r) => r.distance)(lastRound) * 4
                  )
                ]
              }
            </p>
            <button
              autoFocus
              onClick={async () => {
                setEncoding(true);
              }}
            >
              ok
            </button>
          </div>
        ) : null
      ) : null}
      <SaveLoad />
    </>
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
