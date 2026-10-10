import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../routes/partner.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/partner-header-branding.css", import.meta.url), "utf8");
const shell = source.slice(source.indexOf("function PartnerShell()"), source.indexOf("function SidebarGroup"));
const sidebar = shell.slice(shell.indexOf('<aside className="partner-sidebar">'), shell.indexOf('<div className="partner-main">'));
const header = source.slice(source.indexOf("function PartnerHeaderBranding"), source.indexOf("function SidebarGroup"));

test("PartnerShell renders one Bro logo per branding surface", () => {
  assert.equal((sidebar.match(/src="\/bro-logo\.png"/g) || []).length, 1);
  assert.equal((header.match(/src="\/bro-logo\.png"/g) || []).length, 1);
  assert.equal((header.match(/className="partner-header-partner-logo"/g) || []).length, 1);
  assert.equal((header.match(/partner-header-logo-sweep/g) || []).length, 0);
  assert.equal((header.match(/className="partner-header-logo-frame"/g) || []).length, 2);
  assert.match(shell, /key=\{partner\.id \|\| partner\.partnerCode\}/);
  assert.doesNotMatch(shell, /selectedLocationId.*key/);
  assert.equal((styles.match(/animation: partner-header-logo-in 700ms ease-in-out both/g) || []).length, 1);
  assert.equal((styles.match(/animation: partner-header-logo-sweep 700ms ease-in-out 80ms both/g) || []).length, 1);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
