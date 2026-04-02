Migration to Gradle - Next Steps

Summary of changes applied automatically:

- Root `settings.gradle` updated and now authoritative for the multi-project build.
- Added root `build.gradle` with common repository and Java settings for subprojects.
- `backend/settings.gradle` replaced with a no-op placeholder so it no longer conflicts.
- `backend/build.gradle` (existing) remains the canonical Gradle build for the backend module.
- `backend/pom.xml` replaced by a minimal placeholder to avoid accidental Maven builds; the true build is Gradle-based now.
- `backend/mvnw` and `backend/mvnw.cmd` replaced with small stubs that delegate to Gradle wrapper if present or print instructions.

What you should do locally to complete the migration (required):

1) Generate the Gradle wrapper (if you have Gradle installed):

   Open PowerShell in the repository root (C:\Users\venum\IdeaProjects\App) and run:

   gradle wrapper --gradle-version 8.6

   This will create `gradlew`, `gradlew.bat` and the `gradle/wrapper` directory. If you do not have Gradle installed, install it or run it on a machine/CI agent that does.

2) Build and verify the project using the wrapper:

   On Windows PowerShell:

   .\gradlew.bat :backend:bootJar
   .\gradlew.bat :backend:test

   Or on Unix:

   ./gradlew :backend:bootJar
   ./gradlew :backend:test

3) Update CI and developer workflows to use Gradle commands (replace `mvn ...` with `./gradlew ...` / `gradle ...`).

4) (Optional) Remove Maven artifacts from the repository once you are confident the Gradle build works:
   - Delete `backend/pom.xml` (we replaced it with a placeholder; you may delete it entirely if desired)
   - Delete `backend/mvnw`, `backend/mvnw.cmd`, and the `.mvn/` directory

5) IDE integration:
   - In IntelliJ IDEA: Import the project as a Gradle project (or "Refresh Gradle" in the Gradle tool window). Remove any lingering Maven project roots from the IDE settings.

6) Vendor JAR / air-gapped builds (Razorpay vendor JAR):
   - If your CI relied on the POM profile to install a local JAR (see the previous `install-razorpay-jar` profile), you can implement the same in Gradle using `gradle.properties` flags and a small `init` task that installs the JAR to the local Maven repository, or publish the JAR to your internal repository.

Notes and rationale:
- I kept `backend/build.gradle` intact (it already contained the Spring Boot Gradle plugin and dependencies). The root `build.gradle` centralizes repositories and shared settings.
- I replaced Maven wrapper scripts with small stubs that delegate to `gradlew` if present; they provide a helpful message otherwise.
- I left the original files in place as placeholders so you can review and remove them once Gradle is confirmed working.

If you want, I can attempt to generate the Gradle wrapper here, but that requires the `gradle` CLI to be present in this environment. If you'd like, I can also add a Gradle task that mirrors the Maven `install-file` behavior used previously to install a vendor JAR into the local repo.

If you'd like me to proceed with generating the wrapper (or adding a vendor-JAR-install task), confirm and I'll attempt it now and report back.

