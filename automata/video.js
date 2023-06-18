const cv = require('bindings')('opencv');
const fs = require("fs");
const _ = require("lodash");
const createRenderer = require("./render");

const rootDir = "/Volumes/POST_VERBAL/FINALS_892",//"../FINALS_200",//"/Volumes/POST_VERBAL/FINALS_892"//
  varCounts = _.mapValues(
    _.groupBy(fs.readdirSync(rootDir), p =>
      p
        .split("-")
        .slice(0, 2)
        .join("-")
        .replace(".mp4", "")
    ),
    g => g.length
  ),
  rseq = JSON.parse(fs.readFileSync("media/rseq169long.json")).slice(1),
  framerate = 25,
  period = Math.floor(20.57 * framerate),
  transLen = 4 * framerate,

config = {
  cellSize: 100,
  outRatio: 1,
  inputSize: [892, 892],
  fadeRatio: 0.1,
  mask: new cv.Mat(),
  liveMask: new cv.Mat(),
  maskSize: 1209,
  maskVx: 62,
  maskVy: 71,
  maskVsize: 895,
  vout: "out.mpeg"
};

cv.imread("media/mask.jpg", config.mask)
cv.imread("media/mask-active.jpg", config.liveMask)

const {
  seq,
  rois,
  initCapture,
  frameBuffer,
  capture,
  drawRoi,
  canvas,
  width,
  height
} = createRenderer(rseq, config, varCounts);
const writer = new cv.VideoWriter("media/out43.mpeg", width, height);
let prevVideos = {},
  nextVideos = {};

const usageIndex = {}

let ft = new Date().getTime();
function render(frame) {
  let t = new Date().getTime();
  //console.log(t - ft);
  ft = t;

  const frameCurrent = frame % period,
    stepIndex = Math.floor(frame / period),
    nextStep = seq[stepIndex][0],
    prevStep = seq[stepIndex - 1] && seq[stepIndex - 1][0],
    thisUsed = _.keys(seq[stepIndex][1]),
    lastUsed = prevStep ? _.keys(seq[stepIndex - 1][1]) : [],
    liveCell = _.difference(thisUsed, lastUsed)[0],
    Tfrac = prevStep && frameCurrent < transLen ? frameCurrent / transLen : -1;

  if (frameCurrent === 0) {
    console.log(stepIndex)
    if(usageIndex[liveCell] === undefined) usageIndex[liveCell] = stepIndex
    _.values(prevVideos).forEach(video => video.video.capture.release());
    prevVideos = nextVideos;

    nextVideos = {};
    nextStep.forEach(row =>
      row.forEach(cell => {
        if (!nextVideos[cell])
          nextVideos[cell] = {
            video: initCapture(`${rootDir}/${cell}.mp4`),
            buffer: frameBuffer(1)
          };
      })
    );
  }

  _.values(nextVideos).forEach(video =>
    capture(
      video.video,
      video.buffer[0],
      prevStep && frameCurrent < transLen && video.video.firstFrame
    )
  );
  if (prevStep && frameCurrent < transLen)
    _.values(prevVideos).forEach(video =>
      capture(video.video, video.buffer[0], video.video.firstFrame)
    );

  /* draw */
  nextStep.forEach((row, j) =>
    row.forEach((cell, i) => {
      const prevCell = prevStep && prevStep[j][i],
        nextFrame = nextVideos[cell].buffer[0],
        prevFrame = prevStep && prevVideos[prevCell].buffer[0],
        roi = rois[j][i],
        uindex = usageIndex[cell.substr(0,9)],
        ustring = cell.substr(0,9) + ' '+(uindex===undefined?'':uindex)
      // drawRoi(roi, Tfrac, nextFrame, prevFrame, cell.substr(0,9) === liveCell, 0, ustring);
      drawRoi(roi, Tfrac, nextFrame, prevFrame);
      //if(cell === liveCell)cv.invert(roi.bg, roi.bg);
    })
  );


  writer.write(canvas);
  // cv.imshow("lautmat", canvas);
  // cv.waitKey(1);

  let nt = new Date().getTime(),
    diff = nt - t;

  setTimeout(() => render(frame + 1), 0);
}
render(0);
