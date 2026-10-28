import 'package:bro_and_bro/core/layout/app_breakpoints.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('classifies representative product widths', () {
    expect(AppBreakpoints.classify(320), AppLayoutClass.compact);
    expect(AppBreakpoints.classify(375), AppLayoutClass.compact);
    expect(AppBreakpoints.classify(411), AppLayoutClass.compact);
    expect(AppBreakpoints.classify(768), AppLayoutClass.medium);
    expect(AppBreakpoints.classify(1024), AppLayoutClass.expanded);
    expect(AppBreakpoints.classify(1440), AppLayoutClass.wide);
  });
}
