import { Link } from "@tanstack/react-router";
import { MapPinIcon, ArrowRightIcon } from "@phosphor-icons/react";
import "../../styles/guest-order-notice.css";
import "../../styles/home-desktop-align.css";
import "../../styles/premium-revamp.css";

export default function GuestOrderNotice({ locationId, locationName }) {
  const name = locationName || "this food court";

  return (
    <section className="guest-notice home-desktop-align" aria-label="Sign in to place your order">
      <div className="guest-notice__inner">
        <div className="guest-notice__copy">
          <span className="guest-notice__chip">
            <MapPinIcon size={14} weight="fill" aria-hidden="true" />
            Ordering from
          </span>
          <h2 className="guest-notice__title">{name}</h2>
          <p className="guest-notice__text">
            Sign in or create an account to place your order.
          </p>
        </div>
        <div className="guest-notice__actions">
          <Link to="/login" className="guest-notice__btn guest-notice__btn--primary">
            Sign in
            <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
          </Link>
          <Link
            to="/register"
            search={locationId ? { location: locationId } : undefined}
            className="guest-notice__btn guest-notice__btn--ghost"
          >
            Create account
          </Link>
        </div>
      </div>
    </section>
  );
}
