import os
import sys
import shutil
import platform
import subprocess

def main():
    # Define paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "dist")
    work_dir = os.path.join(base_dir, "build")
    
    # Clean previous builds
    if os.path.exists(dist_dir):
        try:
            shutil.rmtree(dist_dir)
        except Exception:
            shutil.rmtree(dist_dir, ignore_errors=True)
    if os.path.exists(work_dir):
        try:
            shutil.rmtree(work_dir)
        except Exception:
            shutil.rmtree(work_dir, ignore_errors=True)
        
    os.makedirs(dist_dir, exist_ok=True)
    
    # Ensure Whisper models exist (download only Whisper)
    models_dir = os.path.join(base_dir, "models")
    if not os.path.exists(models_dir):
        os.makedirs(models_dir, exist_ok=True)
    print("Ensuring Whisper models are present...")
    subprocess.run([sys.executable, os.path.join(base_dir, "download_models.py")], check=True)
    
    # Get faster_whisper path to include assets
    import faster_whisper
    fw_path = os.path.dirname(faster_whisper.__file__)
    fw_assets = os.path.join(fw_path, "assets")

    # Determine platform separator for add-data
    sep = ";" if platform.system() == "Windows" else ":"
    
    # Define data paths
    bibles_dir = os.path.join(base_dir, "..", "api", "data", "bibles")
    if not os.path.exists(bibles_dir):
        print(f"WARNING: Bibles directory not found at {bibles_dir}")
        # We might want to abort or continue
    
    # Build offline_server
    print("Building offline_server...")
    
    # We use --onedir to keep it folder-based (faster startup than onefile, easier to debug)
    
    # Prepare specific model paths
    whisper_models_args = []
    for item in os.listdir(models_dir):
        if item.startswith("whisper"):
            src = os.path.join(models_dir, item)
            dst = os.path.join("models", item)
            whisper_models_args.extend(["--add-data", f"{src}{sep}{dst}"])

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--clean",
        "--name", "offline_server",
        "--distpath", dist_dir,
        "--workpath", work_dir,
        "--specpath", base_dir,
        # Add whisper models
        *whisper_models_args,
        # Add bibles data (destination: bibles_data)
        "--add-data", f"{bibles_dir}{sep}bibles_data",
        # Add faster_whisper assets (destination: faster_whisper/assets)
        "--add-data", f"{fw_assets}{sep}faster_whisper/assets",
        
        os.path.join(base_dir, "offline_server.py")
    ]
    
    subprocess.run(cmd, check=True)
    
    # Do NOT build marian_server to keep distribution small
    print("Build complete (offline_server only).")

if __name__ == "__main__":
    main()
