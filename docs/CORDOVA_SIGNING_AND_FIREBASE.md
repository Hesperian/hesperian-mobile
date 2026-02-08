# Cordova Signing and Firebase Configuration

Each app's `cordova/private/` directory contains secrets required for building. These files are not checked in to git.

* `android.keystore` - keystore for signing the Android build (shared across apps)
* `google-services.json` - Google Firebase Analytics for Android
* `GoogleService-Info.plist` - Google Firebase Analytics for iOS

## Android Keystore

The `android.keystore` is a Java KeyStore file containing the private key used to sign Android app bundles (AAB) and APKs. **The same keystore is shared across all Hesperian apps** — each app's `cordova/private/` directory contains a copy of it.

### What it does

Google Play requires that every update to an app be signed with the same key as the original upload. The keystore proves you are the legitimate publisher. The build process uses it automatically:

- `build.json` points to `./private/android.keystore` with key alias `SA-en`
- The passphrase is injected at build time from 1Password via `op run`
- Both `--password` (keystore) and `--storePassword` (key) use the same `CORDOVA_SIGNING_PASSPHRASE`

### If the keystore is lost

**This would be a serious problem.** Without the original keystore:

- You **cannot publish updates** to existing apps on Google Play — Google rejects uploads signed with a different key
- You would need to create a **new app listing** with a new package name, losing all existing installs, ratings, and reviews
- The only mitigation is if you previously enrolled in [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756), which stores a copy of your upload key on Google's servers and allows key reset

### Best practices

- **Back up the keystore** securely (e.g. in 1Password or a secure vault) — it is irreplaceable
- **Never commit it to git** — it is in `.gitignore`
- The passphrase is stored in 1Password at `Shared/HesperianAppBuild/CORDOVA_SIGNING_PASSPHRASE`

## Firebase Configuration Files

Each app requires its own Firebase config files with matching package/bundle identifiers.

### How to obtain

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select (or create) the project for your app (check `firebaseConfig.projectId` in `app-config.json`)
3. Add platforms if not already registered:
   - **Android**: use the `android-packageName` from `app-config.json` (e.g. `org.hesperian.SafePregnancyAndBirth`)
   - **iOS**: use the `id` from `app-config.json` (e.g. `org.hesperian.Safe-Pregnancy-and-Birth`)
4. Download the config files and place them in `cordova/private/`

### Package name matching

The package names in these files **must exactly match** the identifiers in `app-config.json`:

- `google-services.json` → `client[].client_info.android_client_info.package_name` must match `android-packageName`
- `GoogleService-Info.plist` → `BUNDLE_ID` must match `id`

A mismatch will cause the Android build to fail at the `processReleaseGoogleServices` Gradle task, or iOS Firebase Analytics to not initialize.

### Troubleshooting

If you see this build error:
```
No matching client found for package name 'org.hesperian.X' in google-services.json
```
The `google-services.json` was generated for a different app. Download the correct one from Firebase Console for your app's `android-packageName`.
