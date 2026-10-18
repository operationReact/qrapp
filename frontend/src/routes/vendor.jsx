import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ReceiptText, UserRound } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { ROLE } from "@/lib/roles";
import "../styles/vendor-portal.css";

export const Route = createFileRoute("/vendor")({
  component: () => <RoleGuard roles={[ROLE.VENDOR]}><VendorLayout /></RoleGuard>,
});

const navigation = [
  { to: "/vendor", label: "Bills", icon: ReceiptText, exact: true },
  { to: "/vendor/profile", label: "Profile", icon: UserRound },
];

function VendorLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const current = pathname.replace(/\/+$/, "") || "/";

  return (
    <div className="vp-page">
      <nav className="vp-nav" aria-label="Vendor navigation">
        <div className="vp-nav__top">
          <div className="vp-nav__brand">
            <img src="/bro-logo.png" alt="Bro & Bro" className="vp-nav__logo" />
            <span className="vp-nav__who">{user?.name || "Vendor"}</span>
          </div>
        </div>
        <div className="vp-nav__links">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? current === item.to : current === item.to || current.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`vp-nav__link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
