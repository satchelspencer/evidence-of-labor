/*
Use = 0 | 1 | 2 | 3
Io = [Use, Use, Use, Use] //top, left, bottom, right
Cell = [Io, Io] //Input, Output
Grid = Cell[][]
*/
const _ = require('lodash')
const display = require('./display')
const SimplexNoise = require('simplex-noise')
const Alea = require('alea')
const fs = require('fs')

let prng = new Alea(8.2)
const simplex = new SimplexNoise(prng)

function shuffle(arr) {
  for (let i = 0; i < arr.length * 2; i++) {
    const a = Math.floor(prng() * arr.length),
      b = Math.floor(prng() * arr.length)
    const t = arr[a]
    arr[a] = arr[b]
    arr[b] = t
  }
  return arr
}

var possibleIos = [
  '1002',
  '1020',
  '1200',
  '2001',
  '2010',
  '2100',
  '0120',
  '0102',
  '0210',
  '0012',
  '0201',
  '0021',
  '3000',
  '0300',
  '0030',
  '0003',
  '2000',
  '0200',
  '0020',
  '0002',
  '0100',
  '0010',
  '0001',
  '1000',
  '0000',
].reverse()

function string2io(str) {
  return str.split('').map(s => parseInt(s, 10))
}

function io2string(io) {
  return io.join('')
}

function string2cell(str) {
  return str.split('-').map(string2io)
}

function cell2string(cell) {
  return cell.map(io2string).join('-')
}

function emptyGrid(x, y) {
  return _.range(y).map(i => _.range(x).map(j => [[0, 0, 0, 0], [0, 0, 0, 0]]))
}

function conflicts(a, b) {
  if (!a || !b) return false
  else if (a === 1) return b === 1 || b === 3
  else if (a === 2) return b === 2 || b === 3
  else if (a === 3) return b !== 0
}

const directions = [[0, -1], [-1, 0], [0, 1], [1, 0]],
  directionNames = ['top', 'right', 'bottom', 'left'], //["top", "left", "bottom", "right"],
  personNames = ['rick', 'la']

function clone(grid) {
  return JSON.parse(JSON.stringify(grid))
}

function makeValidOutput(grid) {
  const height = grid.length,
    width = grid[0].length

  const next = emptyGrid(width, height)

  shuffle(_.range(height)).forEach(y => {
    shuffle(_.range(width)).forEach(x => {
      const currentCell = grid[y][x]
      //console.log(x, y, cell2string(currentCell));
      directions.forEach(([dx, dy], direction) => {
        const nx = (x + dx + width) % width,
          ny = (y + dy + height) % height,
          neighbor = grid[ny][nx],
          nextNeighbor = next[ny][nx],
          invDirection = (direction + 2) % 4,
          output = currentCell[1][direction],
          dirname = directionNames[direction]

        const tubeIsUsed = output && neighbor[1][invDirection],
          wouldOverflowNext =
            output && _.some(nextNeighbor[0], input => conflicts(input, output))

        if (tubeIsUsed || wouldOverflowNext) {
          // if(tubeIsUsed) console.log('    tube is used', dirname)
          // if(wouldOverflowNext) console.log('    would overflow', direction)
          currentCell[1][direction] = 0
        } else {
          nextNeighbor[0][invDirection] = output //mark it in next as being used
        }
      })
    })
  })
}

function getNoiseDir(x, y, z) {
  const n = (simplex.noise3D(x, y, z) + 1) / 2
  return Math.floor(n * 4)
}

function noiseGrid(x, y, z) {
  const scale = 1 / 2
  const grid = _.range(y).map(i =>
    _.range(x).map(j => {
      const nx = j * scale,
        ny = i * scale
      const a = getNoiseDir(nx, ny, z + 0.2),
        b = getNoiseDir(nx, ny, z + 0.8)
      const out = [0, 0, 0, 0]
      if (Math.random() > 0.4) out[a] += 1
      if (Math.random() > 0.4) out[b] += 2
      return [[0, 0, 0, 0], out]
    })
  )
  //makeValidOutput(grid)
  return grid
}

function getSize(grid) {
  return [grid[0].length, grid.length]
}

