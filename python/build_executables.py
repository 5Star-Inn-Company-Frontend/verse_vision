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
        shutil.rmtree(dist_dir)
    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
        
    os.makedirs(dist_dir, exist_ok=True)
    
    # Check for models
    models_dir = os.path.join(base_dir, "models")
    if not os.path.exists(models_dir):
        print("WARNING: Models directory not found. Running download_models.py...")
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
    
    # Build marian_server only if Marian models exist or explicitly requested
    build_marian = os.environ.get("BUILD_MARIAN", "0") in ("1", "true", "True", "YES", "yes")
    marian_models_args = []
    if os.path.exists(models_dir):
        for item in os.listdir(models_dir):
            if item.startswith("marian"):
                src = os.path.join(models_dir, item)
                dst = os.path.join("models", item)
                marian_models_args.extend(["--add-data", f"{src}{sep}{dst}"])
    if build_marian or len(marian_models_args) > 0:
        print("Building marian_server...")
        cmd_marian = [
            sys.executable,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--onedir",
            "--clean",
            "--name", "marian_server",
            "--distpath", dist_dir,
            "--workpath", work_dir,
            "--specpath", base_dir,
            # Add marian models
            *marian_models_args,
            
            os.path.join(base_dir, "marian_server.py")
        ]
        subprocess.run(cmd_marian, check=True)
    else:
        print("Skipping marian_server build (no marian models found and BUILD_MARIAN not set).")
    
    print("Build complete.")

if __name__ == "__main__":
    main()
