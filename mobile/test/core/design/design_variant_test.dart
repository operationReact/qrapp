import 'package:bro_and_bro/core/design/design_variant.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DesignVariant', () {
    test('serializes stable persisted values', () {
      expect(DesignVariant.foodPop.storageValue, 'food_pop');
      expect(DesignVariant.foodFlow.storageValue, 'food_flow');
    });

    test('restores Food Flow', () {
      expect(
        DesignVariant.fromStorage('food_flow'),
        DesignVariant.foodFlow,
      );
    });

    test('uses Food Pop as safe default for absent or unknown preference', () {
      expect(DesignVariant.fromStorage(null), DesignVariant.foodPop);
      expect(DesignVariant.fromStorage('unknown'), DesignVariant.foodPop);
    });
  });
}
