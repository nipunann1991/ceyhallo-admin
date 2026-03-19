# Android Receiver App Setup

For the CeyHallo Mobile App (Receiver) to correctly handle push notifications sent from this dashboard, you must configure the **AndroidManifest.xml** and ensure the app subscribes to topics.

## 1. AndroidManifest.xml

Locate your file at: `android/app/src/main/AndroidManifest.xml`

You must add the `FCM_PLUGIN_ACTIVITY` intent filter inside your main `<activity>` tag. This allows the Capacitor Push Notifications plugin to intercept the tap event when the app is in the background.

```xml
<activity android:name=".MainActivity" ...>
    
    <!-- Existing Intent Filters -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- ADD THIS SECTION -->
    <intent-filter>
        <action android:name="FCM_PLUGIN_ACTIVITY" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>

</activity>
```

## 2. Topic Subscription (Crucial for "All Users")

The standard `@capacitor/push-notifications` plugin does **not** support subscribing to Topics (like `general`). You must use the community FCM plugin to receive "All Users" broadcasts.

### Step A: Install Plugin
```bash
npm install @capacitor-community/fcm
npx cap update
```

### Step B: Update App Logic
In your Ionic/Angular app `main.ts` or `app.component.ts`:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';

const initPush = async () => {
    // 1. Request Permission
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return;

    // 2. Register
    await PushNotifications.register();

    // 3. Subscribe to 'general' topic (Required for Dashboard 'All Users' sends)
    try {
        await FCM.subscribeTo({ topic: 'general' });
        console.log('Subscribed to general topic');
    } catch (e) {
        console.error('Topic subscription failed', e);
    }

    // 4. Handle Tap
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Notification tapped:', notification);
        const data = notification.notification.data;
        if (data.routeId) {
            // router.navigateByUrl(data.routeId);
        }
    });
};

initPush();
```

## 3. Default Icon (Optional)

Inside the `<application>` tag, add these metadata fields if you have generated custom icons. If not, the system launcher icon will be used.

```xml
<application ...>
    <!-- ... -->
    <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/ic_launcher" />
    <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/colorAccent" />
</application>
```
