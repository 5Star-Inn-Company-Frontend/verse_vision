import os
import shutil
from PIL import Image

def distribute_icons():
    source_icon = 'mobile_camera_flutter/assets/icon.png'
    
    if not os.path.exists(source_icon):
        print(f"Error: Source icon not found at {source_icon}")
        return

    # Destinations
    destinations = [
        # Website
        {'path': 'website_backend_laravel/public/favicon.ico', 'format': 'ICO'},
        {'path': 'website_backend_laravel/public/favicon.png', 'format': 'PNG'},
        
        # Electron Build (for Installer/Executable)
        {'path': 'build/icon.ico', 'format': 'ICO'},
        {'path': 'build/icon.png', 'format': 'PNG'},
        
        # Electron Runtime (for Window Icon)
        {'path': 'public/icon.png', 'format': 'PNG'},
    ]

    for dest in destinations:
        dest_path = dest['path']
        dest_format = dest['format']
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        try:
            img = Image.open(source_icon)
            
            if dest_format == 'ICO':
                # For ICO, we might want multiple sizes
                img.save(dest_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
            else:
                img.save(dest_path, format='PNG')
                
            print(f"Successfully created {dest_path}")
        except Exception as e:
            print(f"Error creating {dest_path}: {e}")

if __name__ == "__main__":
    distribute_icons()