function applyOutputs(prevGrid, grid, allowCreation) {
  const [width, height] = getSize(prevGrid)
  /* take outputs and feed them into adjacent cells */
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const prevCell = prevGrid[y][x]
      directions.forEach(([dx, dy], direction) => {
        const nx = (x + dx + width) % width,
          ny = (y + dy + height) % height,
          neighbor = grid[ny][nx],
          invDirection = (direction + 2) % 4

        neighbor[0][invDirection] = prevCell[1][direction]
      })
    }
  }
  /* make sire that empty inputs have no output (no 0000-xxxx) */
  if (!allowCreation) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ocell = grid[y][x]
        if (io2string(ocell[0]) === '0000') ocell[1] = [0, 0, 0, 0]
      }
    }
  }
}

function getNextInSeq(prev, z, allowCreation) {
  const [prevGrid, prevUsed] = prev,
    [width, height] = getSize(prevGrid)

  const grid = noiseGrid(width, height, z)
  applyOutputs(prevGrid, grid, allowCreation)
  makeValidOutput(grid)

  const nextUsed = { ...prevUsed }
  grid.forEach(row =>
    row.forEach(cell => {
      const str = cell2string(cell)
      if (str == '0000-0000') return
      if (!prevUsed[str]) nextUsed[str] = 1
      else nextUsed[str]++
    })
  )
  return [grid, nextUsed]
}

function getUnknowns(prev, next) {
  return _.difference(
    _.keys(_.pickBy(next[1], n => n)),
    _.keys(_.pickBy(prev[1], n => n))
  )
}

function updateUsed(prev, next) {
  const [prevGrid] = prev,
    [nextGrid, nextUsed] = next

  nextGrid.forEach((row, y) =>
    row.forEach((cell, x) => {
      const newStr = cell2string(cell),
        oldStr = cell2string(prevGrid[y][x])
      if (newStr !== oldStr) {
        nextUsed[oldStr]--
        if (!nextUsed[oldStr]) delete nextUsed[oldStr]
        nextUsed[newStr] = nextUsed[newStr] || 0
        nextUsed[newStr]++
      }
    })
  )
}

function prevent(parent, victim, toPrevent) {
  const newParent = clone(parent),
    [parentGrid] = parent,
    [newParentGrid] = newParent,
    [victimGrid] = victim,
    [width, height] = getSize(parentGrid)

  victimGrid.forEach((row, y) =>
    row.forEach((cell, x) => {
      const str = cell2string(cell)
      if (toPrevent.includes(str)) {
        directions.forEach(([dx, dy], direction) => {
          const nx = (x + dx + width) % width,
            ny = (y + dy + height) % height,
            invDirection = (direction + 2) % 4
          newParentGrid[ny][nx][1][invDirection] = 0
        })
      }
    })
  )
  //dont have to make valid, since removal only is always valid
  updateUsed(parent, newParent)
  return newParent
}

function insertNew(step) {
  const [grid] = step,
    [width, height] = getSize(grid),
    newStep = clone(step),
    [newGrid, newUsed] = newStep

  const tx = Math.floor(prng() * width),
    ty = Math.floor(prng() * height),
    output = string2io(possibleIos[Math.floor(prng() * possibleIos.length)])

  const nextCell = newGrid[ty][tx]

  if (cell2string(nextCell) === '0000-0000') {
    nextCell[1] = output
    makeValidOutput(newGrid)
    updateUsed(step, newStep)
  }
  return newStep
}

function addAlreadyKnown(step) {
  const [grid, used] = step,
    entrances = _.keys(used).filter(
      v => v.split('-')[0] === '0000' && v.split('-')[1] !== '0000'
    )

  if (entrances.length < 3) return step
  else {
    const [width, height] = getSize(grid),
      newStep = clone(step),
      [newGrid, newUsed] = newStep

    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        const str = cell2string(cell)
        if (str === '0000-0000' && prng() < 0.05) {
          console.log('addin', y, x)
          const newValue = entrances[Math.floor(prng() * entrances.length)]
          newGrid[y][x] = string2cell(newValue)
        }
      })
    )

    makeValidOutput(newGrid)
    updateUsed(step, newStep)

    return newStep
  }
}

