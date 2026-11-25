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
      await context.route("https://accounts.google.com/gsi/client", route => route.fulfill({
        contentType:"application/javascript",
        body:`window.google={accounts:{id:{initialize(config){window.__googleConfig=config},renderButton(host){const button=document.createElement("button");button.type="button";button.textContent="Continue with Google";button.style.cssText="background:white;color:#333;border:1px solid #dadce0;border-radius:4px;width:100%;height:40px;font:500 14px Arial";button.onclick=()=>window.__googleConfig.callback({credential:"fixture-not-a-real-token"});host.append(button)}}}}`
      }));
      await context.route("https://api.broandbro.in/**", async route => {
        const path = new URL(route.request().url()).pathname;
        const cors = {"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"*"};
        if (route.request().method() === "OPTIONS") return route.fulfill({status:204,headers:cors});
        const data = path === "/auth/me" ? {id:500,role:"CUSTOMER",name:"Visual Customer",phone:"+919876543210",defaultLocation:null,customerCompany:null}
          : path === "/auth/google/challenge"
          ? {enabled:true,clientId:"visual-fixture.apps.googleusercontent.com",nonce:"fixture"}
          : path === "/auth/google/exchange"
            ? {status:"mobile_verification_required",ticket:"visual-test-ticket",name:"Visual Customer"}
          : path === "/auth/login/request-otp" ? {success:true,message:"Code sent"}
          : path === "/api/locations/public"
          ? [{id:1,name:"Meenakshi Towers",active:true},{id:2,name:"Mindspace",active:true}]
          : path === "/api/locations/1/customer-companies"
            ? [{id:10,name:"Example Company",active:true}]
            : path === "/api/locations/2/customer-companies"
              ? [{id:20,name:"Other Company",active:true}] : [];
        await route.fulfill({json:data,headers:cors});
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
      const passwordButton = page.getByRole("button",{name:"Sign In",exact:true});
      await passwordButton.waitFor();
      if (process.env.EXPECT_NEW_AUTH === "1") {
        await page.getByRole("button",{name:"Continue with Google",exact:true}).waitFor();
        await capture("login-password-google");
        assert.equal(await page.getByRole("button",{name:"Continue with WhatsApp",exact:true}).count(),0,"Standalone OTP sign-in must be absent");
        await page.getByRole("button",{name:"Continue with Google",exact:true}).click();
        await page.getByText(/Verify your WhatsApp number to connect/).waitFor();
        await capture("login-google-link");
        await page.getByPlaceholder("10-digit mobile number").fill("9876543210");
        await page.getByRole("button",{name:"Verify WhatsApp number",exact:true}).click();
        await page.getByRole("dialog").waitFor();
        await capture("login-otp-dialog");
        await page.getByRole("button",{name:/Edit Account/}).click();
        await page.getByRole("dialog").waitFor({state:"hidden"});
        await page.getByRole("button",{name:"Back to password sign-in",exact:true}).click();
        await page.getByPlaceholder("10-digit mobile number").fill("");
      }
      await passwordButton.waitFor();
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
      if (process.env.EXPECT_NEW_AUTH === "1") {
        await page.evaluate(() => localStorage.setItem("user",JSON.stringify({id:500,role:"CUSTOMER",token:"visual-fixture-token",name:"Visual Customer"})));
        await page.reload();
        await page.getByRole("heading",{name:"Complete your profile"}).waitFor();
        await page.locator("#required-location").selectOption("1");
        await page.locator("#required-company").selectOption("10");
        await capture("required-workplace-profile");
        await page.locator("#required-location").selectOption("2");
        await page.locator("#required-company").locator('option[value="20"]').waitFor({state:"attached"});
        assert.equal(await page.locator("#required-company").inputValue(),"","Changing location must clear company");
      }
      console.log("Auth layout checks and screenshots: " + prefix);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
