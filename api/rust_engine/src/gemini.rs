use crate::models::{GeminiRequest, GeminiResponse, Content, Part, SystemInstruction, GenerationConfig, Invoice};
use reqwest::Client;
use std::env;

const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

pub struct GeminiClient {
    api_key: String,
    client: Client,
}

impl GeminiClient {
    pub fn new() -> Result<Self, anyhow::Error> {
        let api_key = env::var("GEMINI_API_KEY").unwrap_or_else(|_| "MOCK_KEY".to_string());
        
        Ok(Self {
            api_key,
            client: Client::new(),
        })
    }

    pub async fn generate_content(&self, request: GeminiRequest) -> Result<GeminiResponse, anyhow::Error> {
        let url = format!("{}?key={}", GEMINI_API_URL, self.api_key);
        
        let response = match self.client.post(&url).json(&request).send().await {
            Ok(res) => res,
            Err(e) => return Err(anyhow::anyhow!("Network request failed: {}", e.without_url())),
        };

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Gemini API Error: {}", error_text));
        }

        let result = response.json::<GeminiResponse>().await?;
        Ok(result)
    }

    // Helper to upload media to Gemini File API if using File API directly,
    // or just return the bytes for inline data if small enough.
    // For MVP, if it's large video, we need to use Google's Media API upload first.
    // Placeholder implementation.
    pub async fn upload_media(&self, _media_url: &str) -> Result<String, anyhow::Error> {
        // Here we would:
        // 1. Download from Firebase Storage URL
        // 2. Upload to Gemini using `https://generativelanguage.googleapis.com/upload/v1beta/files`
        // 3. Return the `file_uri`
        Ok("mock_gemini_file_uri".to_string())
    }

    pub async fn generate_invoice(&self, prompt: &str, project_name: &str, currency: &str, mut parts: Vec<Part>) -> Result<Invoice, anyhow::Error> {
        let system_instruction = format!("You are an expert construction estimator. Generate a professional invoice. \
            Calculate realistic quantities, unit prices, and totals. Output ONLY valid JSON matching the exact structure requested, \
            with no markdown formatting or backticks. All currency values should be estimated in {}", currency);

        let json_schema = serde_json::json!({
            "type": "object",
            "properties": {
                "project_name": { "type": "string" },
                "date": { "type": "string", "description": "YYYY-MM-DD" },
                "transcript": { "type": "string", "description": "The exact transcribed text from the audio, if provided" },
                "subtotal": { "type": "number" },
                "taxes": { "type": "number" },
                "total": { "type": "number" },
                "line_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": { "type": "string", "description": "A UUID" },
                            "description": { "type": "string" },
                            "quantity": { "type": "number", "description": "Quantity of the item (e.g., units, bags, square feet). For labor, hours, or days, this MUST be 1." },
                            "unit_price": { "type": "number", "description": "Price per single unit, or total labor cost if quantity is 1." }
                        },
                        "required": ["id", "description", "quantity", "unit_price"]
                    }
                }
            },
            "required": ["project_name", "date", "subtotal", "taxes", "total", "line_items"]
        });

        let project_context = if project_name == "New Project" || project_name.trim().is_empty() {
            "Please generate a short, descriptive project name based on the provided details and media.".to_string()
        } else {
            format!("Project Name: {}", project_name)
        };

        // Add the prompt text part at the beginning
        parts.insert(0, Part {
            text: Some(format!("{}\nDetails: {}", project_context, prompt)),
            function_call: None,
            function_response: None,
            file_data: None,
            inline_data: None,
        });

        let request = GeminiRequest {
            contents: vec![Content {
                role: "user".to_string(),
                parts,
            }],
            system_instruction: Some(SystemInstruction {
                parts: vec![Part {
                    text: Some(system_instruction.to_string()),
                    function_call: None,
                    function_response: None,
                    file_data: None,
                    inline_data: None,
                }],
            }),
            tools: None,
            generation_config: Some(GenerationConfig {
                response_mime_type: Some("application/json".to_string()),
                response_schema: Some(json_schema),
            }),
        };

        let response = self.generate_content(request).await?;

        let candidates = response.candidates.ok_or_else(|| anyhow::anyhow!("No candidates returned"))?;
        let first_candidate = candidates.first().ok_or_else(|| anyhow::anyhow!("Empty candidates array"))?;
        let text = first_candidate.content.parts.first()
            .and_then(|p| p.text.as_ref())
            .ok_or_else(|| anyhow::anyhow!("No text found in response"))?;

        // Gemini sometimes includes markdown formatting even with response_mime_type, so we strip it just in case
        let clean_text = text.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
        
        let invoice: Invoice = serde_json::from_str(clean_text)?;
        Ok(invoice)
    }

    pub async fn edit_invoice(&self, prompt: &str, current_invoice: &Invoice) -> Result<Invoice, anyhow::Error> {
        let system_instruction = "You are an expert construction estimator AI. \
            The user will provide a command to edit an existing invoice. \
            Apply the changes carefully and realistically. Ensure the math (subtotal, taxes, total) is correct. \
            Output ONLY valid JSON matching the exact structure requested, with no markdown formatting.";

        let json_schema = serde_json::json!({
            "type": "object",
            "properties": {
                "project_name": { "type": "string" },
                "date": { "type": "string", "description": "YYYY-MM-DD" },
                "transcript": { "type": "string", "description": "The exact transcribed text from the audio, if provided" },
                "subtotal": { "type": "number" },
                "taxes": { "type": "number" },
                "total": { "type": "number" },
                "line_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": { "type": "string", "description": "A UUID" },
                            "description": { "type": "string" },
                            "quantity": { "type": "number", "description": "Quantity of the item (e.g., units, bags, square feet). For labor, hours, or days, this MUST be 1." },
                            "unit_price": { "type": "number", "description": "Price per single unit, or total labor cost if quantity is 1." }
                        },
                        "required": ["id", "description", "quantity", "unit_price"]
                    }
                }
            },
            "required": ["project_name", "date", "subtotal", "taxes", "total", "line_items"]
        });

        let current_invoice_json = serde_json::to_string(current_invoice)?;
        let user_text = format!("Current Invoice:\n{}\n\nUser Command to Apply:\n{}", current_invoice_json, prompt);

        let parts = vec![Part {
            text: Some(user_text),
            function_call: None,
            function_response: None,
            file_data: None,
            inline_data: None,
        }];

        let request = GeminiRequest {
            contents: vec![Content {
                role: "user".to_string(),
                parts,
            }],
            system_instruction: Some(SystemInstruction {
                parts: vec![Part {
                    text: Some(system_instruction.to_string()),
                    function_call: None,
                    function_response: None,
                    file_data: None,
                    inline_data: None,
                }],
            }),
            tools: None,
            generation_config: Some(GenerationConfig {
                response_mime_type: Some("application/json".to_string()),
                response_schema: Some(json_schema),
            }),
        };

        let response = self.generate_content(request).await?;

        let candidates = response.candidates.ok_or_else(|| anyhow::anyhow!("No candidates returned"))?;
        let first_candidate = candidates.first().ok_or_else(|| anyhow::anyhow!("Empty candidates array"))?;
        let text = first_candidate.content.parts.first()
            .and_then(|p| p.text.as_ref())
            .ok_or_else(|| anyhow::anyhow!("No text found in response"))?;

        let clean_text = text.trim().trim_start_matches("```json").trim_start_matches("```").trim_end_matches("```").trim();
        
        let invoice: Invoice = serde_json::from_str(clean_text)?;
        Ok(invoice)
    }
}
