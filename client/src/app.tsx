import { ImgHTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import _ from "lodash";
import { io, Socket } from "socket.io-client";

interface Round {
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
const WORD_FORGIVE_LENGTH = 2;

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
      .map(
        (s) =>
          `"${s[0].string}", score: ${round(s[1])} dist: ${round(
            s[0].meanDist
          )}, lastSeen: ${s[0].lastSeen}`
        // [
        //   round(s[1]),
        //   s[0].string,
        //   round(s[0].meanDist),
        //   s[0].history.length,
        //   s[0].lastSeen,
        // ].join(" ")
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

const s = _.shuffle(_.range(6, 4109));
let x: State = { history: [], words: s.map((x) => x + "") };
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
  return (
    <div>
      {word}
      {word && <Image src={word} />}
    </div>
  );
}

function Decoder(props: TrainerProps) {
  const [state, setState] = useState<State>(x);

  const vocab = useMemo(
      () => getVocab(state.history, state.words),
      [Math.floor(state.history.length / SET_SIZE), state.words]
    ),
    nextWord = useMemo(
      () => sampleVocab(vocab, state.history.length),
      [vocab, state.history.length]
    );

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state.history.length]);

  const [encoding, setEncoding] = useState(true);

  useEffect(() => {
    if (nextWord) props.socket.emit("word", nextWord.string);
  }, [nextWord?.string]);

  return (
    <>
      {nextWord ? (
        encoding ? (
          <div>
            <p>decode</p>
            <LiveImage src="left" />
            <button autoFocus onClick={() => setEncoding(false)}>
              ready
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <LiveImage src="center" />
              <Image src={nextWord.string} />
            </div>
            <button
              autoFocus
              onClick={async () => {
                const round: Round = {
                  actual: nextWord.string,
                  distance: 1,
                  seq: state.history.length,
                };
                setState({ ...state, history: [...state.history, round] });
                setEncoding(true);
              }}
            >
              GOOD
            </button>
            &nbsp;
            <button
              onClick={async () => {
                const round: Round = {
                  actual: nextWord.string,
                  distance: 0.5,
                  seq: state.history.length,
                };
                setState({ ...state, history: [...state.history, round] });
                setEncoding(true);
              }}
            >
              OK
            </button>
            &nbsp;
            <button
              onClick={async () => {
                const round: Round = {
                  actual: nextWord.string,
                  distance: 0,
                  seq: state.history.length,
                };
                setState({ ...state, history: [...state.history, round] });
                setEncoding(true);
              }}
            >
              BAD
            </button>
          </div>
        )
      ) : null}
      <SaveLoad />
    </>
  );
}

function LiveImage(props: { src: string }) {
  return (
    <img
      style={{ flex: "0" }}
      width={200}
      src={`${API_URL}/live/${props.src}?x=${Math.random()}`}
    />
  );
}

function Image(props: { src: string }) {
  return (
    <img
      style={{ flex: "none" }}
      width={200}
      src={`${API_URL}/frame/${props.src}`}
    />
  );
}
