// Writes an HTML string containing an <svg> to a temp file, then screenshots
// just that <svg> element at 2x scale (sharp enough for a printed report).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

module.exports = async function render(html, outPath) {
  const tmpHtml = outPath.replace(/\.png$/, ".html");
  fs.writeFileSync(tmpHtml, html, "utf-8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto("file://" + path.resolve(tmpHtml));
  await page.waitForTimeout(100);
  const el = await page.$("svg");
  await el.screenshot({ path: outPath });
  await browser.close();
  console.log("rendered", outPath);
};
