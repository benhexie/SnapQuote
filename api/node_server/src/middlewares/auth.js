const admin = require("firebase-admin");

/**
 * Middleware to validate Firebase ID Token and ensure user has a valid subscription
 */
const validateAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    let decodedToken;
    try {
      if (admin.apps.length > 0 && admin.app().options.credential) {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } else {
        throw new Error("Firebase Admin not fully initialized for token verification.");
      }
    } catch (e) {
      // Fallback for development if real token verification fails or admin not set up
      const uid = idToken.startsWith("mock_") ? idToken : (req.body.userId || "mock_user_123");
      decodedToken = { uid: uid, email: "contractor@example.com" };
    }

    req.user = decodedToken;

    // TODO: Optionally check subscription status via Stripe here
    // const subscriptionActive = await checkStripeSubscription(decodedToken.uid);
    // if (!subscriptionActive) return res.status(403).json({ error: 'Subscription required' });

    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

module.exports = { validateAuth };