function makeGridSeq(start, n, ec, z = 0) {
  let seq = [start]
  while (seq.length < n) {
    const targetUnknowns = n - seq.length < ec ? 0 : 1

    let prev = seq[seq.length - 1],
      next = getNextInSeq(prev, n + z),
      unknowns = getUnknowns(prev, next)

    let tries = 0
    while (unknowns.length !== targetUnknowns && tries++ < 10000) {
      next = getNextInSeq(prev, n + z + tries)
      unknowns = getUnknowns(prev, next)
    }

    //console.log(seq.length, unknowns);
    if (unknowns.length > targetUnknowns) {
      let victim = next
      while (unknowns.length > targetUnknowns) {
        const parent = seq.pop(),
          prev = seq[seq.length - 1],
          toPrevent = unknowns.slice(targetUnknowns)

        //console.log("preventing", toPrevent);
        next = prevent(parent, victim, toPrevent)
        unknowns = getUnknowns(prev, next)
        victim = next
        //console.log("now has unknowns", unknowns);
      }
    }

    let added = next,
      a = 0
    while (unknowns.length !== targetUnknowns && a++ < 100) {
      added = insertNew(next)
      unknowns = getUnknowns(prev, added)
      //console.log("adding", unknowns);
    }

    //added = addAlreadyKnown(added);

    seq.push(added)
  }
  return seq
}

function evaluate(seq, print) {
  const used = {}
  let failed = false
  const ng = seq.map(([grid, _], i) => {
    print && console.log(i, ':')
    const lused = {}
    let unknowns = 0
    grid.forEach(row =>
      row.forEach(cell => {
        const str = cell2string(cell)
        if (str == '0000-0000') return
        lused[str] = 1
        if (!used[str]) {
          used[str] = 1
          unknowns++
          print && console.log(str)
        } else {
          used[str]++
        }
      })
    )
    print && console.log(display.asciiGrid(grid))
    if (unknowns > 1) {
      failed = true
      //throw "oh";
    }
    return [grid, { ...used, ...lused }]
  })

  const count = _.sum(_.values(used)),
    avg = count / _.values(used).length

  let vari = 0
  _.values(used).forEach(val => {
    vari += Math.abs(val - avg)
  })

  return {
    grid: ng,
    failed,
    count,
    avg,
    vari: vari,
    score: (1 / vari) * avg,
    used: used,
  }
}

function makeRandSeq(start, n) {
  let seq = [start]
  while (seq.length < n) {
    let prev = seq[seq.length - 1],
      next = getNextInSeq(prev, n, true)

    seq.push(next)
  }
  return seq
}

function cell2text(cell) {
  const dirs = [[-1, -1], [-1, -1]]
  cell.map((io, i) => {
    io.forEach((v, j) => {
      if (v === 1 || v === 3) dirs[i][0] = j
      if (v === 2 || v === 3) dirs[i][1] = j
    })
  })
  return dirs.map((dir, diri) => {
    return dir.map((d, i) => {
      const adj = dirs[(diri + 1) % dirs.length][i]
      return directionNames[d] || (adj === -1 ? 'stay' : 'back')
    })
  })
}

// const rseq = JSON.parse(fs.readFileSync("media/seq61081479.75687055.json"))
// console.log(evaluate(rseq, 1))

/* create random sequence */
// const start = emptyGrid(12,9);
// start[2][2][1] = [0, 0, 0, 3];
// const s = makeRandSeq([start, { "0000-0003": 1 }], 500);
// s.forEach((step, i) => {
//   console.log(display.asciiGrid(step[0]));
// });
// console.log(_.keys(evaluate(s, 0).used).length)
// fs.writeFileSync('media/rseq43long.json', JSON.stringify(s))

// if (0) {
//   let max = 0;
//   while (1) {
//     try {
//       let r = Math.random() * 100000000;
//       prng = new Alea(r);
//       const start = emptyGrid(7, 7);
//       start[2][2][1] = [0, 0, 0, 3];
//       const seq = makeGridSeq([start, { "0000-0003": 1 }], 60, 20, r);

