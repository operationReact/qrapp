import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import { homeCampaignFeedOptions } from "@/query/options/home-campaigns";
import CampaignPresentation from "./CampaignPresentationView";
import { runCampaignAction } from "./campaignActions";

const RAILS = [
  { key: "discovery", label: "Discover more" },
  { key: "promotions", label: "Offers for you" },
];

export default function HomeCampaignRails({ locationId }) {
  const { data } = useQuery(homeCampaignFeedOptions(locationId));
  const hasCampaigns = RAILS.some(({ key }) => (data?.[key] ?? []).length > 0);

  if (!hasCampaigns) return null;

  return (
    <div className="container-premium space-y-5 py-4 lg:space-y-5 lg:py-3">
      {RAILS.map(({ key, label }) => {
        const campaigns = data?.[key] ?? [];
        if (campaigns.length === 0) return null;

        return (
          <section key={key} aria-labelledby={`campaign-rail-${key}`}>
            <h2 id={`campaign-rail-${key}`} className="mb-2 text-lg font-semibold">
              {label}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="h-52 min-w-[min(82vw,320px)] flex-none overflow-hidden rounded-2xl shadow-sm sm:min-w-[280px]"
                >
                  <CampaignPresentation
                    campaign={campaign}
                    className="cursor-pointer"
                    handlers={{
                      openExternal: () => runCampaignAction(campaign),
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

HomeCampaignRails.propTypes = {
  locationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
