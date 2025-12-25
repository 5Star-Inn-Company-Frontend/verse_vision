from PIL import Image, ImageDraw

def create_icon():
    try:
        # Setup
        size = 1024
        scale = size / 80.0
        # Transparent background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Colors (Solid approximations based on the SVG gradients)
        color_v = "#7c3aed" # Violet-600
        color_eye = "#0ea5e9" # Sky-500

        # Helper to scale points
        def s(x, y):
            return (x * scale, y * scale)

        # Stroke width
        width_v = int(8 * scale)
        width_eye = int(4 * scale)

        # 1. Draw V Shape (Book)
        # M10 20 L40 70 L70 20
        points_v = [s(10, 20), s(40, 70), s(70, 20)]
        draw.line(points_v, fill=color_v, width=width_v, joint='curve')
        
        # Manually add round caps to the start and end of V
        r_v = width_v / 2
        p_start = points_v[0]
        p_end = points_v[-1]
        draw.ellipse([p_start[0]-r_v, p_start[1]-r_v, p_start[0]+r_v, p_start[1]+r_v], fill=color_v)
        draw.ellipse([p_end[0]-r_v, p_end[1]-r_v, p_end[0]+r_v, p_end[1]+r_v], fill=color_v)


        # 2. Draw Eye Shape
        # M10 35 Q40 5 70 35 Q40 65 10 35 Z
        
        # Function to evaluate Quadratic Bezier
        def get_quad_points(p0, p1, p2, steps=100):
            points = []
            for i in range(steps + 1):
                t = i / steps
                x = (1-t)**2 * p0[0] + 2*(1-t)*t * p1[0] + t**2 * p2[0]
                y = (1-t)**2 * p0[1] + 2*(1-t)*t * p1[1] + t**2 * p2[1]
                points.append((x, y))
            return points

        # Top Curve: 10,35 -> 40,5 -> 70,35
        p0 = (10, 35); p1 = (40, 5); p2 = (70, 35)
        top_curve = get_quad_points(s(*p0), s(*p1), s(*p2))
        
        # Bottom Curve: 70,35 -> 40,65 -> 10,35
        p3 = (70, 35); p4 = (40, 65); p5 = (10, 35)
        bottom_curve = get_quad_points(s(*p3), s(*p4), s(*p5))

        # Combine
        full_eye_points = top_curve + bottom_curve
        
        # Draw Eye Outline
        draw.line(full_eye_points, fill=color_eye, width=width_eye, joint='curve')

        # 3. Draw Pupil
        # circle cx="40" cy="35" r="8"
        center = s(40, 35)
        radius = 8 * scale
        # Fill circle
        draw.ellipse([center[0]-radius, center[1]-radius, center[0]+radius, center[1]+radius], fill=color_eye)

        # Save
        output_path = 'mobile_camera_flutter/assets/icon.png'
        img.save(output_path)
        print(f"Icon generated at {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_icon()
