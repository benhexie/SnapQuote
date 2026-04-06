const axios = require("axios");

const admin = require("firebase-admin");

const RUST_AI_URL = process.env.RUST_AI_URL || "http://localhost:3000/api/ai";

/**
 * Controller to generate a new invoice from multi-modal inputs.
 */
const generateQuote = async (req, res) => {
  const { media_urls, prompt, project_name } = req.body;

  if (
    (!media_urls || !Array.isArray(media_urls) || media_urls.length === 0) &&
    !prompt
  ) {
    return res
      .status(400)
      .json({ error: "Either media_urls array or a text prompt is required." });
  }

  try {
    // 1. Log the generation request (analytics, cost tracking, etc.)
    console.log(
      `User ${req.user.uid} requesting new quote generation for: ${project_name}`,
    );

    // 2. Forward request to Rust AI Microservice
    const rustPayload = {
      user_id: req.user.uid,
      media_urls: media_urls || [],
      prompt:
        prompt || "Analyze this job site video and create an itemized quote.",
      project_name: project_name || "New Project",
      currency: req.body.currency || "USD",
    };

    // Forwarding to Rust Engine
    const response = await axios.post(`${RUST_AI_URL}/process`, rustPayload, {
      timeout: 60000, // Allow up to 60s for Gemini generation & video processing
    });

    // 3. Return the Rust engine response to the client
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error calling Rust AI microservice:", error.message);
    const statusCode = error.response ? error.response.status : 500;
    const data = error.response
      ? error.response.data
      : { error: "Internal Server Error" };
    return res.status(statusCode).json(data);
  }
};

/**
 * Controller to apply natural language "Prompt-to-Edit" commands to an existing invoice.
 */
const editQuote = async (req, res) => {
  const { invoice_id, prompt } = req.body;

  if (!invoice_id || !prompt) {
    return res
      .status(400)
      .json({ error: "invoice_id and prompt are required." });
  }

  try {
    // Forwarding "Prompt-to-Edit" to Rust Engine
    const rustPayload = {
      user_id: req.user.uid,
      invoice_id,
      prompt,
    };

    const response = await axios.post(`${RUST_AI_URL}/edit`, rustPayload, {
      timeout: 30000, // Shorter timeout for edits compared to video processing
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error in Prompt-to-Edit:", error.message);
    const statusCode = error.response ? error.response.status : 500;
    const data = error.response
      ? error.response.data
      : { error: "Internal Server Error" };
    return res.status(statusCode).json(data);
  }
};

/**
 * Controller to preview an invoice using a customizable template.
 * Expects custom template settings and invoice ID.
 */
const previewInvoice = async (req, res) => {
  const { id } = req.params;
  const customization = req.body; // { company_name, logo_url, theme_color, etc. }

  try {
    const db = admin.firestore();
    const docRef = db.collection("invoices").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    const invoiceData = doc.data();

    // Verify ownership
    if (invoiceData.user_id !== req.user.uid) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this invoice." });
    }

    // Determine template to render (default to 'modern')
    const validTemplates = ['modern', 'classic', 'minimal'];
    const templateName = validTemplates.includes(customization.template) 
      ? customization.template 
      : 'modern';

    // Render the EJS template with invoice data + customization
    res.render(templateName, {
      ...invoiceData,
      ...customization,
      locals: customization, // Ensure locals are passed specifically if needed by template
    });
  } catch (error) {
    console.error("Error previewing invoice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  generateQuote,
  editQuote,
  previewInvoice,
};
