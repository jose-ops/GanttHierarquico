/* ============== HELPERS Das DATA ============== */
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmt(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function dayDiff(a, b) {
  return Math.round((b - a) / 86400000);
}


function getRange() {
  let min = null, max = null;

  tasks.forEach(t => {
    const s = parseDate(t.start), e = parseDate(t.end);
    if (!min || s < min) min = s;
    if (!max || e > max) max = e;
  });

  min = addMonths(min, -2);
  max = addMonths(max, 2);

  return { min, max };
}



