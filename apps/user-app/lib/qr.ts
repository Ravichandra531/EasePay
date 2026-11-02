/** QR Model 2, version 5-L, byte mode, mask 0. One Reed-Solomon block. */
export function qrMatrix(value: string): boolean[][] {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 106)
    throw new Error("Payment link is too long for this QR code");
  const bits: number[] = [];
  const append = (v: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  append(4, 4);
  append(bytes.length, 8);
  for (const b of bytes) append(b, 8);
  append(0, Math.min(4, 864 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0; data.length < 108; pad++) data.push(pad % 2 ? 0x11 : 0xec);
  function multiply(x: number, y: number) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  const divisor = Array<number>(26).fill(0);
  divisor[25] = 1;
  let root = 1;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      divisor[j] = multiply(divisor[j]!, root);
      if (j + 1 < 26) divisor[j] = divisor[j]! ^ divisor[j + 1]!;
    }
    root = multiply(root, 2);
  }
  const ecc = Array<number>(26).fill(0);
  for (const b of data) {
    const factor = b ^ ecc.shift()!;
    ecc.push(0);
    for (let i = 0; i < 26; i++)
      ecc[i] = ecc[i]! ^ multiply(divisor[i]!, factor);
  }
  const codewords = [...data, ...ecc],
    size = 37;
  const modules = Array.from({ length: size }, () =>
      Array<boolean>(size).fill(false),
    ),
    reserved = Array.from({ length: size }, () =>
      Array<boolean>(size).fill(false),
    );
  function set(x: number, y: number, dark: boolean) {
    if (x >= 0 && y >= 0 && x < size && y < size) {
      modules[y]![x] = dark;
      reserved[y]![x] = true;
    }
  }
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx! + dx, cy! + dy, d !== 2 && d !== 4);
      }
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      set(30 + dx, 30 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  const format = 0x77c4,
    bit = (i: number) => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (reserved[y]![x]) continue;
        let dark =
          index < codewords.length * 8 &&
          ((codewords[index >>> 3]! >>> (7 - (index & 7))) & 1) !== 0;
        index++;
        if ((x + y) % 2 === 0) dark = !dark;
        modules[y]![x] = dark;
      }
    }
  }
  return modules;
}
export function qrPath(matrix: boolean[][]) {
  return matrix
    .flatMap((row, y) =>
      row.flatMap((dark, x) => (dark ? [`M${x + 4},${y + 4}h1v1h-1z`] : [])),
    )
    .join("");
}
export function qrSvg(value: string) {
  const matrix = qrMatrix(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 45 45"><rect width="45" height="45" fill="white"/><path d="${qrPath(matrix)}" fill="#102d21"/></svg>`;
}
