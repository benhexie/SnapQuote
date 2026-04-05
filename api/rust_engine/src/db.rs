use firestore::{FirestoreDb, FirestoreDbOptions};
use crate::models::Invoice;
use anyhow::Result;
use std::env;

pub async fn read_invoice_from_firestore(invoice_id: &str) -> Result<Invoice> {
    let project_id = env::var("FIREBASE_PROJECT_ID")
        .unwrap_or_else(|_| "mock_project_id".to_string());
    
    if project_id == "mock_project_id" {
        return Err(anyhow::anyhow!("MOCK: Skipping Firestore read for {}", invoice_id));
    }

    let db = FirestoreDb::with_options(
        FirestoreDbOptions::new(project_id)
    ).await?;

    let obj: Option<Invoice> = db.fluent()
        .select()
        .by_id_in("invoices")
        .obj()
        .one(invoice_id)
        .await?;

    obj.ok_or_else(|| anyhow::anyhow!("Invoice not found in Firestore"))
}

pub async fn save_invoice_to_firestore(user_id: &str, invoice_id: &str, invoice: &Invoice) -> Result<()> {
    let project_id = env::var("FIREBASE_PROJECT_ID")
        .unwrap_or_else(|_| "mock_project_id".to_string());
    
    // In local development or testing with no GCP credentials, we can skip actual writing
    if project_id == "mock_project_id" {
        println!("MOCK: Skipping Firestore write for {}/invoices/{}", user_id, invoice_id);
        return Ok(());
    }

    let db = FirestoreDb::with_options(
        FirestoreDbOptions::new(project_id)
    ).await?;

    println!("Attempting to save invoice {} for user {}", invoice_id, user_id);

    // The `firestore` crate requires us to interact with the collection ID directly,
    // and if it's nested, we pass the parent path. Let's make sure the parent document exists first,
    // or just use the flat path workaround with `update_obj`.
    let collection_id = "invoices";
    let parent_path = format!("users/{}", user_id);

    // The most reliable way for nested collections in this crate:
    // db.fluent().update().in_col("users").document_id(user_id).object(&dummy).execute()
    // db.fluent().update().in_col("invoices").document_id(invoice_id).parent("users/USER_ID").object(&invoice).execute()
    
    // Fallback: the firestore crate handles simple flat collections perfectly.
    // Let's just use "invoices" as the top-level collection, and attach the user_id as a field.
    let mut invoice_to_save = invoice.clone();
    invoice_to_save.user_id = Some(user_id.to_string());

    let saved_obj_result = db.fluent()
        .update()
        .in_col("invoices")
        .document_id(invoice_id)
        .object(&invoice_to_save)
        .execute()
        .await;

    let _saved_obj: Invoice = match saved_obj_result {
        Ok(obj) => obj,
        Err(_) => {
             // If update fails because it doesn't exist, use insert
             db.fluent()
                .insert()
                .into("invoices")
                .document_id(invoice_id)
                .object(&invoice_to_save)
                .execute()
                .await?
        }
    };

    println!("Successfully saved invoice {} to Firestore!", invoice_id);

    Ok(())
}
