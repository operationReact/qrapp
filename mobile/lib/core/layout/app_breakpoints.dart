enum AppLayoutClass { compact, medium, expanded, wide }

abstract final class AppBreakpoints {
  static const double medium = 600;
  static const double expanded = 1024;
  static const double wide = 1440;

  static AppLayoutClass classify(double width) {
    if (width >= wide) return AppLayoutClass.wide;
    if (width >= expanded) return AppLayoutClass.expanded;
    if (width >= medium) return AppLayoutClass.medium;
    return AppLayoutClass.compact;
  }
}
