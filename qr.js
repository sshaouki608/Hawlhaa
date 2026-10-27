/* مولّد QR محلي (وضع البايتات، تصحيح أخطاء M، النسخ 1–20، القناع 0).
   مكتوب خصيصًا لهذا المشروع وفق مواصفة ISO/IEC 18004، ولا يتضمن شيفرة طرف ثالث. */
(function (g) {
  'use strict';
  const ECC = [10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26];
  const BLK = [1,1,2,2,4,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16];
  const MAXV = 20;
  function rawModules(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  const dataCap = v => Math.floor(rawModules(v) / 8) - ECC[v - 1] * BLK[v - 1];
  function mul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
  function divisor(d) {
    const r = new Array(d).fill(0); r[d - 1] = 1; let root = 1;
    for (let i = 0; i < d; i++) { for (let j = 0; j < d; j++) { r[j] = mul(r[j], root); if (j + 1 < d) r[j] ^= r[j + 1]; } root = mul(root, 2); }
    return r;
  }
  function remainder(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); }
    return r;
  }
  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    if (!bytes.length) throw new Error('الإدخال فارغ.');
    let ver = 0;
    for (let v = 1; v <= MAXV; v++) { if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCap(v) * 8) { ver = v; break; } }
    if (!ver) throw new Error('النص طويل جدًا. الحد الأقصى نحو ' + (dataCap(MAXV) - 3) + ' بايتًا (الحروف العربية تأخذ بايتين لكل حرف).');
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    const capBits = dataCap(ver) * 8;
    put(0, Math.min(4, capBits - bits.length)); put(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < capBits; p ^= 0xEC ^ 0x11) put(p, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    // كتل تصحيح الأخطاء والتشابك
    const nb = BLK[ver - 1], el = ECC[ver - 1], raw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - raw % nb, sLen = Math.floor(raw / nb), div = divisor(el);
    const blocks = []; let k = 0;
    for (let i = 0; i < nb; i++) {
      const dl = sLen - el + (i < nShort ? 0 : 1), d = data.slice(k, k + dl); k += dl;
      const e = remainder(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(e));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sLen - el || j >= nShort) all.push(b[i]); });
    // رسم المصفوفة
    const size = ver * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    });
    if (ver > 1) {
      const n = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2, pos = [6];
      for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
      pos.forEach((a, i) => pos.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const drawFormat = mask => {
      let r = mask; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const f = ((mask << 10) | r) ^ 0x5412, bit = i => ((f >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const f = (ver << 12) | r;
      for (let i = 0; i < 18; i++) { const b = ((f >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, b); set(c, a, b); }
    }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
        if (!fn[y][x] && i < all.length * 8) { m[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
      }
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && (x + y) % 2 === 0) m[y][x] = !m[y][x];
    return { version: ver, size, modules: m };
  }
  g.QR = { encode };
})(typeof window !== 'undefined' ? window : globalThis);
