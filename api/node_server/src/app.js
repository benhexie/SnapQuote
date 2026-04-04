require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines to support .env single-line strings
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    console.log("Firebase Admin initialized via environment variables.");
  } else {
    // For dev, we just mock the init to prevent crashes if no service account is provided
    console.log("Firebase Admin initialized (mock - missing credentials)");
  }
}

const app = express();

// Configure EJS template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());
app.use(express.json());

const quotesRouter = require("./routes/quotes");
app.use("/api/quotes", quotesRouter);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "node_server" });
});

// Mock demo data for template previews
const mockDemoInvoice = {
  project_name: "Smith Residence Fence Replacement",
  // date: "2023-10-27", // Intentionally commented out to test dynamic date rendering
  // due_date: "2023-11-26",
  subtotal: 3178.0,
  taxes: 222.46,
  total: 3400.46,
  line_items: [
    {
      category: "Labor",
      description: "Demolition and removal of 50 LF existing chain-link fence",
      quantity: 50,
      unit_price: 12,
      total: 600,
    },
    {
      category: "Materials",
      description: "4x4x8 Pressure-Treated Fence Posts",
      quantity: 8,
      unit_price: 16.5,
      total: 132,
    },
    {
      category: "Materials",
      description: "6-foot Cedar Dog-Ear Fence Pickets",
      quantity: 110,
      unit_price: 3.5,
      total: 385,
    },
    {
      category: "Materials",
      description: "Quickcrete Concrete Mix 50lb bags",
      quantity: 16,
      unit_price: 4.5,
      total: 72,
    },
    {
      category: "Labor",
      description: "Installation of posts and pickets (approx 2 days)",
      quantity: 32,
      unit_price: 62.15,
      total: 1989,
    },
  ],
  company_name: "Apex Construction",
  company_address: "999 Builders Way, Austin, TX 78701",
  company_phone: "(512) 555-9999",
  company_email: "billing@apexconstruction.com",
  client_name: "John Smith",
  client_address: "123 Fake Street\nAustin, TX 78704",
  client_email: "john@example.com",
  theme_color: "#3b82f6", // Blue
  theme_color_light: "#eff6ff", // Light Blue
  discount: 100.5,
  signature:
    "https://upload.wikimedia.org/wikipedia/commons/f/f4/John_Hancock_signature.svg",
  currency: "€",
  terms:
    "Payment is due within 30 days.\nLate payments are subject to a 1.5% monthly fee.\nPlease review all terms before signing.",
};

// Route to render the interactive template gallery
app.get("/gallery", (req, res) => {
  res.render("gallery");
});

// Unprotected route to render a specific template with mock data
app.get("/demo-invoice/:template", (req, res) => {
  const validTemplates = ["modern", "classic", "minimal"];
  const templateName = validTemplates.includes(req.params.template)
    ? req.params.template
    : "modern";

  res.render(templateName, {
    ...mockDemoInvoice,
    locals: mockDemoInvoice,
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Node.js API Server running on port ${PORT}`);
});

module.exports = app;
