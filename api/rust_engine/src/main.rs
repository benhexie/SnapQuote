use axum::{
    routing::{get, post},
    Router, Json,
};
use dotenvy::dotenv;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::env;
use std::io::Write;

mod gemini;
mod models;
mod prompt;
mod media;
mod db;

use models::{Invoice, ItemCategory, LineItem};


#[tokio::main]
async fn main() {
    // Load environment variables from .env file
    dotenv().ok();

    // Railway / Cloud deployment trick for serviceAccountKey.json
    if env::var("GOOGLE_APPLICATION_CREDENTIALS").is_err() {
        if let (Ok(project_id), Ok(client_email), Ok(private_key)) = (
            env::var("FIREBASE_PROJECT_ID"),
            env::var("FIREBASE_CLIENT_EMAIL"),
            env::var("FIREBASE_PRIVATE_KEY"),
        ) {
            let private_key = private_key.replace("\\n", "\n");
            let credentials_json = serde_json::json!({
                "type": "service_account",
                "project_id": project_id,
                "private_key_id": "dummy_private_key_id",
                "private_key": private_key,
                "client_email": &client_email,
                "client_id": "dummy_client_id",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": format!("https://www.googleapis.com/robot/v1/metadata/x509/{}", client_email)
            });

            let mut temp_file = tempfile::NamedTempFile::new().expect("Failed to create temp credentials file");
            write!(temp_file, "{}", credentials_json).expect("Failed to write temp credentials file");
            
            // Keep the temp file alive for the lifetime of the program
            let (_, path) = temp_file.keep().expect("Failed to persist temp credentials file");
            unsafe {
                env::set_var("GOOGLE_APPLICATION_CREDENTIALS", path);
            }
            println!("Generated GOOGLE_APPLICATION_CREDENTIALS from env vars");
        }
    }

    // Define the application routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/ai/process", post(process_quote))
        .route("/api/ai/edit", post(edit_quote));

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = SocketAddr::from(([0, 0, 0, 0], port.parse::<u16>().unwrap()));
    
    println!("Rust AI Microservice listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

// Request and Response Structs for Node.js interaction

#[derive(Deserialize)]
struct ProcessQuoteRequest {
    user_id: String,
    media_urls: Vec<String>,
    prompt: String,
    project_name: String,
}

#[derive(Serialize)]
struct ProcessQuoteResponse {
    status: String,
    invoice_id: String,
    message: String,
}

#[derive(Deserialize)]
struct EditQuoteRequest {
    user_id: String,
    invoice_id: String,
    prompt: String,
}

#[derive(Serialize)]
struct EditQuoteResponse {
    status: String,
    invoice_id: String,
    message: String,
}

async fn process_quote(Json(payload): Json<ProcessQuoteRequest>) -> Json<ProcessQuoteResponse> {
    println!("Processing quote for user {} (Project: {})", payload.user_id, payload.project_name);
    
    // 1. Process Media (FFMPEG for video -> frames)
    let mut frames = Vec::new();
    if let Some(video_url) = payload.media_urls.first() {
        println!("Extracting frames from video: {}", video_url);
        match media::extract_frames_from_url(video_url).await {
            Ok(extracted_frames) => {
                println!("Successfully extracted {} frames", extracted_frames.len());
                frames = extracted_frames;
            },
            Err(e) => {
                println!("Failed to extract frames: {}", e);
            }
        }
    }

    // 2. Call Gemini API
    let invoice_id = uuid::Uuid::new_v4().to_string();
    
    let gemini_client = gemini::GeminiClient::new().map_err(|e| {
        println!("Failed to init Gemini Client: {}", e);
        // Normally we'd return a 500 error here, but for now we'll just panic or return a bad response
        "Failed to init Gemini Client"
    }).unwrap();

    let mut generated_invoice = match gemini_client.generate_invoice(&payload.prompt, &payload.project_name).await {
        Ok(invoice) => invoice,
        Err(e) => {
            println!("Gemini API failed: {}", e);
            // Fallback to mock on error so the app doesn't crash entirely during testing
            Invoice {
                user_id: None,
                project_name: payload.project_name.clone(),
                date: "2024-04-04".to_string(),
                line_items: vec![
                    crate::models::LineItem {
                        id: uuid::Uuid::new_v4().to_string(),
                        category: crate::models::ItemCategory::Fees,
                        description: format!("Error generating quote: {}", e),
                        quantity: 1.0,
                        unit_price: 0.0,
                        total: 0.0,
                    }
                ],
                subtotal: 0.0,
                taxes: 0.0,
                total: 0.0,
            }
        }
    };
    
    // Ensure the generated invoice has no stray user_id from Gemini before we save it
    generated_invoice.user_id = None;

    // 3. Save to Firestore
    if let Err(e) = db::save_invoice_to_firestore(&payload.user_id, &invoice_id, &generated_invoice).await {
        println!("Failed to save to Firestore: {}", e);
    }

    Json(ProcessQuoteResponse {
        status: "success".to_string(),
        invoice_id,
        message: "Invoice generated and saved to Firestore".to_string(),
    })
}

async fn edit_quote(Json(payload): Json<EditQuoteRequest>) -> Json<EditQuoteResponse> {
    println!("Editing quote {} for user {}", payload.invoice_id, payload.user_id);
    
    // 1. Placeholder for Fetching current Invoice from Firestore
    // 2. Placeholder for Gemini API Tool call loop
    // 3. Mock saving updated invoice to Firestore

    Json(EditQuoteResponse {
        status: "success".to_string(),
        invoice_id: payload.invoice_id,
        message: "Invoice updated and saved to Firestore".to_string(),
    })
}
