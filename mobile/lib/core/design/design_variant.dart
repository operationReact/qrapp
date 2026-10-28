enum DesignVariant {
  foodPop,
  foodFlow;

  String get storageValue => switch (this) {
        DesignVariant.foodPop => 'food_pop',
        DesignVariant.foodFlow => 'food_flow',
      };

  String get displayName => switch (this) {
        DesignVariant.foodPop => 'Food Pop',
        DesignVariant.foodFlow => 'Food Flow',
      };

  static DesignVariant fromStorage(String? value) => switch (value) {
        'food_flow' => DesignVariant.foodFlow,
        _ => DesignVariant.foodPop,
      };
}
