const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  await page.setViewport({ width: 390, height: 844 }); // iPhone 12 Pro dimensions

  // Wait a bit for render
  await page.waitForTimeout(2000);

  const exploreTarget = await page.evaluate(() => {
    const el = document.querySelector('button[data-target="explore"]');
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  });

  const blockingElement = await page.evaluate((x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? (el.id || el.className || el.tagName) : null;
  }, exploreTarget.x, exploreTarget.y);

  console.log("Element at explore button's position:", blockingElement);
  
  const homeTarget = await page.evaluate(() => {
    const el = document.querySelector('button[data-target="home"]');
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  });
  
  const blockingElementHome = await page.evaluate((x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? (el.id || el.className || el.tagName) : null;
  }, homeTarget.x, homeTarget.y);
  
  console.log("Element at home button's position:", blockingElementHome);

  await browser.close();
})();
