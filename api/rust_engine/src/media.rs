use std::process::Command;
use std::fs;
use tempfile::tempdir;
use anyhow::Result;

pub async fn extract_frames_from_url(url: &str) -> Result<Vec<Vec<u8>>> {
    let dir = tempdir()?;
    let video_path = dir.path().join("video.mp4");

    // Download video
    let response = reqwest::get(url).await?.bytes().await?;
    fs::write(&video_path, response)?;

    // Run ffmpeg to extract frames at 1 fps
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(&video_path)
        .arg("-vf")
        .arg("fps=1")
        .arg(dir.path().join("frame_%04d.jpg"))
        .output()?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("FFMPEG failed: {}", err_msg));
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

    Ok(frames)
}
