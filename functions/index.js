const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize the Firebase Admin SDK
admin.initializeApp();

function buildNotificationMessage(data) {
  const sanitizedData = {};
  if (data.data) {
    for (const [key, value] of Object.entries(data.data)) {
      if (value !== null && value !== undefined) {
        sanitizedData[key] = String(value);
      }
    }
  }

  if (data.imageUrl) sanitizedData.image = String(data.imageUrl);
  if (data.title) sanitizedData.title = String(data.title);
  if (data.body) sanitizedData.body = String(data.body);

  const message = {
    notification: {
      title: data.title || "New Notification",
      body: data.body || "",
    },
    data: sanitizedData,
    fcmOptions: {
      analyticsLabel: "admin_dashboard_blast"
    },
    android: {
      priority: "high",
      notification: {
        imageUrl: data.imageUrl || undefined,
        color: "#ea580c",
        clickAction: "FCM_PLUGIN_ACTIVITY",
        sound: "default",
        defaultSound: true,
        defaultVibrateTimings: true,
        visibility: "public"
      }
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: data.title,
            body: data.body,
          },
          sound: "default",
          badge: 1,
          "mutable-content": 1
        }
      },
      fcm_options: {
        image: data.imageUrl || undefined,
        analyticsLabel: "admin_dashboard_blast"
      }
    }
  };

  if (data.targetType === "topic") {
    const topic = data.targetValue ? data.targetValue.trim() : "general";
    if (!topic) throw new Error("Topic is empty");
    message.topic = topic;
    console.log(`Target: Topic '${message.topic}'`);
  } else if (data.targetType === "token") {
    const token = data.targetValue ? data.targetValue.trim() : "";
    if (!token) throw new Error("Token is empty");
    message.token = token;
    console.log(`Target: Token '${message.token.substring(0, 10)}...'`);
  } else {
    throw new Error(`Invalid targetType: ${data.targetType}`);
  }

  return message;
}

exports.fetchGooglePlaceDetails = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return { success: false, message: "Authentication required." };
  }

  const placeId = data && data.placeId ? String(data.placeId).trim() : "";
  if (!placeId) {
    return { success: false, message: "Place ID is required." };
  }

  const googleConfig = functions.config().google || {};
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || googleConfig.maps_api_key || googleConfig.api_key || googleConfig.places_key;
  if (!apiKey) {
    return { success: false, message: "Google Maps API key is not configured." };
  }

  const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,geometry/location,formatted_address&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    return { success: false, message: `Google Places request failed with status ${response.status}.` };
  }

  const result = await response.json();
  if (result.status !== "OK" || !result.result) {
    return {
      success: false,
      message: result.error_message || `Google Places lookup failed with status ${result.status || "UNKNOWN"}.`
    };
  }

  return {
    success: true,
    name: result.result.name || "",
    rating: Number(result.result.rating || 0),
    reviews: Number(result.result.user_ratings_total || 0),
    lat: result.result.geometry?.location?.lat ?? null,
    lng: result.result.geometry?.location?.lng ?? null,
    formattedAddress: result.result.formatted_address || ""
  };
});

exports.resolveGooglePlaceFromAddress = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return { success: false, message: "Authentication required." };
  }

  const address = data && data.address ? String(data.address).trim() : "";
  if (!address) {
    return { success: false, message: "Address is required." };
  }

  const googleConfig = functions.config().google || {};
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || googleConfig.maps_api_key || googleConfig.api_key || googleConfig.places_key;
  if (!apiKey) {
    return { success: false, message: "Google Maps API key is not configured." };
  }

  const countryCode = data && data.countryCode ? String(data.countryCode).trim().toLowerCase() : "";
  const params = new URLSearchParams({
    address,
    key: apiKey
  });

  if (countryCode) {
    params.set("components", `country:${countryCode}`);
  }

  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    return { success: false, message: `Google Geocoding request failed with status ${response.status}.` };
  }

  const result = await response.json();
  if (result.status !== "OK" || !Array.isArray(result.results) || !result.results[0]) {
    return {
      success: false,
      message: result.error_message || `Google Geocoding lookup failed with status ${result.status || "UNKNOWN"}.`
    };
  }

  const firstResult = result.results[0];
  const location = firstResult.geometry?.location || {};

  return {
    success: true,
    placeId: firstResult.place_id || "",
    formattedAddress: firstResult.formatted_address || "",
    name: firstResult.address_components?.[0]?.long_name || firstResult.formatted_address || "",
    lat: location.lat ?? null,
    lng: location.lng ?? null
  };
});


async function deliverNotification(docRef, data) {
  const message = buildNotificationMessage(data);
  const response = await admin.messaging().send(message);
  console.log("FCM Send Success:", response);

  return docRef.update({
    status: "sent",
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    fcmMessageId: response,
  });
}

