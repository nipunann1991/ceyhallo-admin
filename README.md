# CeyHallo Admin

Admin dashboard for managing businesses, jobs, banners, offers, events, news, notifications, emails, media, and settings for the CeyHallo mobile app.

Mobile app links:

- Android: [Google Play](https://play.google.com/store/apps/details?id=com.ceyhallo.app)
- iOS: [App Store](https://apps.apple.com/ie/app/ceyhallo/id6760931635)

## Version

- `0.0.0`

## Tech Stack

- Angular 21
- TypeScript
- Tailwind CSS
- Firebase
- Quill.js
- D3 charts

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

- `src/components/*` - feature screens and reusable UI
- `src/services/*` - Firebase/auth/toast/business logic
- `src/models/*` - shared data models
- `src/guards/*` - router guards
- `src/utils/*` - utility helpers
- `src/assets/*` - static assets

## Push Notifications

Push notification support is available for both iOS and Android.

- Android receiver setup notes: `src/components/notifications/ANDROID_SETUP.md`
- iOS is supported through APNs-compatible notification payloads in the sending flow
