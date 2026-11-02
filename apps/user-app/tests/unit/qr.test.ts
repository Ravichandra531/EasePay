/** @jest-environment node */
import { qrMatrix, qrSvg } from "@/lib/qr";
// Validate the emitted symbol independently: read unmasked data and check all RS syndromes.
function readCodewords(matrix: boolean[][]) {
  const size = 37,
    skip = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      skip[y]![x] =
        (x < 9 && y < 9) ||
        (x >= 29 && y < 9) ||
        (x < 9 && y >= 29) ||
        x === 6 ||
        y === 6 ||
        (x >= 28 && x <= 32 && y >= 28 && y <= 32);
  // The format strips extend one module beyond the finder separator.
  for (let i = 0; i < 8; i++) {
    skip[8]![36 - i] = true;
    skip[36 - i]![8] = true;
  }
  skip[29]![8] = true;
  const bits: number[] = [];
  for (let col = 36; col > 0; col -= 2) {
    if (col === 6) col = 5;
    const upward = col % 4 === 0 || col === 3;
    for (let row = 0; row < 37; row++) {
      const y = upward ? 36 - row : row;
      for (const x of [col, col - 1])
        if (!skip[y]![x])
          bits.push(Number(matrix[y]![x]) ^ Number((x + y) % 2 === 0));
    }
  }
  return bits.slice(0, 134 * 8).reduce<number[]>((out, bit, i) => {
    if (i % 8 === 0) out.push(0);
    out[out.length - 1] = (out[out.length - 1]! << 1) | bit;
    return out;
  }, []);
}
test("merchant QR carries the exact link and valid error-correction codewords", () => {
  const link = "http://localhost:3001/pay/0123456789abcdef0123",
    matrix = qrMatrix(link),
    words = readCodewords(matrix);
  expect(matrix).toHaveLength(37);
  expect(matrix.every((row) => row.length === 37)).toBe(true);
  const bits = words.flatMap((w) =>
    Array.from({ length: 8 }, (_, i) => (w >>> (7 - i)) & 1),
  );
  expect(bits.slice(0, 4).join("")).toBe("0100");
  const length = parseInt(bits.slice(4, 12).join(""), 2);
  expect(length).toBe(Buffer.byteLength(link));
  const decoded = Array.from({ length }, (_, i) =>
    parseInt(bits.slice(12 + i * 8, 20 + i * 8).join(""), 2),
  );
  expect(Buffer.from(decoded).toString()).toBe(link);
  const exp: number[] = [],
    log: number[] = [];
  let value = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 256) value ^= 285;
  }
  const multiply = (a: number, b: number) =>
    a && b ? exp[(log[a]! + log[b]!) % 255]! : 0;
  for (let root = 0; root < 26; root++) {
    let syndrome = 0;
    for (const word of words) syndrome = multiply(syndrome, exp[root]!) ^ word;
    expect(syndrome).toBe(0);
  }
});
test("oversized links fail explicitly rather than emitting an invalid QR", () => {
  expect(() => qrMatrix("a".repeat(107))).toThrow("too long");
  expect(qrSvg("https://example.com/pay/merchant")).toContain(
    'viewBox="0 0 45 45"',
  );
});
