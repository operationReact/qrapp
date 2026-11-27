# TWA wrapper keeps the default optimized Android build rules.

# Keep Android Browser Helper TWA entry points. These are referenced from the
# manifest / Custom Tabs service binding and must survive R8 shrinking.
-keep class com.google.androidbrowserhelper.** { *; }
-keep class androidx.browser.** { *; }
-dontwarn com.google.androidbrowserhelper.**
