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
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;

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

    pub async fn generate_invoice(&self, prompt: &str, project_name: &str) -> Result<Invoice, anyhow::Error> {
        let system_instruction = "You are an expert construction estimator. Generate a professional invoice. \
            Calculate realistic quantities, unit prices, and totals. Output ONLY valid JSON matching the exact structure requested, \
            with no markdown formatting or backticks. The category MUST be one of 'Materials', 'Labor', 'Equipment', or 'Fees'.";

        let json_schema = serde_json::json!({
            "type": "object",
            "properties": {
                "project_name": { "type": "string" },
                "date": { "type": "string", "description": "YYYY-MM-DD" },
                "subtotal": { "type": "number" },
                "taxes": { "type": "number" },
                "total": { "type": "number" },
                "line_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": { "type": "string", "description": "A UUID" },
                            "category": { "type": "string", "enum": ["Materials", "Labor", "Equipment", "Fees"] },
                            "description": { "type": "string" },
                            "quantity": { "type": "number" },
                            "unit_price": { "type": "number" },
                            "total": { "type": "number" }
                        },
                        "required": ["id", "category", "description", "quantity", "unit_price", "total"]
                    }
                }
            },
            "required": ["project_name", "date", "subtotal", "taxes", "total", "line_items"]
        });

        let request = GeminiRequest {
            contents: vec![Content {
                role: "user".to_string(),
                parts: vec![Part {
                    text: Some(format!("Project: {}\nDetails: {}", project_name, prompt)),
                    function_call: None,
                    function_response: None,
                    file_data: None,
                }],
            }],
            system_instruction: Some(SystemInstruction {
                parts: vec![Part {
                    text: Some(system_instruction.to_string()),
                    function_call: None,
                    function_response: None,
                    file_data: None,
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
}
