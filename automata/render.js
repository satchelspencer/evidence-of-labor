const cv = require('bindings')('opencv')
const grid = require('./grid')
const _ = require('lodash')

const bufferCache = {}

module.exports = function createRenderer(rseq, config, varCounts = {}) {
  const {
      cellSize,
      outRatio,
      inputSize,
      fadeRatio,
      mask,
      liveMask,
      blackMask,
      maskSize,
      maskVx,
      maskVy,
      maskVsize,
    } = config,
    usages = {},
    seq = rseq.map(step => [
      step[0].map(row =>
        row.map(cell => {
          const str = grid.cell2string(cell)
          usages[str] = usages[str] === undefined ? -1 : usages[str]
          usages[str] = (usages[str] + 1) % (varCounts[str] || 0)
          return str + (usages[str] ? '-' + usages[str] : '')
        })
      ),
      step[1],
    ]),
    x = seq[0][0][0].length,
    y = seq[0][0].length,
    s = cellSize * (maskVsize / maskSize),
    maskScale = cellSize / maskSize,
    width = x * cellSize * outRatio,
    height = y * cellSize,
    canvas = new cv.Mat(width, height, 16),
    oleft = outRatio === 1 ? 0 : (width - height) / 2

    console.log(x, y)
  
  const frameBorder = new cv.Mat(cellSize, cellSize, 16)
  cv.resize(mask, frameBorder)

  const liveFrameBorder = new cv.Mat(cellSize, cellSize, 16)
  cv.resize(liveMask || mask, liveFrameBorder)

  const blackFrame = new cv.Mat(cellSize, cellSize, 16)
  cv.resize(blackMask || mask, blackFrame) //cv.resize(blackMask || mask, blackFrame);

  const rois = _.range(y).map(j =>
    _.range(x).map(i => {
      const frameRoi = new cv.Mat()
      cv.roi(canvas, frameRoi, oleft + i * cellSize, j * cellSize, cellSize, cellSize)
      cv.copy(frameBorder, frameRoi)

      const bgRoi = new cv.Mat()
      cv.roi(
        canvas,
        bgRoi,
        oleft + Math.floor(i * cellSize + maskVx * maskScale),
        Math.floor(j * cellSize + maskVy * maskScale),
        s,
        s
      )
      return {
        bg: bgRoi,
        frame: frameRoi,
        fg: new cv.Mat(s, s, 16),
        mask: new cv.Mat(s, s, 16),
        overlapMask: new cv.Mat(s, s, 16),
        invOverlapMask: new cv.Mat(s, s, 16),
        prevMasked: new cv.Mat(s, s, 16),
        nextMasked: new cv.Mat(s, s, 16),
      }
    })
  )

  function getMask(firstFrame, thisFrame, dest) {
    cv.absdiff(thisFrame, firstFrame, dest)
    cv.cvtColor(dest, 6)
    cv.cvtColor(dest, 8)
    cv.blur(dest, dest, cellSize / 10)
    cv.threshold(dest, dest, 5, 255)
    cv.blur(dest, dest, cellSize / 8)
  }

  function applyMask(src, mask, dest) {
    cv.multiply(src, mask, dest, 1 / 255)
  }

  function initCapture(cap) {
    //console.log('UUU', cap)

    const capture = new cv.VideoCapture(cap),
      capFrame = new cv.Mat(inputSize[0], inputSize[1], 16),
      oleft = (inputSize[0] - inputSize[1]) / 2
    const video = {
      capture,
      capFrame,
      firstFrame: new cv.Mat(s, s, 16),
    }

    video.capture.read(video.capFrame)
    video.croppedFrame = new cv.Mat()
    cv.roi(video.capFrame, video.croppedFrame, oleft, 0, inputSize[1], inputSize[1])
    cv.resize(video.croppedFrame, video.firstFrame)
    return video
  }

  function frameBuffer(length, cacheIndex) {
    if (cacheIndex && bufferCache[cacheIndex]) return bufferCache[cacheIndex]
    else {
      const buffer = _.range(length).map(() => {
        const o = {
          frame: new cv.Mat(s, s, 16),
          mask: new cv.Mat(s, s, 16),
        }
        return o
      })
      if (cacheIndex) bufferCache[cacheIndex] = buffer
      return buffer
    }
  }

  function capture(video, dest, bg) {
    video.capture.read(video.capFrame)
    cv.resize(video.croppedFrame, dest.frame)
    if (bg) getMask(bg, dest.frame, dest.mask)
  }

  function drawRoi(roi, Tfrac, nextFrame, prevFrame, isLive, black = 0, text) {
    cv.copy(isLive ? liveFrameBorder : frameBorder, roi.frame)
    if (Tfrac !== -1) {
      const ITfrac = 1 - Tfrac,
        { bg, fg, mask, overlapMask, invOverlapMask, prevMasked, nextMasked } = roi

      /* compute mask of both areas from prev and next */
      cv.add(nextFrame.mask, prevFrame.mask, mask)
      cv.invert(mask, mask)

      /* base layer is next frame */
      cv.copy(nextFrame.frame, bg)

      /* get composite of bg and fg */
      applyMask(bg, mask, bg)
      applyMask(nextFrame.frame, nextFrame.mask, nextMasked)
      applyMask(prevFrame.frame, prevFrame.mask, prevMasked)
      cv.add(nextMasked, prevMasked, fg)
      cv.add(fg, bg, bg)

      /* find overlapping areas */
      cv.addWeighted(nextFrame.mask, 0.5, prevFrame.mask, 0.5, -128, overlapMask)
      cv.threshold(overlapMask, overlapMask, 1, 255)
      cv.blur(overlapMask, overlapMask, cellSize / 8)
      cv.mulConstant(overlapMask, 2, overlapMask)
      cv.invert(overlapMask, invOverlapMask)

      /* compute cossfade of prev and next and mask it to overlapped areas */
      cv.addWeighted(nextFrame.frame, Tfrac, prevFrame.frame, ITfrac, 0, fg)
      applyMask(fg, overlapMask, fg)

      /* remove overlapped areas from bg and replace them with crossfaded */
      applyMask(bg, invOverlapMask, bg)
      cv.add(fg, bg, bg)

      /* blend in smoothly with prev frame and next frame */
      if (Tfrac < fadeRatio) {
        const Ffrac = Tfrac / fadeRatio
        cv.addWeighted(bg, Ffrac, prevFrame.frame, 1 - Ffrac, 0, bg)
      } else if (Tfrac > 1 - fadeRatio) {
        const Ffrac = Math.max(ITfrac / fadeRatio, 0)
        cv.addWeighted(bg, Ffrac, nextFrame.frame, 1 - Ffrac, 0, bg)
      }
    } else cv.copy(nextFrame.frame, roi.bg)
    if(text !== undefined) cv.putText(roi.bg, text+'', s*0.01, s/15 + s*0.025, s/15)
    if (black !== 0) cv.addWeighted(roi.frame, 1 - black, blackFrame, black, 1, roi.frame)
  }

  return {
    seq,
    rois,
    initCapture,
    frameBuffer,
    capture,
    drawRoi,
    canvas,
    width,
    height,
  }
}
