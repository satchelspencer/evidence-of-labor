const cv = require("./");
const grid = require("./grid");
const fs = require("fs");
const display = require("./display");
const _ = require("lodash");
const async = require("async");

// let mask = cv.imread("media/mask.jpg"),
//   dest = new cv.Mat(640, 480, 16),
//   destI = new cv.Mat(720/4, 1280/4, 16);
//   cv.resize(mask, destI)

//   var l = 100
//   dests = _.range(l).map(i =>  {
//     let a = new cv.Mat(720/4, 1280/4, 16)
//     destI.copyTo(a)
//     return a
//   })
//   console.log('dosne')
//   const cap = new cv.VideoCapture(0)
//   for(let i=0;i<l;i++){
//     cap.read(dest)
//     cv.resize(dest, dests[i])
//     cv.invert(dests[i], dests[i])
//     cv.cvtColor(dests[i], 6);
//     cv.cvtColor(dests[i], 8);
//   }

//   for(let i=0;i<l;i++){
//     cv.imshow("6", dests[i]);
//     cv.waitKey(30);
//   }

const rootDir = "../FINALS_200";
const files = fs.readdirSync(rootDir);

const caps = _.range(100).map(
    i => new cv.VideoCapture(`../FINALS_200/${files[i + 10]}`)
  ),
  dests = _.range(100).map(i => _.range(300).map(f => new cv.Mat(584, 584, 16)));

const canvas = new cv.Mat(2000, 2000, 16),
  rois = [];

for (var y = 0; y < 10; y++) {
  for (var x = 0; x < 10; x++) {
    rois.push(canvas.roi(200 * x, 200 * y, 200, 200));
  }
}

for (let f = 0; f < 300; f++) {
  let t = new Date().getTime();
  caps.forEach((cap, i) => cap.read(dests[i][f]));
  console.log(f, (new Date().getTime() - t));
}

for (let f = 0; f < 300; f++) {
  let t = new Date().getTime();
  caps.forEach((cap, i) => {
    cv.resize(dests[i][f], rois[i]);
    //_.times(100, () => cv.invert(rois[i], rois[i]))
    
   
  });
  console.log((new Date().getTime() - t));
  cv.imshow("6", canvas);
  cv.waitKey(1);
}

// for (let s = 0; s < 10; s++) {
//   let t = new Date().getTime(),
//   count = 50
//   for (let i = 0; i < count; i++) {
//     caps.forEach((cap, ci) => {
//       cap.read(dests[ci])
//     })
//     // cv.resize(destI, dest)
//     // cv.imshow("6", dest);
//     // cv.waitKey(1);
//   }
//   let d = new Date().getTime() - t;
//   console.log(d/count)

// }
