import 'package:flutter/material.dart';

import '../../features/appearance/domain/design_variant.dart';

@immutable
class ExperienceTokens {
  const ExperienceTokens({
    required this.variant,
    required this.cardRadius,
    required this.sectionGap,
    required this.contentDensity,
    required this.heroEmphasis,
    required this.motionScale,
  });

  final DesignVariant variant;
  final double cardRadius;
  final double sectionGap;
  final VisualDensity contentDensity;
  final double heroEmphasis;
  final double motionScale;
}

abstract final class ExperienceTokenRegistry {
  static const foodPop = ExperienceTokens(
    variant: DesignVariant.foodPop,
    cardRadius: 20,
    sectionGap: 20,
    contentDensity: VisualDensity.standard,
    heroEmphasis: 1.0,
    motionScale: 1.0,
  );

  static const foodFlow = ExperienceTokens(
    variant: DesignVariant.foodFlow,
    cardRadius: 12,
    sectionGap: 14,
    contentDensity: VisualDensity.compact,
    heroEmphasis: 0.72,
    motionScale: 0.75,
  );

  static ExperienceTokens forVariant(DesignVariant variant) => switch (variant) {
        DesignVariant.foodPop => foodPop,
        DesignVariant.foodFlow => foodFlow,
      };
}
