This module contains a Gradle build for the backend service converted from the existing Maven POM.

Quick start (requires Gradle installed or use the Gradle wrapper if you add it):

1. Build the project:

```powershell
cd C:\Users\venum\IdeaProjects\App\backend
gradle clean build
```

2. If you encounter repository/network issues resolving the Razorpay artifact (com.razorpay:razorpay-java:1.6.0):
- The original pom included an S3 mirror (https://s3.amazonaws.com/razorpay-maven/) which is declared in `build.gradle`.
- If remote repos are blocked, place `razorpay-java-1.6.0.jar` into `backend/lib/` and run:

```powershell
mvn install:install-file -Dfile=backend\lib\razorpay-java-1.6.0.jar -DgroupId=com.razorpay -DartifactId=razorpay-java -Dversion=1.6.0 -Dpackaging=jar
```

Note: The above uses Maven's install-file because installing into the local Maven repository is a common and quick approach even when building with Gradle. Gradle will resolve artifacts from the local Maven repository (~/.m2/repository).

3. To switch to the Maven-Central available version (if acceptable):
 - Change `implementation 'com.razorpay:razorpay-java:1.6.0'` in `build.gradle` to `1.4.8`.

If you want, I can add a Gradle wrapper and CI config so Gradle is runnable without requiring a system Gradle installation.