//       const { failed, score, used } = evaluate(seq);
//       if (/*used.length === 40 && */ !failed && score > max) {
//         max = score;
//         console.log(r, score);
//       } else if (!failed  && score > max * 0.9) console.log(r, score, "*");
//     } catch (e) {}
//   }
// } else {
//   let r = 12631265.110279078;
//   prng = new Alea(r);
//   const start = emptyGrid(7, 7);
//   start[2][2][1] = [0, 0, 0, 3];
//   const seq = makeGridSeq([start, { "0000-0003": 1 }], 60, 20, r);
//   console.log(evaluate(seq, 1));
//   fs.writeFileSync(`media/seq${r}.json`, JSON.stringify(seq))
// }

module.exports = {
  makeGridSeq,
  cell2string,
  string2cell,
  cell2text,
}

//65886036.062342644

//best: 1828505.660673585

/* 
61081479.75687055 31.23170731707317 //preddygud
41635591.8588789 28.15853658536585
*/

function hasConflict(io) {
  for (var i = 0; i < io.length; i++) {
    for (var j = 0; j < io.length; j++) {
      if (i !== j && conflicts(io[i], io[j])) return true
    }
  }
  return false
}

function computeNext(width, height, step) {
  let next = {}
  for (var pos in step) {
    const cell = string2cell(step[pos])
    const [x, y] = pos.split(',').map(x => parseInt(x))
    for (let di = 0; di < cell[1].length; di++) {
      const value = cell[1][di]
      if (value) {
        const opposingDirI = (di + 2) % 4
        const [dx, dy] = directions[di]
        const nx = (x + dx + width) % width,
          ny = (y + dy + height) % height

        const coord = nx + ',' + ny
        const currentNeighbor = step[coord] && string2cell(step[coord])
        const tubeUsed = currentNeighbor && currentNeighbor[1][opposingDirI]
        if (tubeUsed) return false
        next[coord] = next[coord] || [[0, 0, 0, 0], [0, 0, 0, 0]]
        next[coord][0][opposingDirI] = value
      }
    }
  }
  next = _.mapValues(next, n => cell2string(n))
  return next
}

//console.log(computeNext(7,7,{ '3,3': '0000-0020', '3,4': '1000-0200' }))

// node: {cell:[io,io], pos: [x,y], children: []}
// step: { [x+'-'+y]: [io, io]}
let m = 0
let calls = 0
function createSeqTree(width, height, entrance, used, n, ending) {
  calls++
  if (calls > 100000) return
  const isEnding = n < ending
  //console.log(n, ending)
  const thisios = [...shuffle(possibleIos)]
  //if(_.keys(entrance).length > 10) thisios[0] = '0000'
  if (used.length > m) {
    m = used.length
    //console.log(m);
  }
  if (!n) return []
  else {
    const cells = _.values(entrance)
    const possibleOuts = []
    if (_.some(cells, cell => hasConflict(cell[0]))) return false
    const uniqEntranceIos = _.uniqBy(cells.map(v => v[0]), v => v + '')
    for (let i = 0; i < uniqEntranceIos.length; i++) {
      const addnlIo = uniqEntranceIos[i]
      //console.log('addtnl', addnlIo)
      /* is there an entrance here that cannot be filled */
      const hasMissing = _.some(uniqEntranceIos, io => {
        const sio = io2string(io)
        return !(
          (!isEnding && _.isEqual(io, addnlIo)) ||
          _.some(used, cell => {
            return cell.indexOf(sio) === 0
          })
        )
      })

      if (hasMissing) continue
      for (let j = 0; j < thisios.length; j++) {
        const exitIo = string2io(thisios[j])
        //console.log('exit', exitIo)
        const availableCells = isEnding ? used : [cell2string([addnlIo, exitIo]), ...used]
        const possibleCells = _.mapValues(entrance, cell => {
          return !isEnding && _.isEqual(cell[0], addnlIo)
            ? [availableCells[0]]
            : _.compact(
                availableCells.map(acell => {
                  return _.isEqual(cell[0], string2cell(acell)[0]) && acell
                })
              )
        })
        const lens = _.values(possibleCells).map(c => c.length)
        const combinations = lens.reduce((a, b) => a * b)
        //console.log('combinations', Math.min(combinations, 200))
        const indicies = lens.map(() => 0)
        for (let c = 0; c < Math.min(combinations, 10); c++) {
          for (let x = 0; x < lens.length; x++) {
            indicies[x] = (indicies[x] + 1) % lens[x]
            if (indicies[x]) break
          }
          let ci = 0
          const output = _.mapValues(possibleCells, cell => cell[indicies[ci++]])
          //console.log(output)
          const next = _.mapValues(computeNext(width, height, output), c =>
            string2cell(c)
          )
          if (!next) continue //next has a tibe conflict. skip this one
          //if(_.keys(next).length < _.keys(entrance).length) continue;
          const tail = createSeqTree(width, height, next, availableCells, n - 1, ending)
          if (!tail) continue
          //possibleOuts.push([output, ...tail])
          const res = [output, ...tail]
          // if(_.keys(next).length < Math.log2(used.length)){
          //   console.log(Math.log2(used.length))
          //   continue;
          // }
          return res
        }
      }
    }
    return false
    // if(!possibleOuts) return false;
    // else return _.maxBy(possibleOuts, o => _.keys(_.last(o)).length)
  }
}

