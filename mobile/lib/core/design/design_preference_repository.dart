import 'package:shared_preferences/shared_preferences.dart';

import 'design_variant.dart';

abstract interface class DesignPreferenceRepository {
  Future<DesignVariant> load();
  Future<void> save(DesignVariant variant);
}

final class LocalDesignPreferenceRepository
    implements DesignPreferenceRepository {
  LocalDesignPreferenceRepository(this._preferences);

  static const _key = 'bro_and_bro.design_variant';
  final SharedPreferences _preferences;

  @override
  Future<DesignVariant> load() async =>
      DesignVariant.fromStorage(_preferences.getString(_key));

  @override
  Future<void> save(DesignVariant variant) async {
    await _preferences.setString(_key, variant.storageValue);
  }
}
