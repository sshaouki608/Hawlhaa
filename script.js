(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

/* إشعارات */
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + (type === 'err' ? 'err' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 3200);
}
/* نسخ */
async function copyText(text, label = 'النص') {
  if (!text) return toast('لا يوجد شيء لنسخه.', 'err');
  try {
    if (!(navigator.clipboard && window.isSecureContext)) throw new Error('no-clipboard');
    await navigator.clipboard.writeText(text); toast('تم نسخ ' + label + '.');
  } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove();
      ok ? toast('تم نسخ ' + label + '.') : toast('تعذّر النسخ. اسمح للموقع بالوصول إلى الحافظة أو انسخ يدويًا.', 'err');
    } catch { toast('تعذّر النسخ. اسمح للموقع بالوصول إلى الحافظة أو انسخ يدويًا.', 'err'); }
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const el = $(b.dataset.copy); copyText(el.value ?? el.textContent, 'القيمة');
});
function showErr(el, msg) { el.textContent = msg; el.hidden = !msg; }

/* الوضع الليلي */
function applyTheme(t) { root.dataset.theme = t; $('#themeBtn').setAttribute('aria-pressed', String(t === 'dark')); }
let saved = null; try { saved = localStorage.getItem('hawelha-theme'); } catch {}
applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#themeBtn').onclick = () => {
  const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(t);
  try { localStorage.setItem('hawelha-theme', t); } catch { toast('تعذّر حفظ تفضيل الوضع في هذا المتصفح.', 'err'); }
};

/* البطاقات والبحث والتصنيفات */
const tools = $$('.tool');
const norm = s => s.toLowerCase().replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
let cat = 'الكل';
tools.forEach(t => {
  const a = document.createElement('a'); a.className = 'card'; a.href = '#' + t.id;
  a.innerHTML = '<span class="ic" aria-hidden="true"></span><b></b><small></small>';
  $('.ic', a).textContent = t.dataset.icon; $('b', a).textContent = t.dataset.name; $('small', a).textContent = t.dataset.desc;
  t._card = a; $('#grid').append(a);
  const li = document.createElement('li'), l = document.createElement('a'); l.href = '#' + t.id; l.textContent = t.dataset.name; li.append(l); $('#nav').append(li);
});
['الكل', ...new Set(tools.map(t => t.dataset.cat))].forEach(c => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c;
  b.setAttribute('aria-pressed', String(c === cat));
  b.onclick = () => { cat = c; $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); filter(); };
  $('#cats').append(b);
});
function filter() {
  const q = norm($('#search').value.trim()); let n = 0;
  tools.forEach(t => {
    const ok = (cat === 'الكل' || t.dataset.cat === cat) && q.split(/\s+/).every(w => norm(t.dataset.name + ' ' + t.dataset.desc + ' ' + t.dataset.kw + ' ' + t.dataset.cat).includes(w));
    t.hidden = t._card.hidden = !ok; if (ok) n++;
  });
  $('#empty').hidden = n > 0;
}
$('#search').addEventListener('input', filter);

/* QR */
const qrC = $('#qrCanvas');
$('#qrGen').onclick = () => {
  const v = $('#qrInput').value.trim();
  if (!v) { showErr($('#qrErr'), 'أدخل رابطًا أو نصًا أولًا.'); qrC.hidden = true; $('#qrDl').disabled = true; return toast('الحقل فارغ.', 'err'); }
  try {
    const q = QR.encode(v), s = Math.max(3, Math.floor(360 / (q.size + 8))), px = (q.size + 8) * s;
    qrC.width = qrC.height = px; const c = qrC.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, px, px); c.fillStyle = '#000';
    q.modules.forEach((row, y) => row.forEach((d, x) => { if (d) c.fillRect((x + 4) * s, (y + 4) * s, s, s); }));
    qrC.hidden = false; $('#qrDl').disabled = false; showErr($('#qrErr'), ''); toast('تم إنشاء رمز QR.');
  } catch (e) { showErr($('#qrErr'), e.message); qrC.hidden = true; $('#qrDl').disabled = true; toast('تعذّر إنشاء الرمز.', 'err'); }
};
$('#qrDl').onclick = () => qrC.toBlob(b => {
  if (!b) return toast('تعذّر تجهيز الصورة.', 'err');
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'hawelha-qr.png'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('بدأ تنزيل الصورة.');
}, 'image/png');

/* منسّق النصوص */
const tx = $('#txt');
function stats() {
  const t = tx.value, w = t.trim() ? t.trim().split(/\s+/).length : 0;
  $('#sW').textContent = w; $('#sC').textContent = [...t].length; $('#sN').textContent = [...t.replace(/\s/g, '')].length;
  $('#sL').textContent = t ? t.split(/\r\n|\r|\n/).length : 0;
}
tx.addEventListener('input', stats);
$('#txApply').onclick = () => {
  if (!tx.value) return toast('اكتب نصًا أولًا.', 'err');
  let lines = tx.value.split(/\r\n|\r|\n/);
  if ($('#oSp').checked) lines = lines.map(l => l.replace(/[ \t\u00A0\u3000]{2,}/g, ' '));
  if ($('#oTrim').checked) lines = lines.map(l => l.trim());
  if ($('#oEmpty').checked) lines = lines.filter(l => l.trim() !== '');
  tx.value = lines.join('\n'); stats(); toast('تم تطبيق التنسيق.');
};
$('#txUp').onclick = () => { tx.value = tx.value.toUpperCase(); stats(); };
$('#txLow').onclick = () => { tx.value = tx.value.toLowerCase(); stats(); };
$('#txClear').onclick = () => { tx.value = ''; $('#oSp').checked = $('#oTrim').checked = true; $('#oEmpty').checked = false; stats(); toast('تم المسح.'); };

