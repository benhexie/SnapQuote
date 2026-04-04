const express = require("express");
const { validateAuth } = require("../middlewares/auth");
const {
  generateQuote,
  editQuote,
  previewInvoice,
} = require("../controllers/quotesController");
const router = express.Router();

/**
 * @route POST /api/quotes/generate
 * @description Generates a new invoice from multi-modal inputs.
 */
router.post("/generate", validateAuth, generateQuote);

/**
 * @route POST /api/quotes/edit
 * @description Applies natural language "Prompt-to-Edit" commands to an existing invoice.
 */
router.post("/edit", validateAuth, editQuote);

/**
 * @route POST /api/quotes/:id/preview
 * @description Previews an invoice with customizable template data. Returns HTML.
 */
router.post("/:id/preview", validateAuth, previewInvoice);

module.exports = router;
