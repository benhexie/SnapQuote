use tokio::process::Command;
use std::fs;
use tempfile::tempdir;
use anyhow::Result;

pub async fn extract_media_from_url(url: &str) -> Result<(Vec<Vec<u8>>, Option<Vec<u8>>)> {
    let dir = tempdir()?;
    let video_path = dir.path().join("video.mp4");

    // Download video
    let response = reqwest::get(url).await?.bytes().await?;
    fs::write(&video_path, response)?;

    // Run ffmpeg to extract fewer, smaller frames and audio simultaneously to save time
    let audio_path = dir.path().join("audio.mp3");
    let frames_output = Command::new("ffmpeg")
        .arg("-i")
        .arg(&video_path)
        .arg("-vf")
        .arg("fps=0.5,scale=-1:480") // 1 frame every 2 seconds, max height 480px
        .arg("-q:v")
        .arg("5") // lower image quality
        .arg(dir.path().join("frame_%04d.jpg"))
        .arg("-vn")
        .arg("-acodec")
        .arg("libmp3lame")
        .arg("-q:a")
        .arg("5") // lower audio quality
        .arg(&audio_path)
        .output()
        .await?;

    if !frames_output.status.success() {
        let err_msg = String::from_utf8_lossy(&frames_output.stderr);
        return Err(anyhow::anyhow!("FFMPEG extraction failed: {}", err_msg));
    }
    
    let mut audio_data = None;
    if let Ok(data) = fs::read(&audio_path) {
        audio_data = Some(data);
    }

    // Read extracted frames
    let mut frames = Vec::new();
    let mut entries: Vec<_> = fs::read_dir(dir.path())?.filter_map(Result::ok).collect();
    // Sort to ensure sequential order of frames
    entries.sort_by_key(|e| e.path());

    for entry in entries {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("jpg") {
            frames.push(fs::read(&path)?);
        }
    }

    Ok((frames, audio_data))
}