function createGridSeq(width, height, seq) {
  return seq.map(items => {
    const grid = emptyGrid(width, height)
    _.each(items, (val, pos) => {
      const [x, y] = pos.split(',').map(x => parseInt(x))
      grid[y][x] = string2cell(val)
    })
    return [grid]
  })
}

/* create live sequenceess */
// const x = 4, y = 3
// let max = 0
// while (1) {
//   const r = Math.floor(Math.random() * 100000000)
//   prng = new Alea(r)
//   const t = new Date().getTime()
//   calls = 0
//   const seq = createSeqTree(
//     x,
//     y,
//     {
//       '2,2': [[0, 0, 0, 0], [0, 0, 0, 0]],
//     },
//     [],
//     50,
//     18
//   )

//   if (seq) {
//     const avg = _.mean(seq.map(s => _.uniq(_.values(s)).length))
//     if (avg > max) {
//       max = avg
//       console.log(avg, r)
//       const gseq = createGridSeq(x, y, seq)
//       const eval = evaluate(gseq, 0)
//       fs.writeFileSync(`media/sequences/live43${r}.json`, JSON.stringify(eval.grid))
//     } //else console.log(avg)
//   }
//   //console.log(JSON.stringify(seq, null, 2));
// }








// function mapSeq(seq, predicate){
//   return seq.map(step => {
//     const [cells, used] = step;
//     const nextUsed = {}
//     _.keys(used).forEach(cell => {
//       const asCell = string2cell(cell)
//       const next = cell2string(asCell.map(predicate))
//       nextUsed[next] = 1
//     })
//     const nextCells = cells.map(row => {
//       return row.map(v => v.map(predicate))
//     })
//     return [nextCells, nextUsed]
//   })
// }
// const inseq = JSON.parse(fs.readFileSync(`media/${88284009}.json`));
// const mapped = mapSeq(inseq, a => {
//   const [t,l,b,r] = a
//   return [r,t,l,b]
// })
// fs.writeFileSync(`media/88284009_1.json`, JSON.stringify(mapped));

// const r = 88284009
// prng = new Alea(r);
// const seq = createSeqTree(
//   7,
//   7,
//   {
//     "3,3": [[0, 0, 0, 0], [0, 0, 0, 0]]
//   },
//   [],
//   80,
//   30
// );
// const gseq = createGridSeq(7, 7, seq);
// const eval = evaluate(gseq, 1);
// console.log(eval)
// fs.writeFileSync(`media/${r}-1.json`, JSON.stringify(eval.grid));

//console.log(eval.grid.map(g => _.keys(g[1])))

// const avg = _.mean(seq.map(s => _.uniq(_.values(s)).length));
// if (avg > max) {
//   max = avg;
//   console.log(avg, r);
//   const gseq = createGridSeq(7, 7, seq);
//   const eval = evaluate(gseq, 0);
//   fs.writeFileSync(`media/seq${r}.json`, JSON.stringify(eval.grid));
// }

//SHORTTT
//  prng = new Alea(106);
// const seq = createSeqTree(
//   7,
//   7,
//   {
//     "3,3": [[0, 0, 0, 0], [0, 0, 0, 0]]
//   },
//   [],
//   7,
//   5
// );
// const gseq = createGridSeq(7, 7, seq);
// const eval = evaluate(gseq, 1);
// console.log(eval)
// fs.writeFileSync(`media/short.json`, JSON.stringify(eval.grid));
