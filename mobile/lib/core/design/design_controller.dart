import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'design_preference_repository.dart';
import 'design_variant.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden at bootstrap.');
});

final designPreferenceRepositoryProvider = Provider<DesignPreferenceRepository>(
  (ref) => LocalDesignPreferenceRepository(ref.watch(sharedPreferencesProvider)),
);

final designControllerProvider =
    AsyncNotifierProvider<DesignController, DesignVariant>(DesignController.new);

final class DesignController extends AsyncNotifier<DesignVariant> {
  DesignPreferenceRepository get _repository =>
      ref.read(designPreferenceRepositoryProvider);

  @override
  Future<DesignVariant> build() => _repository.load();

  Future<void> select(DesignVariant variant) async {
    final previous = state.valueOrNull;
    state = AsyncData(variant);
    try {
      await _repository.save(variant);
    } catch (error, stackTrace) {
      if (previous != null) state = AsyncData(previous);
      Error.throwWithStackTrace(error, stackTrace);
    }
  }
}
