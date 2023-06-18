var cv = require('./');

cv.namedWindow('78s8')

const mtest = new cv.Mat(1400,1400,16)

const mask = cv.imread('mask.jpg')

const vcount = 49
const captures = []
const capFrames = []
let rois = []
for(let i=0;i<vcount;i++){
  captures.push(new cv.VideoCapture(`vtest/${i}.mp4`))
  capFrames.push(new cv.Mat(200,200,16))
  rois.push(mtest.roi(Math.floor(i/7)*200,(i%7)*200,200,200))
}

// const res = cv.imread('template.jpg')
// res.copyTo(roi)
//let s = new Date().getTime()
while(1){
  // const n = new Date().getTime()
  // console.log(n-s)
  // s = n
  for(let i=0;i<vcount;i++){
    //captures[i].read(rois[i])
    captures[i].read(capFrames[i])
    cv.resize(capFrames[i], rois[i])
  }

  //cv.resize(capFrame, sroi)
  //small.copyTo(sroi)

  cv.imshow('78s8', mtest)
  if(cv.waitKey(1) >= 0) break;
}