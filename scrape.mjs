// اختبار واحد: هل تستطيع خوادم GitHub قراءة Meta Ad Library؟
import { chromium } from 'playwright';
import fs from 'fs';

const TESTS = [
  { c: 'DZ', q: 'الدفع عند الاستلام' },
  { c: 'DZ', q: 'paiement à la livraison' },
  { c: 'SA', q: 'الدفع عند الاستلام' },
];
const ID = /(Library ID|معرّف المكتبة|معرف المكتبة)/g;

fs.mkdirSync('out', { recursive: true });
const browser = await chromium.launch();
const results = [];

for (const [i, t] of TESTS.entries()) {
  const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${t.c}&q=${encodeURIComponent(t.q)}&search_type=keyword_unordered&media_type=all`;
  const r = { ...t, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    r.status = resp && resp.status();
    await page.waitForTimeout(8000);
    for (const name of [/allow all cookies/i, /السماح بجميع/, /decline optional cookies/i, /رفض ملفات/]) {
      const b = page.getByRole('button', { name }).first();
      if (await b.count()) { await b.click({ timeout: 3000 }).catch(() => {}); break; }
    }
    for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(2500); }
    const text = await page.evaluate(() => document.body.innerText);
    r.cards = (text.match(ID) || []).length;
    r.textLen = text.length;
    r.loginWall = r.cards === 0 && /log in|sign up|تسجيل الدخول/i.test(text.slice(0, 3000));
    r.blocked = /temporarily blocked|rate limit|تم حظرك مؤقتا/i.test(text);
    r.title = await page.title();
    r.ok = r.cards > 0;
    await page.screenshot({ path: `out/shot-${i}.png` });
  } catch (e) {
    r.error = String(e).slice(0, 300);
  }
  results.push(r);
  console.log(JSON.stringify(r));
  await ctx.close();
  await new Promise(res => setTimeout(res, 5000 + Math.random() * 5000));
}

await browser.close();
fs.writeFileSync('out/result.json', JSON.stringify(results, null, 2));
console.log(results.every(r => r.ok) ? 'RESULT: كل الاختبارات نجحت' : 'RESULT: فشل واحد أو أكثر، راجع result.json');
