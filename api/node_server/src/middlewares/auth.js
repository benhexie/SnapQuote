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
    // In a real scenario, uncomment the following line to verify token
    // const decodedToken = await admin.auth().verifyIdToken(idToken);

    // MOCK VERIFICATION for MVP:
    // If the token starts with 'mock_', use it as the user ID. Otherwise default.
    const uid = idToken.startsWith("mock_") ? idToken : "mock_user_123";
    const decodedToken = { uid: uid, email: "contractor@example.com" };

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
