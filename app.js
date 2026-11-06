// دفتري الدراسي — كل البيانات محفوظة محلياً في المتصفح (localStorage)
const KEY = 'study-notebook-v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let db = load();
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.courses) return d; } catch {}
  return { courses: [], grades: [], tasks: [] };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast('تعذّر الحفظ في المتصفح'); }
  render();
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- التبويبات ----------
$$('.tab').forEach((b) => b.addEventListener('click', () => {
  $$('.tab').forEach((x) => x.classList.toggle('active', x === b));
  $$('.panel').forEach((p) => p.classList.toggle('active', p.id === b.dataset.tab));
}));

// ---------- حسابات ----------
const courseName = (id) => db.courses.find((c) => c.id === id)?.name || '—';
const pct = (g) => (g.score / g.max) * 100;
function courseAvg(id) {
  const gs = db.grades.filter((g) => g.courseId === id);
  if (!gs.length) return null;
  const s = gs.reduce((a, g) => a + g.score, 0), m = gs.reduce((a, g) => a + g.max, 0);
  return (s / m) * 100;
}
function overallAvg() {
  let sum = 0, w = 0;
  db.courses.forEach((c) => { const a = courseAvg(c.id); if (a != null) { const cr = +c.credits || 1; sum += a * cr; w += cr; } });
  return w ? sum / w : null;
}
const cls = (p) => (p == null ? '' : p >= 75 ? 'good' : p >= 50 ? 'mid' : 'bad');
const fmt = (p) => (p == null ? '—' : p.toFixed(1) + '%');
const today = () => new Date().toISOString().slice(0, 10);