/* الحاسبة */
const AR = '٠١٢٣٤٥٦٧٨٩';
const num = id => { const v = $(id).value.trim().replace(/[٠-٩]/g, d => AR.indexOf(d)).replace(/[٫,]/g, '.').replace(/[٬،\s]/g, ''); return v === '' || !/^-?\d*\.?\d+$/.test(v) ? NaN : +v; };
const fmt = n => new Intl.NumberFormat('ar-u-nu-latn', { maximumFractionDigits: 2 }).format(n);
function out(id, msg, bad) { const o = $(id); o.textContent = msg; o.className = 'res ' + (bad ? 'bad' : 'good'); }
$('#p1go').onclick = () => {
  const a = num('#p1a'), b = num('#p1b');
  if (isNaN(a) || isNaN(b)) return out('#p1o', 'أدخل رقمين صالحين.', 1);
  if (b === 0) return out('#p1o', 'لا يمكن القسمة على صفر.', 1);
  out('#p1o', fmt(a) + ' تساوي ' + fmt(a / b * 100) + '% من ' + fmt(b));
};
$('#p2go').onclick = () => {
  const p = num('#p2a'), m = num('#p2b');
  if (isNaN(p) || isNaN(m)) return out('#p2o', 'أدخل رقمين صالحين.', 1);
  out('#p2o', fmt(p) + '% من ' + fmt(m) + ' = ' + fmt(m * p / 100));
};
$('#dGo').onclick = () => {
  const p = num('#dPrice'), d = num('#dPct');
  if (isNaN(p) || isNaN(d)) return out('#dOut', 'أدخل السعر ونسبة الخصم بأرقام صالحة.', 1);
  if (p < 0 || d < 0 || d > 100) return out('#dOut', 'السعر يجب ألا يكون سالبًا، ونسبة الخصم بين 0 و100.', 1);
  out('#dOut', 'قيمة الخصم: ' + fmt(p * d / 100) + '\nالسعر النهائي: ' + fmt(p - p * d / 100));
};
$('#bGo').onclick = () => {
  const t = num('#bTotal'), n = num('#bN'), tipRaw = $('#bTip').value.trim(), tip = tipRaw === '' ? 0 : num('#bTip');
  if (isNaN(t) || isNaN(n) || isNaN(tip)) return out('#bOut', 'أدخل الإجمالي وعدد الأشخاص (والإكرامية إن وُجدت) بأرقام صالحة.', 1);
  if (n === 0) return out('#bOut', 'عدد الأشخاص لا يمكن أن يكون صفرًا.', 1);
  if (!Number.isInteger(n) || n < 1) return out('#bOut', 'عدد الأشخاص يجب أن يكون عددًا صحيحًا موجبًا.', 1);
  if (t < 0 || tip < 0) return out('#bOut', 'القيم لا يجب أن تكون سالبة.', 1);
  const tipV = t * tip / 100, all = t + tipV;
  out('#bOut', 'الإكرامية: ' + fmt(tipV) + '\nالإجمالي: ' + fmt(all) + '\nلكل شخص: ' + fmt(all / n));
};

/* الألوان */
const pk = $('#picker');
function color() {
  const h = pk.value.toUpperCase(), r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  $('#preview').style.background = h; $('#vHex').textContent = h; $('#vRgb').textContent = `rgb(${r}, ${g}, ${b})`;
}
pk.addEventListener('input', color);
['#6D4AFF', '#2563EB', '#0EA5E9', '#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#64748B', '#111827', '#F8FAFC'].forEach(c => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.style.background = c; b.setAttribute('aria-label', 'اللون ' + c); b.title = c;
  b.onclick = () => { pk.value = c.toLowerCase(); color(); }; $('#swatches').append(b);
});
color();

/* كلمات المرور */
const SETS = { cU: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', cL: 'abcdefghijklmnopqrstuvwxyz', cN: '0123456789', cS: '!@#$%^&*()-_=+[]{};:,.?' };
function rnd(n) { const lim = Math.floor(4294967296 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; }
function genPw() {
  const on = Object.keys(SETS).filter(k => $('#' + k).checked), len = +$('#pwLen').value;
  if (!on.length) { showErr($('#pwErr'), 'اختر نوعًا واحدًا على الأقل من الأحرف.'); return toast('لم يتم اختيار أي نوع من الأحرف.', 'err'); }
  if (!(window.crypto && crypto.getRandomValues)) return toast('متصفحك لا يدعم التوليد العشوائي الآمن.', 'err');
  showErr($('#pwErr'), '');
  const pool = on.map(k => SETS[k]).join(''), chars = on.map(k => SETS[k][rnd(SETS[k].length)]);
  while (chars.length < len) chars.push(pool[rnd(pool.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  $('#pwOut').value = chars.join('');
  const bits = len * Math.log2(pool.length), L = [[40, 'ضعيفة', '#d93a3a', 25], [60, 'متوسطة', '#e0952b', 50], [80, 'جيدة', '#3b82f6', 75], [1e9, 'قوية', '#16a36a', 100]].find(x => bits < x[0]);
  $('#pwBar').style.width = L[3] + '%'; $('#pwBar').style.background = L[2];
  $('#pwTxt').textContent = 'القوة التقديرية: ' + L[1] + ' (نحو ' + Math.round(bits) + ' بت إنتروبيا نظرية)';
}
$('#pwGen').onclick = () => { genPw(); if ($('#pwOut').value) toast('تم إنشاء كلمة مرور جديدة.'); };
$('#pwLen').addEventListener('input', e => { $('#pwLenV').textContent = e.target.value; genPw(); });
Object.keys(SETS).forEach(k => $('#' + k).addEventListener('change', genPw));
genPw(); stats();
})();
