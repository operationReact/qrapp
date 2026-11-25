import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.SCREENSHOT_DIR;
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4173";
assert(out, "SCREENSHOT_DIR required");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[320,568],[360,800],[390,844],[412,915],[768,1024],[1440,900]]) {
    const context = await browser.newContext({
      viewport: {width,height}, deviceScaleFactor: 1,
      locale: "en-IN", timezoneId: "Asia/Kolkata", colorScheme: "light",
      serviceWorkers: "block", reducedMotion: "reduce"
    });
    try {
      await context.route("https://api.broandbro.in/**", async route => {
        const path = new URL(route.request().url()).pathname;
        const data = path === "/api/locations/public"
          ? [{id:1,name:"Meenakshi Towers",active:true},{id:2,name:"Mindspace",active:true}]
          : path === "/api/locations/1/customer-companies"
            ? [{id:10,name:"Example Company",active:true}]
            : path === "/api/locations/2/customer-companies"
              ? [{id:20,name:"Other Company",active:true}] : [];
        await route.fulfill({json:data,headers:{"access-control-allow-origin":"*"}});
      });
      const page = await context.newPage();
      const prefix = width + "x" + height;
      async function capture(name) {
        await page.evaluate(() => document.fonts.ready);
        await page.locator("body").evaluate(el => {
          if (el.scrollWidth > window.innerWidth + 1 || document.documentElement.scrollWidth > window.innerWidth + 1)
            throw new Error("Horizontal layout overflow");
        });
        await page.screenshot({path: out + "/" + prefix + "-" + name + ".png", fullPage:true, animations:"disabled", caret:"hide"});
      }
      await page.goto(origin + "/login");
      await page.getByRole("heading",{name:"Welcome back",exact:true}).waitFor();
      await page.getByRole("button",{name:"Sign In",exact:true}).waitFor();
      await page.getByPlaceholder("10-digit mobile number").waitFor();
      await capture("login");
      await page.goto(origin + "/register");
      await page.getByRole("heading",{name:"Find your food court"}).waitFor();
      const location = page.getByPlaceholder("Choose a location");
      await location.waitFor();
      await capture("registration-location");
      await location.click();
      await page.getByRole("option",{name:"Meenakshi Towers",exact:true}).click();
      const company = page.getByPlaceholder("Search Customer Company");
      await company.click();
      await page.getByRole("option",{name:"Example Company",exact:true}).waitFor();
      await capture("registration-company-dropdown");
      await page.getByRole("option",{name:"Example Company",exact:true}).click();
      await page.getByRole("button",{name:"Continue",exact:true}).click();
      await page.getByRole("heading",{name:"Create your account",exact:true}).waitFor();
      await page.getByPlaceholder("Your Name").waitFor();
      await capture("registration-details");
      await page.getByRole("button",{name:/Celebrate with Bro & Bro/}).click();
      await capture("registration-optional-dates");
      console.log("Auth layout checks and screenshots: " + prefix);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