// ---------- العرض ----------
function render() {
  // قوائم المواد
  $$('.course-select').forEach((sel) => {
    const v = sel.value;
    let html = sel.dataset.all ? '<option value="">كل المواد</option>' : sel.dataset.none ? '<option value="">بدون مادة</option>' : '';
    html += db.courses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    sel.innerHTML = html; sel.value = v; if (sel.selectedIndex < 0) sel.selectedIndex = 0;
  });

  // الإحصائيات
  const pending = db.tasks.filter((t) => !t.done);
  $('#st-courses').textContent = db.courses.length;
  $('#st-grades').textContent = db.grades.length;
  $('#st-tasks').textContent = pending.length;
  const oa = overallAvg(); $('#st-avg').textContent = fmt(oa); $('#st-avg').className = 'num ' + cls(oa);

  $('#course-bars').innerHTML = db.courses.length ? db.courses.map((c) => {
    const a = courseAvg(c.id);
    return `<div class="row"><div class="lbl"><span>${esc(c.name)}</span><span class="${cls(a)}">${fmt(a)}</span></div>
      <div class="track"><div class="fill" style="width:${a ?? 0}%;background:var(--${cls(a) || 'line'})"></div></div></div>`;
  }).join('') : '<p class="empty">أضف مادة من تبويب "المواد".</p>';

  const up = [...pending].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 6);
  $('#upcoming').innerHTML = up.length ? up.map(taskItem).join('') : '<li class="empty">لا توجد مهام 🎉</li>';

  // جدول المواد
  $('#course-table tbody').innerHTML = db.courses.map((c) => {
    const a = courseAvg(c.id);
    return `<tr><td>${esc(c.name)}</td><td>${esc(c.teacher)}</td><td>${esc(c.credits)}</td><td class="${cls(a)}">${fmt(a)}</td>
      <td><button class="btn ghost sm" data-edit="courses" data-id="${c.id}">تعديل</button> <button class="btn danger sm" data-del="courses" data-id="${c.id}">حذف</button></td></tr>`;
  }).join('') || '<tr><td colspan="5" class="empty">لا توجد مواد بعد</td></tr>';

  // جدول الدرجات
  const f = $('#grade-filter').value;
  const gs = db.grades.filter((g) => !f || g.courseId === f).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#grade-table tbody').innerHTML = gs.map((g) => `<tr><td>${esc(courseName(g.courseId))}</td><td>${esc(g.title)}</td>
      <td>${g.score} / ${g.max}</td><td class="${cls(pct(g))}">${fmt(pct(g))}</td><td>${esc(g.date)}</td>
      <td><button class="btn ghost sm" data-edit="grades" data-id="${g.id}">تعديل</button> <button class="btn danger sm" data-del="grades" data-id="${g.id}">حذف</button></td></tr>`).join('')
    || '<tr><td colspan="6" class="empty">لا توجد درجات</td></tr>';

  // المهام
  const ts = [...db.tasks].sort((a, b) => a.done - b.done || (a.due || '9999').localeCompare(b.due || '9999'));
  $('#task-list').innerHTML = ts.length ? ts.map((t) => taskItem(t, true)).join('') : '<li class="empty">لا توجد مهام</li>';
}
function taskItem(t, full) {
  const late = !t.done && t.due && t.due < today();
  return `<li class="${t.done ? 'done' : ''}"><input type="checkbox" data-toggle="${t.id}" ${t.done ? 'checked' : ''}>
    <span class="grow">${esc(t.title)} ${t.courseId ? `<span class="tag">${esc(courseName(t.courseId))}</span>` : ''}</span>
    <span class="${late ? 'late' : 'muted'}">${esc(t.due || '')}</span>
    ${full ? `<button class="btn ghost sm" data-edit="tasks" data-id="${t.id}">تعديل</button> <button class="btn danger sm" data-del="tasks" data-id="${t.id}">حذف</button>` : ''}</li>`;
}

// ---------- النماذج ----------
const forms = { courses: '#course-form', grades: '#grade-form', tasks: '#task-form' };
const numeric = ['credits', 'score', 'max'];
Object.entries(forms).forEach(([col, sel]) => {
  const form = $(sel);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    numeric.forEach((k) => { if (k in data) data[k] = parseFloat(data[k]) || 0; });
    if (col === 'grades' && !data.courseId) return toast('أضف مادة أولاً');
    const list = db[col];
    if (data.id) { const i = list.findIndex((x) => x.id === data.id); list[i] = { ...list[i], ...data }; }
    else list.push({ ...data, id: uid(), ...(col === 'tasks' ? { done: false } : {}) });
    form.reset(); form.elements.id.value = '';
    save(); toast('تم الحفظ ✔');
  });
  form.addEventListener('reset', () => setTimeout(() => { form.elements.id.value = ''; }));
});

document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-del]');
  if (d) {
    const { del: col, id } = d.dataset;
    const msg = col === 'courses' ? 'حذف المادة وكل درجاتها ومهامها؟' : 'متأكد من الحذف؟';
    if (!confirm(msg)) return;
    db[col] = db[col].filter((x) => x.id !== id);
    if (col === 'courses') { db.grades = db.grades.filter((g) => g.courseId !== id); db.tasks = db.tasks.filter((t) => t.courseId !== id); }
    save(); return;
  }
  const ed = e.target.closest('[data-edit]');
  if (ed) {
    const { edit: col, id } = ed.dataset;
    const item = db[col].find((x) => x.id === id), form = $(forms[col]);
    Object.entries(item).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
    form.scrollIntoView({ behavior: 'smooth' });
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset.toggle) { const t = db.tasks.find((x) => x.id === e.target.dataset.toggle); t.done = e.target.checked; save(); }
});
$('#grade-filter').addEventListener('change', render);

// ---------- تنظيف النص ----------
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩⁪-⁯﻿­᠎͏؜︀-️]/g;
const ODD_SPACES = /[   -   　]/g;
function cleanText(s, o) {
  const report = {};
  const rep = (name, re, to) => { const m = s.match(re); if (m) report[name] = (report[name] || 0) + m.length; s = s.replace(re, to); };
  if (o.invisible) rep('حرف مخفي', INVISIBLE, '');
  if (o.spaces) {
    rep('مسافة غير عادية', ODD_SPACES, ' ');
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  }
  if (o.quotes) {
    rep('علامة تنصيص', /[“”„«»]/g, '"');
    rep('علامة تنصيص', /[‘’‚]/g, "'");
    rep('شرطة', /[–—−]/g, '-');
    rep('نقاط', /…/g, '...');
  }
  if (o.markdown) {
    rep('رمز Markdown', /^#{1,6}\s+/gm, '');
    rep('رمز Markdown', /(\*\*|__)(.+?)\1/g, '$2');
    rep('رمز Markdown', /`{1,3}/g, '');
    rep('رمز Markdown', /^\s*[-*+]\s+/gm, '• ');
    rep('رمز Markdown', /^\s*>\s?/gm, '');
  }
  if (o.emoji) rep('إيموجي', /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}]/gu, '');
  if (o.tatweel) rep('تطويل', /ـ/g, '');
  return { text: s.trim(), report };
}
$('#c-run').addEventListener('click', () => {
  const o = {}; ['invisible', 'spaces', 'quotes', 'markdown', 'emoji', 'tatweel'].forEach((k) => (o[k] = $('#o-' + k).checked));
  const { text, report } = cleanText($('#c-in').value, o);
  $('#c-out').value = text;
  const parts = Object.entries(report).map(([k, v]) => `${v} ${k}`);
  $('#c-report').textContent = parts.length ? 'تم حذف/تعديل: ' + parts.join('، ') : 'النص نظيف — مفيش حاجة اتشالت';
});
$('#c-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#c-out').value); toast('تم النسخ ✔'); }
  catch { $('#c-out').select(); document.execCommand('copy'); toast('تم النسخ ✔'); }
});

// ---------- النسخ الاحتياطي ----------
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#b-json').addEventListener('click', () => download(`study-backup-${today()}.json`, JSON.stringify(db, null, 2), 'application/json'));
$('#b-csv').addEventListener('click', () => {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['المادة', 'العنوان', 'الدرجة', 'من', 'النسبة', 'التاريخ']]
    .concat(db.grades.map((g) => [courseName(g.courseId), g.title, g.score, g.max, pct(g).toFixed(1), g.date]));
  download(`grades-${today()}.csv`, '﻿' + rows.map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
});
$('#b-import').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.courses) || !Array.isArray(d.grades) || !Array.isArray(d.tasks)) throw 0;
    if (!confirm('استبدال البيانات الحالية بالنسخة المستوردة؟')) return;
    db = d; save(); toast('تم الاستيراد ✔');
  } catch { toast('ملف غير صالح'); }
  e.target.value = '';
});
$('#b-clear').addEventListener('click', () => {
  if (confirm('هيتم مسح كل المواد والدرجات والمهام نهائياً. متأكد؟')) { db = { courses: [], grades: [], tasks: [] }; save(); }
});

render();
