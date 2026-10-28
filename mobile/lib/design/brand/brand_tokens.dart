import 'package:flutter/material.dart';

/// Immutable Bro & Bro brand primitives shared by every experience.
///
/// Exact production values must be populated only from audited/approved brand
/// sources. Experience themes consume this contract rather than replacing the
/// brand palette with arbitrary values.
@immutable
class BrandTokens {
  const BrandTokens({
    required this.primary,
    required this.onPrimary,
    required this.secondary,
    required this.onSecondary,
    required this.logoAsset,
    required this.wordmarkAsset,
  });

  final Color primary;
  final Color onPrimary;
  final Color secondary;
  final Color onSecondary;
  final String logoAsset;
  final String wordmarkAsset;
}

/// Temporary wiring boundary. Do not guess production colors/assets here.
/// Replace these values only after the brand audit identifies approved source
/// assets/tokens.
abstract final class BroBrand {
  static const BrandTokens pendingAudit = BrandTokens(
    primary: Color(0xFF000000),
    onPrimary: Color(0xFFFFFFFF),
    secondary: Color(0xFFFFFFFF),
    onSecondary: Color(0xFF000000),
    logoAsset: '',
    wordmarkAsset: '',
  );
}
