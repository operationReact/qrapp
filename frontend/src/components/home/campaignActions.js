/**
 * Generic Home-campaign CTA dispatch. Branches ONLY on the campaign's
 * `targetType` enum (never on title/id/content) so new campaigns created in
 * the admin console never require a frontend code change.
 */
export function runCampaignAction(campaign, handlers = {}) {
  if (!campaign) return;
  switch (campaign.targetType) {
    case "CATEGORY":
      if (campaign.targetId) {
        // Matches the existing hash-based category navigation used across
        // the Home page (see CategoryTabs / section ids).
        window.location.hash = campaign.targetId;
      }
      return;
    case "PARTY_ORDER":
      handlers.openPartyOrder?.();
      return;
    case "COMBO":
      if (campaign.targetId === "byoc") handlers.openByoc?.();
      else handlers.openCombos?.();
      return;
    case "EXTERNAL":
      if (campaign.targetId) {
        window.open(campaign.targetId, "_blank", "noopener,noreferrer");
      }
      return;
    case "MENU_ITEM":
    case "CAMPAIGN":
    case "NONE":
    default:
      return;
  }
}

/** True when a campaign has any actionable CTA (used to decide pointer/role semantics). */
export function isCampaignActionable(campaign) {
  return Boolean(campaign?.targetType && campaign.targetType !== "NONE");
}
