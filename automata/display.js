const idirs = ["-|-|", "⥝⥟⥜⥞", "⥕⥓⥔⥒", "⥥⥤⥣⥢"],
  odirs = ["-|-|", "⥜⥞⥝⥟", "⥔⥒⥕⥓", "⥣⥢⥥⥤"];

function asciiCell(cell) {
  const [input, out] = cell,
    [itop, ileft, ibottom, iright] = input,
    [otop, oleft, obottom, oright] = out;

  const t = itop ? idirs[itop][0] : odirs[otop][0],
    l = ileft ? idirs[ileft][1] : odirs[oleft][1],
    b = ibottom ? idirs[ibottom][2] : odirs[obottom][2],
    r = iright ? idirs[iright][3] : odirs[oright][3];

  return `|--${t}--|
${l}     ${r}
|--${b}--|`;
}

function combineHor(cells) {
  return cells
    .map(cell => cell.split("\n"))
    .reduce((acc, cell) => {
      return acc.map((line, i) => line + cell[i]);
    })
    .join("\n");
}

function asciiGrid(grid) {
  return grid.map(row => combineHor(row.map(asciiCell))).join("\n");
}

module.exports = {
  asciiGrid,
  asciiCell
}