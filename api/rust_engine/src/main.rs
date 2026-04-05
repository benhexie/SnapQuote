use axum::{
    routing::{get, post},
    Router, Json,
};
use dotenvy::dotenv;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::env;
use std::io::Write;
use std::time::Instant;

mod gemini;
mod models;
mod prompt;
mod media;
mod db;

use models::{Invoice, LineItem};

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};

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

#[derive(Deserialize, Clone)]
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
    let total_start = Instant::now();
    println!("Received quote request for user {} (Project: {})", payload.user_id, payload.project_name);
    
    let invoice_id = uuid::Uuid::new_v4().to_string();
    
    // Save a "processing" stub to Firestore immediately
    let stub_invoice = Invoice {
        user_id: None, // `save_invoice_to_firestore` adds the user_id internally
        project_name: payload.project_name.clone(),
        date: chrono::Local::now().format("%Y-%m-%d").to_string(),
        transcript: None,
        status: Some("processing".to_string()),
        media_url: payload.media_urls.first().cloned(),
        prompt: Some(payload.prompt.clone()),
        line_items: vec![],
        subtotal: 0.0,
        taxes: 0.0,
        total: 0.0,
    };

    if let Err(e) = db::save_invoice_to_firestore(&payload.user_id, &invoice_id, &stub_invoice).await {
        println!("Failed to save stub to Firestore: {}", e);
    }
    
    // Clone things needed for the background task
    let payload_clone = payload.clone();
    let invoice_id_clone = invoice_id.clone();
    
    // Spawn background processing
    tokio::spawn(async move {
        println!("Background processing started for quote: {}", invoice_id_clone);
        let payload = payload_clone;
        
        // 1. Process Media (FFMPEG for video -> frames, or download PDF/Image)
        let media_start = Instant::now();
        let mut parts: Vec<crate::models::Part> = Vec::new();
        let mut is_video = false;
        
        for media_url in &payload.media_urls {
        // Simple check based on URL extension or assume from UI
        let lower_url = media_url.to_lowercase();
        if lower_url.contains(".mp4") || lower_url.contains(".mov") || lower_url.contains(".avi") || lower_url.contains(".wmv") || lower_url.contains(".mkv") || lower_url.contains(".webm") {
            is_video = true;
            println!("Extracting frames from video: {}", media_url);
            match media::extract_media_from_url(media_url).await {
                Ok((extracted_frames, extracted_audio)) => {
                    println!("Successfully extracted {} frames", extracted_frames.len());
                    for frame in extracted_frames {
                        parts.push(crate::models::Part {
                            text: None,
                            function_call: None,
                            function_response: None,
                            file_data: None,
                            inline_data: Some(crate::models::InlineData {
                                mime_type: "image/jpeg".to_string(),
                                data: BASE64_STANDARD.encode(&frame),
                            }),
                        });
                    }
                    if let Some(audio_data) = extracted_audio {
                        println!("Successfully extracted audio");
                        parts.push(crate::models::Part {
                            text: None,
                            function_call: None,
                            function_response: None,
                            file_data: None,
                            inline_data: Some(crate::models::InlineData {
                                mime_type: "audio/mp3".to_string(),
                                data: BASE64_STANDARD.encode(&audio_data),
                            }),
                        });
                    }
                },
                Err(e) => {
                    println!("Failed to extract frames: {}", e);
                }
            }
        } else {
            // Assume Image or PDF
            println!("Downloading document: {}", media_url);
            match reqwest::get(media_url).await {
                Ok(response) => {
                    let mut content_type = response.headers()
                        .get(reqwest::header::CONTENT_TYPE)
                        .and_then(|val| val.to_str().ok())
                        .unwrap_or("application/pdf")
                        .to_string();
                    
                    if content_type == "application/octet-stream" || content_type.contains("application/x-www-form-urlencoded") {
                        if media_url.to_lowercase().contains(".pdf") {
                            content_type = "application/pdf".to_string();
                        } else if media_url.to_lowercase().contains(".png") {
                            content_type = "image/png".to_string();
                        } else if media_url.to_lowercase().contains(".jpg") || media_url.to_lowercase().contains(".jpeg") {
                            content_type = "image/jpeg".to_string();
                        } else if media_url.to_lowercase().contains(".txt") {
                            content_type = "text/plain".to_string();
                        } else if media_url.to_lowercase().contains(".csv") {
                            content_type = "text/csv".to_string();
                        } else if media_url.to_lowercase().contains(".rtf") {
                            content_type = "application/rtf".to_string();
                        } else if media_url.to_lowercase().contains(".doc") || media_url.to_lowercase().contains(".docx") {
                            // Gemini Flash 1.5 doesn't natively support doc/docx as inline data natively in the same way as PDF,
                            // but we can try sending it as text/plain if it fails, or just use the proper MIME and hope for the best.
                            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string();
                        } else {
                            // If we really can't tell, default to pdf for now
                            content_type = "application/pdf".to_string();
                        }
                    }
                        
                    if let Ok(bytes) = response.bytes().await {
                        parts.push(crate::models::Part {
                            text: None,
                            function_call: None,
                            function_response: None,
                            file_data: None,
                            inline_data: Some(crate::models::InlineData {
                                mime_type: content_type,
                                data: BASE64_STANDARD.encode(&bytes),
                            }),
                        });
                        println!("Successfully added document as inline_data");
                    }
                },
                Err(e) => println!("Failed to download document: {}", e)
            }
        }
    }
    println!("[TIMING] Step 1: Media Processing took {:?}", media_start.elapsed());

    // 2. Call Gemini API
    let gemini_start = Instant::now();
    
    let gemini_client = gemini::GeminiClient::new().map_err(|e| {
        println!("Failed to init Gemini Client: {}", e);
        // Normally we'd return a 500 error here, but for now we'll just panic or return a bad response
        "Failed to init Gemini Client"
    }).unwrap();

    let mut generated_invoice = match gemini_client.generate_invoice(&payload.prompt, &payload.project_name, parts).await {
        Ok(invoice) => invoice,
        Err(e) => {
            println!("Gemini API failed: {}", e);
            // Fallback to mock on error so the app doesn't crash entirely during testing
            Invoice {
                user_id: None,
                project_name: payload.project_name.clone(),
                date: chrono::Local::now().format("%Y-%m-%d").to_string(),
                transcript: None,
                status: Some("error".to_string()),
                media_url: None,
                prompt: None,
                line_items: vec![
                    crate::models::LineItem {
                        id: uuid::Uuid::new_v4().to_string(),
                        description: "Error generating quote. Please try again.".to_string(),
                        quantity: 1.0,
                        unit_price: 0.0,
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
    // Override the date with today's date, since Gemini might hallucinate it
    generated_invoice.date = chrono::Local::now().format("%Y-%m-%d").to_string();
    
    // Inject media url and prompt
    generated_invoice.media_url = payload.media_urls.first().cloned();
    generated_invoice.prompt = Some(payload.prompt.clone());
    
    // Ensure non-video files do not have a transcript
    if !is_video {
        generated_invoice.transcript = None;
    }

    // Set status to completed (or error if it failed above)
    if generated_invoice.status.is_none() || generated_invoice.status.as_deref() == Some("processing") {
        generated_invoice.status = Some("completed".to_string());
    }
    
    println!("[TIMING] Step 2: Gemini API Call took {:?}", gemini_start.elapsed());

    // 3. Save to Firestore
    let fs_start = Instant::now();
    if let Err(e) = db::save_invoice_to_firestore(&payload.user_id, &invoice_id_clone, &generated_invoice).await {
        println!("Failed to save to Firestore: {}", e);
    }
    println!("[TIMING] Step 3: Firestore Save took {:?}", fs_start.elapsed());
    
    println!("[TIMING] Background Processing Time: {:?}", total_start.elapsed());
    });

    Json(ProcessQuoteResponse {
        status: "processing".to_string(),
        invoice_id,
        message: "Invoice processing started in background".to_string(),
    })
}

async fn edit_quote(Json(payload): Json<EditQuoteRequest>) -> Json<EditQuoteResponse> {
    println!("Editing quote {} for user {}", payload.invoice_id, payload.user_id);
    
    // 1. Fetch current Invoice from Firestore
    let current_invoice = match db::read_invoice_from_firestore(&payload.invoice_id).await {
        Ok(inv) => inv,
        Err(e) => {
            println!("Failed to read invoice from Firestore: {}", e);
            return Json(EditQuoteResponse {
                status: "error".to_string(),
                invoice_id: payload.invoice_id,
                message: format!("Failed to read invoice: {}", e),
            });
        }
    };

    // Verify ownership
    if let Some(ref owner_id) = current_invoice.user_id {
        if owner_id != &payload.user_id {
            return Json(EditQuoteResponse {
                status: "error".to_string(),
                invoice_id: payload.invoice_id,
                message: "Unauthorized access to invoice".to_string(),
            });
        }
    }

    // 2. Call Gemini API
    let gemini_client = gemini::GeminiClient::new().unwrap();
    let mut updated_invoice = match gemini_client.edit_invoice(&payload.prompt, &current_invoice).await {
        Ok(inv) => inv,
        Err(e) => {
            println!("Gemini API failed during edit: {}", e);
            return Json(EditQuoteResponse {
                status: "error".to_string(),
                invoice_id: payload.invoice_id,
                message: format!("Gemini API failed: {}", e),
            });
        }
    };

    // Preserve user_id, original date, and original media_url
    updated_invoice.user_id = current_invoice.user_id.clone();
    updated_invoice.date = current_invoice.date.clone();
    updated_invoice.media_url = current_invoice.media_url.clone();
    
    // Store the latest prompt that was sent
    updated_invoice.prompt = Some(payload.prompt.clone());

    // 3. Save updated invoice to Firestore
    if let Err(e) = db::save_invoice_to_firestore(&payload.user_id, &payload.invoice_id, &updated_invoice).await {
        println!("Failed to save updated invoice to Firestore: {}", e);
        return Json(EditQuoteResponse {
            status: "error".to_string(),
            invoice_id: payload.invoice_id,
            message: format!("Failed to save to Firestore: {}", e),
        });
    }

    Json(EditQuoteResponse {
        status: "success".to_string(),
        invoice_id: payload.invoice_id,
        message: "Invoice updated and saved to Firestore".to_string(),
    })
}
