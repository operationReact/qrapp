const partnerLogoByCode = {
  URBANWRK: "/assets/partners/urban-work-logo.png",
};

export function getPartnerLogoUrl(partner) {
  return partnerLogoByCode[partner?.partnerCode] || partner?.logoUrl || null;
}

export function getPartnerDisplayName(partner) {
  if (partner?.partnerCode === "URBANWRK") return "UrbanWrk";
  return partner?.displayName || "Partner";
}

export function getPartnerGreeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date));

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getTimeUntilNextGreetingBoundary(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const currentMinutes = values.hour * 60 + values.minute;
  const nextBoundaryMinutes = currentMinutes < 12 * 60
    ? 12 * 60
    : currentMinutes < 17 * 60 ? 17 * 60 : 24 * 60;
  const delay = ((nextBoundaryMinutes - currentMinutes) * 60 - values.second) * 1000 - date.getMilliseconds();
  return Math.max(delay, 1000);
}