/**
 * Triggers when a new document is created in the 'push_queue' collection.
 * It reads the notification details and sends it via FCM.
 */
exports.sendPushNotification = functions
  // .region("europe-west1") // Keep commented out to use default region
  .firestore
  .document("push_queue/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const docId = context.params.docId;

    console.log(`Processing notification ${docId}:`, data.title);

    if (data.status !== "pending") {
      return null;
    }

    if (data.scheduledAt && new Date(data.scheduledAt).getTime() > Date.now()) {
      return null;
    }

    try {
      return await deliverNotification(snap.ref, data);
    } catch (error) {
      console.error("FCM Send Error:", error);
      try {
        await snap.ref.update({
          status: "failed",
          error: error.message || "Unknown error",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) { console.error(e); }
      return null;
    }
  });

exports.processScheduledPushNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("UTC")
  .onRun(async () => {
    const snapshot = await admin.firestore()
      .collection("push_queue")
      .where("status", "==", "scheduled")
      .get();

    const now = Date.now();
    const dueDocs = snapshot.docs.filter((doc) => {
      const scheduledAt = doc.data().scheduledAt;
      if (!scheduledAt) return false;
      return new Date(scheduledAt).getTime() <= now;
    });

    for (const doc of dueDocs) {
      const claimed = await admin.firestore().runTransaction(async (tx) => {
        const freshSnap = await tx.get(doc.ref);
        const freshData = freshSnap.data();
        if (!freshData || freshData.status !== "scheduled") return false;
        if (!freshData.scheduledAt || new Date(freshData.scheduledAt).getTime() > Date.now()) return false;

        tx.update(doc.ref, {
          status: "sending",
          sendingAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
      });

      if (!claimed) continue;

      try {
        await deliverNotification(doc.ref, doc.data());
      } catch (error) {
        console.error("Scheduled FCM Send Error:", error);
        await doc.ref.update({
          status: "failed",
          error: error.message || "Unknown error",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return null;
  });

/**
 * A callable function to test SMTP settings.
 * Wrapped entirely in try/catch to avoid generic "internal" errors on the client.
 */
exports.testSmtpConnection = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      return { success: false, message: "Authentication required." };
    }

    // Basic validation of incoming data
    const { smtpHost, smtpPort, smtpUser, smtpPass } = data || {};
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return { success: false, message: "Missing required SMTP credentials." };
    }

    // Create a transporter with the provided credentials
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false // Often required for local/some providers
      },
      // Add timeouts to prevent hanging indefinitely
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    // Verify connection configuration
    await transporter.verify();
    console.log("SMTP connection verified successfully for user:", context.auth.uid);
    return { success: true, message: "SMTP connection successful!" };

  } catch (error) {
    console.error("SMTP verification failed:", error);
    // Return a structured failure response with the actual error message
    // This prevents the client from receiving a generic "internal" error
    return { 
      success: false, 
      message: error.message || "Failed to verify SMTP connection due to an unknown error." 
    };
  }
});


/**
 * Triggers when a new document is created in the 'email_queue' collection.
 * Sends an email using Nodemailer with SMTP settings from Firestore.
 */
exports.sendQueuedEmail = functions.firestore
  .document("email_queue/{docId}")
  .onCreate(async (snap) => {
    const emailData = snap.data();

    try {
      // 1. Fetch SMTP configuration from Firestore
      const configSnap = await admin.firestore()
        .doc("settings/email_config").get();
        
      if (!configSnap.exists) {
        console.error("Email config not found at /settings/email_config");
        return snap.ref.update({status: "failed", error: "SMTP config missing"});
      }
      const config = configSnap.data();

      // 2. Create a Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: Number(config.smtpPort),
        secure: Number(config.smtpPort) === 465, // true for 465, false for other ports
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      // 3. Determine recipients
      let recipients = [];
      if (emailData.target.audience === "test") {
        if (emailData.target.testEmail) {
          recipients.push(emailData.target.testEmail);
        }
      } else if (emailData.target.audience === "all") {
        const usersSnap = await admin.firestore().collection("users").get();
        recipients = usersSnap.docs.map((doc) => doc.data().email)
          .filter(Boolean);
      }

      if (recipients.length === 0) {
        return snap.ref.update({status: "failed", error: "No recipients found"});
      }

      // 4. Send email
      // NOTE: In production, for "all users", sending one-by-one can be slow.
      // Consider batching or using a dedicated service for large volumes.
      // For now, BCC is a good approach for a moderate number of users.
      const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: recipients.length === 1 ? recipients[0] : undefined, // Send to one user
        bcc: recipients.length > 1 ? recipients : undefined, // BCC for mass mail
        subject: emailData.subject,
        html: emailData.htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent for job ${snap.id} to ${recipients.length} user(s).`);

      return snap.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return snap.ref.update({
        status: "failed",
        error: error.message || "Unknown SMTP error",
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
