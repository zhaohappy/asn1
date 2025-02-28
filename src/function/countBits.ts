export default function countBits(range: number) {
  range >>>= 0
  switch (range) {
    case 0 :
      return 32
    case 1:
      return 1
  }

  let nBits = 0
  while (nBits < 32 && range > ((1 << nBits) >>> 0)) {
    nBits++
  }
  return nBits
}
