import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4173";
const out = process.env.SCREENSHOT_DIR;
const baseline = process.env.BASELINE === "1";
assert(out);
await mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true});
const locations=[{id:1,name:"Meenakshi Towers",active:true},{id:2,name:"Mindspace — Long Corporate Campus Location",active:true}];
const dashboard={totalOrders:8,placedOrders:2,delayedOrders:1,liveOrders:3,liveOrdersQueue:[],attentionOrders:[]};
const viewports=[[320,568],[360,800],[390,844],[412,915],[768,1024],[1024,768],[1440,900],[1920,1080]];
async function fixture(width,height,role="SUPER_ADMIN") {
  const profile={id:901,name:"Sample Administrator With A Long Name",role,isAdmin:role==="ADMIN",isSuperUser:role==="SUPER_ADMIN",locations,defaultLocation:locations[0]};
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:"en-IN",timezoneId:"Asia/Kolkata",reducedMotion:"reduce",serviceWorkers:"block"});
  await context.addInitScript(({profile,location})=>{
    localStorage.setItem("user",JSON.stringify({...profile,info:profile,token:"fixture-not-a-real-token"}));
    localStorage.setItem("active-location",JSON.stringify(location));
  },{profile,location:locations[0]});
  await context.route("https://api.broandbro.in/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    const headers={"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, PUT, PATCH, DELETE, OPTIONS","access-control-allow-headers":"*"};
    if(route.request().method()==="OPTIONS") return route.fulfill({status:204,headers});
    const json=path==="/auth/me"?profile:
      path.startsWith("/api/locations")?locations:
      path==="/admin/orders/dashboard"?dashboard:
      path==="/admin/orders"?{content:[],totalPages:0,totalElements:0,number:0}:
      path.includes("inventory")?{content:[],totalElements:0}:[];
    await route.fulfill({json,headers});
  });
  return context;
}
async function openSidebar(page,width) {
  await page.goto(origin+"/admin");
  if(width<1024) {
    await page.getByRole("button",{name:"Open admin menu",exact:true}).first().click();
  }
  const nav=page.getByRole("navigation",{name:"Admin navigation",exact:true});
  await nav.waitFor();
  return nav;
}
async function expand(nav,label) {
  const button=nav.getByRole("button",{name:new RegExp(label,"i")}).first();
  if(await button.count() && await button.getAttribute("aria-expanded")==="false") await button.click();
}
try {
  for(const [width,height] of viewports) {
    const context=await fixture(width,height);
    try {
      const page=await context.newPage();
      const nav=await openSidebar(page,width);
      await expand(nav,"Workspace");
      await expand(nav,"Menu Management");
      await nav.getByRole("link",{name:"Menu Items",exact:true}).waitFor();
      const shell=page.locator(baseline?".admin-sidebar-shell:visible":".bb-compact-admin-sidebar:visible").first();
      await shell.waitFor();
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:out+"/"+width+"x"+height+"-sidebar.png",animations:"disabled"});
      if(baseline) continue;
      assert.equal(await nav.getByRole("link",{name:"Dashboard",exact:true}).count(),1);
      assert.equal(await nav.getByRole("link",{name:"Dashboard",exact:true}).getAttribute("aria-current"),"page");
      assert.equal(await nav.getByText(/^[0-9]+ pages?$/).count(),0);
      const dims=await shell.evaluate(el=>{
        const nav=el.querySelector(".bb-admin-nav-scroll"), header=el.querySelector(".bb-admin-header"), footer=el.querySelector(".bb-admin-footer");
        return {width:el.getBoundingClientRect().width,scrollWidth:nav.scrollWidth,clientWidth:nav.clientWidth,header:header.getBoundingClientRect().height,footer:footer.getBoundingClientRect().height,footerBottom:footer.getBoundingClientRect().bottom,windowHeight:window.innerHeight};
      });
      assert(dims.scrollWidth<=dims.clientWidth+1,"Navigation overflows horizontally");
      assert(dims.header<=170 && dims.footer<=100,"Header or footer too tall");
      assert(dims.footerBottom<=dims.windowHeight+1,"Footer outside viewport");
      if(width<1024) {
        assert(dims.width<=320.5 && dims.width<=width-23,"Mobile width");
        const selector=shell.getByRole("button",{name:/Select location, currently/});
        await selector.click();
        await shell.getByRole("button",{name:/Mindspace/}).click();
        await selector.getByText(/Mindspace/).waitFor();
        await selector.click();
        await page.screenshot({path:out+"/"+width+"x"+height+"-locations.png",animations:"disabled"});
        await page.keyboard.press("Escape");
        assert.equal(await selector.getAttribute("aria-expanded"),"false");
      }
      await expand(nav,"Operations");
      await nav.getByRole("link",{name:"Kitchen Queue",exact:true}).scrollIntoViewIfNeeded();
      await shell.getByRole("button",{name:"Sign Out",exact:true}).waitFor();
      await page.screenshot({path:out+"/"+width+"x"+height+"-scroll.png",animations:"disabled"});
      if(width<1024) {
        await shell.getByRole("button",{name:"Close admin menu",exact:true}).click();
        await shell.waitFor({state:"hidden"});
      } else {
        await shell.getByRole("button",{name:"Collapse or expand navigation",exact:true}).click();
        await page.waitForTimeout(250);
        await nav.getByRole("link",{name:"Dashboard",exact:true}).waitFor();
        await nav.getByRole("link",{name:"Settings",exact:true}).waitFor();
        await page.screenshot({path:out+"/"+width+"x"+height+"-collapsed.png",animations:"disabled"});
      }
      console.log("Sidebar layout and interaction passed: "+width+"x"+height);
    } finally { await context.close(); }
  }
  if(!baseline) {
    // Non-super-admin cannot select aggregate scope. Route has existing permission checks.
    const context=await fixture(412,915,"ADMIN");
    try {
      const page=await context.newPage();
      await page.goto(origin+"/admin/menu");
      await page.getByRole("button",{name:"Toggle navigation",exact:true}).first().click();
      const shell=page.locator(".bb-compact-admin-sidebar:visible").first();
      await shell.getByRole("button",{name:/Select location, currently/}).click();
      assert.equal(await shell.getByRole("button",{name:"All Locations",exact:true}).count(),0);
      assert.equal(await shell.getByRole("link",{name:"Dashboard",exact:true}).count(),0);
      console.log("Admin role-scoped navigation and location check passed");
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
