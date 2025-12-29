from PIL import Image, ImageDraw
import os

def gradient_bg(width, height, top_color=(12, 74, 110), bottom_color=(124, 58, 237)):
    img = Image.new('RGB', (width, height), bottom_color)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        ratio = y / float(height - 1)
        r = int(top_color[0] * (1 - ratio) + bottom_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bottom_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bottom_color[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img

def main():
    src = os.path.join('mobile_camera_flutter', 'assets', 'icon.png')
    out = os.path.join('website_backend_laravel', 'public', 'share.png')

    if not os.path.exists(src):
        raise FileNotFoundError(f"Source icon not found: {src}")

    W, H = 1200, 630
    bg = gradient_bg(W, H)

    icon = Image.open(src).convert('RGBA')
    # Scale icon to fit nicely (about 40% of height)
    target_h = int(H * 0.4)
    scale = target_h / icon.height
    target_w = int(icon.width * scale)
    icon = icon.resize((target_w, target_h), Image.LANCZOS)

    # Center placement
    x = (W - target_w) // 2
    y = (H - target_h) // 2
    bg.paste(icon, (x, y), icon)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bg.save(out, format='PNG')
    print(f"Generated share image at {out}")

if __name__ == '__main__':
    main()

