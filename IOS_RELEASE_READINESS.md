# Bro & Bro — iOS Release Readiness

This checklist separates repository work from Apple-account/device work so release progress is explicit.

## Repository gates — automated

- [x] Capacitor app ID pinned to `in.broandbro.app`
- [x] Capacitor 8.6.0 packages pinned consistently
- [x] Production web bundle generated before iOS sync/build
- [x] iOS privacy purpose strings injected for location and photo-library usage
- [x] Capacitor SDK privacy manifest verified during CI
- [x] Required app/PWA icon source assets checked during CI
- [x] Mobile viewport and Apple web-app metadata checked during CI
- [x] Android + iOS software-keyboard hardening implemented
- [x] 44pt iOS touch-target hardening implemented
- [x] Safe-area / notch / home-indicator hardening implemented
- [x] Same-origin links remain in native shell where appropriate
- [x] Account deletion flow exists in-app
- [x] Hall of Happiness has a customer report-content path
- [x] Unsigned iOS Simulator build remains part of CI
- [x] CI rejects Xcode older than the current App Store baseline (Xcode 26)

## Apple-account gates — cannot be completed from repository alone

- [ ] Apple Developer Program membership active
- [ ] App ID registered for `in.broandbro.app`
- [ ] Apple Developer Team ID recorded
- [ ] Xcode Signing & Capabilities configured for the owning team
- [ ] Distribution certificate/provisioning managed in Apple Developer/Xcode
- [ ] App Store Connect application record created
- [ ] App privacy questionnaire completed from actual production data practices
- [ ] Updated App Store age-rating questionnaire completed

Do not commit Apple passwords, certificates, `.p12` files, provisioning profiles, or App Store Connect private keys.

## Universal Links gates

After the Apple Team ID is available:

- [ ] Add Associated Domains capability
- [ ] Add `applinks:broandbro.in`
- [ ] Add `applinks:www.broandbro.in`
- [ ] Publish `/.well-known/apple-app-site-association` with `<TEAM_ID>.in.broandbro.app`
- [ ] Verify the AASA endpoint returns HTTPS 200 directly with no redirect
- [ ] Validate links on a signed real-device build

## Real-device acceptance gates

Run on at least one current iPhone before App Review:

- [ ] cold launch / relaunch / background / foreground
- [ ] login / logout
- [ ] registration + OTP + OTP autofill
- [ ] password reset/change + password-manager behavior
- [ ] keyboard does not cover focused fields, dialogs, checkout, or form actions
- [ ] phone fields show telephone keypad; OTP shows numeric keypad
- [ ] location permission allow / deny / manual-location fallback
- [ ] home/search/menu navigation
- [ ] cart add/update/remove
- [ ] checkout validation
- [ ] Razorpay handoff and successful return/cancel path
- [ ] wallet/payment alternatives
- [ ] order history and order tracking
- [ ] profile update
- [ ] account deletion
- [ ] Hall of Happiness upload/report flow
- [ ] external links and legal pages
- [ ] offline/slow-network/API-error states
- [ ] Dynamic Island/notch/home-indicator safe areas
- [ ] rotation/orientation behavior if supported

## App Review package

- [ ] permanent reviewer test account prepared
- [ ] reviewer can access meaningful app functionality without employee-only setup
- [ ] App Review Notes explain that payments are for physical food/services
- [ ] privacy-policy URL supplied
- [ ] support URL supplied
- [ ] app description/subtitle/keywords finalized
- [ ] App Store screenshots captured from the final signed build
- [ ] app icon verified in the generated Xcode asset catalog

## Final submission sequence

1. Generate/sync iOS project from the release commit.
2. Open in Xcode and select the correct Apple team.
3. Run the real-device acceptance checklist.
4. Archive the Release build.
5. Run Xcode Validate App and review privacy/signing warnings.
6. Upload to App Store Connect/TestFlight.
7. Complete one TestFlight acceptance pass.
8. Attach the tested build to the App Store version.
9. Complete metadata/privacy/age-rating/reviewer-account fields.
10. Submit for App Review.

A successful repository CI run is necessary but is not equivalent to App Store approval. Apple reviews the final signed binary and App Store Connect configuration.
