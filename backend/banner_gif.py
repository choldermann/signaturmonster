"""Animated GIF generator for email banners — single-scene and multi-scene."""
from PIL import Image, ImageDraw, ImageFont
import base64, io, re, html as html_mod, random

FONT_FAMILIES = {
    "sans": {
        "regular":     "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "bold":        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "italic":      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
        "bolditalic":  "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
    },
    "serif": {
        "regular":     "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "bold":        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "italic":      "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
        "bolditalic":  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf",
    },
    "mono": {
        "regular":     "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "bold":        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
        "italic":      "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Oblique.ttf",
        "bolditalic":  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-BoldOblique.ttf",
    },
}
FONT_FALLBACKS = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]

SPEED_MS = {"slow": 80, "medium": 55, "fast": 35}
FPS = 15


# ── helpers ───────────────────────────────────────────────────────────────────

def _hex(h: str) -> tuple:
    h = h.strip("#")
    if len(h) == 3:
        h = h[0]*2 + h[1]*2 + h[2]*2
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _blend_rgb(a: tuple, b: tuple, t: float) -> tuple:
    return tuple(max(0, min(255, int(a[i] + t * (b[i] - a[i])))) for i in range(3))


def _ease_out(t: float) -> float:
    return 1 - (1 - min(1.0, max(0.0, t))) ** 3


def _ease_inout(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def _font(size: int, bold: bool = False, italic: bool = False, family: str = "sans") -> ImageFont.FreeTypeFont:
    fam = FONT_FAMILIES.get(family, FONT_FAMILIES["sans"])
    if bold and italic:
        key = "bolditalic"
    elif bold:
        key = "bold"
    elif italic:
        key = "italic"
    else:
        key = "regular"
    path = fam.get(key)
    if path:
        try:
            return ImageFont.truetype(path, int(size))
        except OSError:
            pass
    # fallback: try sans regular
    for fallback_key in ("regular", "bold"):
        p = FONT_FAMILIES["sans"].get(fallback_key)
        if p:
            try:
                return ImageFont.truetype(p, int(size))
            except OSError:
                pass
    for p in FONT_FALLBACKS:
        try:
            return ImageFont.truetype(p, int(size))
        except OSError:
            pass
    return ImageFont.load_default()


def _html_to_plain(html: str) -> str:
    """Strip HTML tags and convert block elements to newlines for GIF rendering."""
    text = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
    text = re.sub(r'</(p|div|h[1-6]|li|tr)>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_mod.unescape(text)
    text = text.replace('\xa0', ' ')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _parse_color_segments(html_text: str, default_color: tuple,
                           bold: bool = False, italic: bool = False) -> list:
    """Parse inline HTML into [{text, color, bold, italic}] segments for PIL rendering."""
    from html.parser import HTMLParser

    class _P(HTMLParser):
        def __init__(self):
            super().__init__()
            self.stack = [{"color": default_color, "bold": bold, "italic": italic}]
            self.segs  = []

        def _cur(self): return self.stack[-1]

        def handle_starttag(self, tag, attrs):
            d = dict(attrs);  s = dict(self._cur());  tag = tag.lower()
            if tag in ("b", "strong"):  s["bold"]   = True
            elif tag in ("i", "em"):    s["italic"] = True
            elif tag == "font":
                c = d.get("color", "")
                if c:
                    try: s["color"] = _hex(c)
                    except Exception: pass
            elif tag == "span":
                for part in d.get("style", "").split(";"):
                    part = part.strip()
                    if part.startswith("color:"):
                        try: s["color"] = _hex(part[6:].strip())
                        except Exception: pass
            self.stack.append(s)

        def handle_endtag(self, _tag):
            if len(self.stack) > 1: self.stack.pop()

        def _emit(self, text):
            if text:
                s = dict(self._cur()); s["text"] = html_mod.unescape(text)
                self.segs.append(s)

        def handle_data(self, data): self._emit(data)
        def handle_entityref(self, name):
            self._emit({"amp":"&","lt":"<","gt":">","nbsp":" ","quot":'"'}.get(name,""))
        def handle_charref(self, name):
            try: self._emit(chr(int(name[1:],16) if name.startswith("x") else int(name)))
            except Exception: pass

    # strip block wrappers but keep content; drop <br> (single-line rendering)
    clean = re.sub(r'<br\s*/?>', ' ', html_text, flags=re.IGNORECASE)
    clean = re.sub(r'</?(?:div|p|h[1-6]|li|ul|ol)\b[^>]*>', '', clean, flags=re.IGNORECASE)
    p = _P(); p.feed(clean)
    # merge adjacent segments with the same color/style to reduce draw calls
    merged = []
    for seg in p.segs:
        if (merged
                and merged[-1]["color"] == seg["color"]
                and merged[-1]["bold"]  == seg["bold"]
                and merged[-1]["italic"] == seg["italic"]):
            merged[-1]["text"] += seg["text"]
        else:
            merged.append(seg)
    return merged


# ── animation helpers ─────────────────────────────────────────────────────────

def _anim_start(anim: str, W: int, H: int) -> tuple:
    if anim == "fade":         return 0, 0, 0.0
    if anim == "slide-left":   return W + 80, 0, 1.0
    if anim == "slide-right":  return -(W + 80), 0, 1.0
    if anim == "slide-top":    return 0, -(H + 30), 1.0
    if anim == "slide-bottom": return 0, H + 30, 1.0
    return 0, 0, 1.0


def _apply_anim(anim: str, progress: float, W: int, H: int) -> tuple:
    p = _ease_out(progress)
    if anim == "fade":         return 0, 0, p
    if anim == "slide-left":   return int((1 - p) * (W + 80)), 0, 1.0
    if anim == "slide-right":  return int(-(1 - p) * (W + 80)), 0, 1.0
    if anim == "slide-top":    return 0, int(-(1 - p) * (H + 30)), 1.0
    if anim == "slide-bottom": return 0, int((1 - p) * (H + 30)), 1.0
    return 0, 0, 1.0


def _apply_anim_exit(anim: str, progress: float, W: int, H: int) -> tuple:
    """progress 0→1: text goes from visible to gone."""
    p = _ease_out(progress)
    if anim == "fade":         return 0, 0, max(0.0, 1.0 - p)
    if anim == "slide-left":   return int(-p * (W + 80)), 0, 1.0
    if anim == "slide-right":  return int(p * (W + 80)), 0, 1.0
    if anim == "slide-top":    return 0, int(-p * (H + 30)), 1.0
    if anim == "slide-bottom": return 0, int(p * (H + 30)), 1.0
    return 0, 0, max(0.0, 1.0 - p)


# ── drawing ───────────────────────────────────────────────────────────────────

def _pos_pct(pos: str) -> float:
    """'left'/'top' → 0.0, 'center' → 0.5, 'right'/'bottom' → 1.0, '75' → 0.75"""
    mapping = {"left": 0.0, "top": 0.0, "center": 0.5, "right": 1.0, "bottom": 1.0}
    if pos in mapping: return mapping[pos]
    try: return max(0.0, min(1.0, float(pos) / 100))
    except: return 0.5


def _load_bg_image(data_url: str, w: int, h: int,
                   fit: str = "cover", pos_x: str = "center", pos_y: str = "center",
                   img_w_pct: float = 100.0, img_h_pct: float = 100.0) -> "Image.Image | None":
    try:
        raw = data_url.split(",", 1)[1] if "," in data_url else data_url
        src = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
        px, py = _pos_pct(pos_x), _pos_pct(pos_y)

        if fit == "fill":
            return src.resize((w, h), Image.LANCZOS)

        elif fit == "contain":
            scale = min(w / src.width, h / src.height)
            nw, nh = max(1, round(src.width * scale)), max(1, round(src.height * scale))
            src = src.resize((nw, nh), Image.LANCZOS)
            result = Image.new("RGB", (w, h), (0, 0, 0))
            result.paste(src, (max(0, round((w - nw) * px)), max(0, round((h - nh) * py))))
            return result

        elif fit == "auto-height":
            scale = h / src.height
            nw = max(1, round(src.width * scale))
            src = src.resize((nw, h), Image.LANCZOS)
            result = Image.new("RGB", (w, h), (0, 0, 0))
            left = max(0, round((w - nw) * px)) if nw < w else -round((nw - w) * px)
            result.paste(src, (left, 0))
            return result

        elif fit == "custom":
            cw = max(1, round(w * img_w_pct / 100))
            ch = max(1, round(h * img_h_pct / 100))
            src = src.resize((cw, ch), Image.LANCZOS)
            result = Image.new("RGB", (w, h), (0, 0, 0))
            ox = round((w - cw) * px)
            oy = round((h - ch) * py)
            result.paste(src, (ox, oy))
            return result

        else:  # cover (default)
            scale = max(w / src.width, h / src.height)
            nw, nh = max(1, round(src.width * scale)), max(1, round(src.height * scale))
            src = src.resize((nw, nh), Image.LANCZOS)
            left = round((nw - w) * px)
            top  = round((nh - h) * py)
            return src.crop((left, top, left + w, top + h))
    except Exception:
        return None


def _draw_bg(img: Image.Image, scene: dict, offset: int = 0):
    draw = ImageDraw.Draw(img)
    w, h = img.size

    if scene.get("bgType") == "image":
        bg_img = _load_bg_image(
            scene.get("bgImage", ""), w, h,
            fit       = scene.get("bgImageFit",    "cover"),
            pos_x     = scene.get("bgImageX",      "center"),
            pos_y     = scene.get("bgImageY",      "center"),
            img_w_pct = float(scene.get("bgImageWidth",  100)),
            img_h_pct = float(scene.get("bgImageHeight", 100)),
        )
        if bg_img:
            img.paste(bg_img)
            return

    c1 = _hex(scene.get("color1", "#fce499"))
    c2 = _hex(scene.get("color2", "#f08030"))

    if scene.get("bgType", "solid") != "gradient":
        draw.rectangle([0, 0, w, h], fill=c1)
        return

    direction = scene.get("gradientDir", "horizontal")
    if direction == "vertical":
        span = h * 2
        for y in range(h):
            raw = (y + offset) % span
            t = raw / span if raw < span // 2 else 1.0 - (raw - span // 2) / (span // 2)
            draw.line([(0, y), (w, y)], fill=_blend_rgb(c1, c2, t))
    elif direction == "radial":
        cx, cy = w // 2, h // 2
        max_r = int((w * w + h * h) ** 0.5 / 2) + 1
        for r in range(max_r, 0, -1):
            t = r / max_r
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=_blend_rgb(c1, c2, t))
    else:
        span = w * 2
        for x in range(w):
            raw = (x + offset) % span
            t = raw / span if raw < span // 2 else 1.0 - (raw - span // 2) / (span // 2)
            draw.line([(x, 0), (x, h)], fill=_blend_rgb(c1, c2, t))


def _sample_bg(scene: dict, x: int, y: int, w: int, h: int) -> tuple:
    if scene.get("bgType") == "image":
        return (128, 128, 128)
    c1 = _hex(scene.get("color1", "#fce499"))
    c2 = _hex(scene.get("color2", "#f08030"))
    if scene.get("bgType", "solid") != "gradient":
        return c1
    direction = scene.get("gradientDir", "horizontal")
    if direction == "radial":
        cx, cy = w / 2, h / 2
        max_r = (w * w + h * h) ** 0.5 / 2
        r = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
        t = min(1.0, r / max_r) if max_r > 0 else 0.0
        return _blend_rgb(c1, c2, t)
    t = (y / max(h-1, 1)) if direction == "vertical" else (x / max(w-1, 1))
    return _blend_rgb(c1, c2, t)


def _draw_bg_overlay(img: Image.Image, scene: dict):
    opacity = float(scene.get("bgOverlayOpacity", 0)) / 100
    if opacity <= 0:
        return
    color = _hex(scene.get("bgOverlayColor", "#000000"))
    overlay = Image.new("RGB", img.size, color)
    img.paste(Image.blend(img, overlay, opacity))


def _draw_pattern(img: Image.Image, scene: dict):
    """Draw a repeating pattern overlay on top of the background image."""
    pattern_type = scene.get("patternType", "none")
    if pattern_type == "none":
        return

    w, h = img.size
    sx = max(1, int(scene.get("patternSpacingX", 20)))
    sy = max(1, int(scene.get("patternSpacingY", 20)))
    size = max(1, int(scene.get("patternSize", 2)))
    color = _hex(scene.get("patternColor", "#ffffff"))
    opacity = min(100, max(0, int(scene.get("patternOpacity", 30)))) / 100

    if opacity <= 0:
        return

    # Create a mask (grayscale) and draw pattern on it
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    fill_val = int(255 * opacity)

    if pattern_type == "dots":
        x = sx // 2
        while x < w + size:
            y = sy // 2
            while y < h + size:
                draw.ellipse([x - size, y - size, x + size, y + size], fill=fill_val)
                y += sy
            x += sx

    elif pattern_type == "lines-h":
        y = sy // 2
        while y < h + size:
            half = size // 2
            draw.rectangle([0, y - half, w, y + half], fill=fill_val)
            y += sy

    elif pattern_type == "lines-v":
        x = sx // 2
        while x < w + size:
            half = size // 2
            draw.rectangle([x - half, 0, x + half, h], fill=fill_val)
            x += sx

    elif pattern_type == "grid":
        # Horizontal lines
        y = sy // 2
        while y < h + size:
            half = size // 2
            draw.rectangle([0, y - half, w, y + half], fill=fill_val)
            y += sy
        # Vertical lines
        x = sx // 2
        while x < w + size:
            half = size // 2
            draw.rectangle([x - half, 0, x + half, h], fill=fill_val)
            x += sx

    elif pattern_type == "noise":
        rng = random.Random(42)
        density = opacity
        for px in range(w):
            for py in range(h):
                if rng.random() < density * 0.3:
                    mask.putpixel((px, py), fill_val)

    # Composite the pattern color onto the image using the mask
    color_layer = Image.new("RGB", (w, h), color)
    img.paste(color_layer, mask=mask)


def _draw_border(img: Image.Image, scene: dict):
    bw = int(float(scene.get("borderWidth", 0)))
    if bw <= 0:
        return
    bc = _hex(scene.get("borderColor", "#ffffff"))
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for i in range(bw):
        draw.rectangle([i, i, w - 1 - i, h - 1 - i], outline=bc)


def _draw_text(draw: ImageDraw.Draw, scene: dict, w: int, h: int,
               dx: int = 0, dy: int = 0, alpha: float = 1.0,
               sub_dx: int = 0, sub_dy: int = 0, sub_alpha: float = 1.0):

    raw_text    = scene.get("text", "")
    raw_subtext = scene.get("subtext", "")
    tc      = _hex(scene.get("textColor",    "#333333"))
    sc_col  = _hex(scene.get("subtextColor", "#555555"))
    fsize   = int(scene.get("fontSize",    16))
    ssize   = int(scene.get("subtextSize", 12))
    bold    = scene.get("fontWeight", "bold") == "bold"
    align   = scene.get("textAlign", "center")
    pad     = int(scene.get("padding", 16))

    font_family  = scene.get("fontFamily",       "sans")
    italic_main  = scene.get("fontStyle",        "normal") in ("italic", "bolditalic")
    sub_family   = scene.get("subtextFontFamily","sans")
    italic_sub   = scene.get("subtextFontStyle", "normal") in ("italic", "bolditalic")

    fm = _font(fsize, bold, italic_main, font_family)
    fs = _font(ssize, False, italic_sub, sub_family)

    # Build segment lists — plain text = single segment, HTML = multiple
    def _segs(raw, default_color, is_bold, is_italic, f):
        if "<" in raw:
            segs = _parse_color_segments(raw, default_color, is_bold, is_italic)
            return segs if segs else [{"text": _html_to_plain(raw), "color": default_color, "bold": is_bold, "italic": is_italic}]
        return [{"text": raw, "color": default_color, "bold": is_bold, "italic": is_italic}]

    main_segs = _segs(raw_text,    tc,     bold,  italic_main, fm)
    sub_segs  = _segs(raw_subtext, sc_col, False, italic_sub,  fs)

    def _seg_font(seg, base_size, base_family):
        return _font(base_size, seg.get("bold", False), seg.get("italic", False), base_family)

    def _total_width(segs, base_size, base_family):
        total = 0
        for seg in segs:
            if not seg["text"]: continue
            f = _seg_font(seg, base_size, base_family)
            bb = draw.textbbox((0, 0), seg["text"], font=f)
            total += bb[2] - bb[0]
        return total

    # Heights (use the base font for height to keep consistent vertical centering)
    def _line_height(base_font, segs, base_size, base_family):
        # use tallest segment for height
        max_th = 0
        for seg in segs:
            if not seg["text"]: continue
            f = _seg_font(seg, base_size, base_family)
            bb = draw.textbbox((0, 0), seg["text"], font=f)
            max_th = max(max_th, bb[3] - bb[1])
        if max_th == 0:
            bb = draw.textbbox((0, 0), "Ag", font=base_font)
            max_th = bb[3] - bb[1]
        return max_th

    tw = _total_width(main_segs, fsize, font_family)
    th = _line_height(fm, main_segs, fsize, font_family)
    # ty0: offset to compensate for top bearing (use base font)
    bb_ref = draw.textbbox((0, 0), main_segs[0]["text"] if main_segs and main_segs[0]["text"] else "Ag", font=fm)
    ty0 = -bb_ref[1]

    total_h = th
    sub_tw = sub_th = sub_ty0 = 0
    has_sub = bool(raw_subtext and sub_segs and any(s["text"] for s in sub_segs))
    if has_sub:
        sub_tw = _total_width(sub_segs, ssize, sub_family)
        sub_th = _line_height(fs, sub_segs, ssize, sub_family)
        bb_sub_ref = draw.textbbox((0, 0), sub_segs[0]["text"] if sub_segs[0]["text"] else "Ag", font=fs)
        sub_ty0 = -bb_sub_ref[1]
        total_h += sub_th + 6

    base_y = (h - total_h) // 2

    def _x(width):
        if align == "center": return (w - width) // 2
        if align == "right":  return w - width - pad
        return pad

    t_sw = max(0, int(float(scene.get("textStrokeWidth", 0))))
    t_sc = _hex(scene.get("textStrokeColor", "#000000")) if t_sw > 0 else None
    t_sh_op = min(1.0, float(scene.get("textShadowOpacity", 0)) / 100)
    t_sh_x  = int(scene.get("textShadowX", 2))
    t_sh_y  = int(scene.get("textShadowY", 2))
    t_sh_c  = _hex(scene.get("textShadowColor", "#000000"))

    def _draw_segments(segs, base_size, base_family, start_x, y, ddx, ddy, a,
                       stroke_w, stroke_c, sh_op, sh_x, sh_y, sh_c_rgb):
        """Draw a sequence of colored segments left-to-right."""
        cur_x = start_x
        for seg in segs:
            t = seg["text"]
            if not t: continue
            seg_f  = _seg_font(seg, base_size, base_family)
            seg_bb = draw.textbbox((0, 0), t, font=seg_f)
            sw = seg_bb[2] - seg_bb[0]

            seg_color = seg["color"]
            if a < 1.0:
                bg = _sample_bg(scene, max(0, cur_x + sw // 2), max(0, y + (seg_bb[3]-seg_bb[1]) // 2), w, h)
                seg_color = _blend_rgb(bg, seg_color, a)

            if sh_op > 0 and a > 0:
                eff = sh_op * a
                bg_sh = _sample_bg(scene, max(0, cur_x + sw // 2 + sh_x), max(0, y + sh_y), w, h)
                sh_draw = _blend_rgb(bg_sh, sh_c_rgb, eff)
                draw.text((cur_x + ddx + sh_x, y + ddy + sh_y), t, font=seg_f, fill=sh_draw,
                          stroke_width=stroke_w, stroke_fill=sh_draw if stroke_w > 0 else None)

            stroke_fill = None
            if stroke_w > 0 and stroke_c:
                stroke_fill = (_blend_rgb(_sample_bg(scene, max(0, cur_x + sw // 2), max(0, y), w, h),
                                          stroke_c, a) if a < 1.0 else stroke_c)

            draw.text((cur_x + ddx, y + ddy), t, font=seg_f, fill=seg_color,
                      stroke_width=stroke_w, stroke_fill=stroke_fill)
            cur_x += sw

    # ── main text ──
    ty = base_y + ty0
    _draw_segments(main_segs, fsize, font_family,
                   _x(tw), ty, dx, dy, alpha,
                   t_sw, t_sc, t_sh_op, t_sh_x, t_sh_y, t_sh_c)

    # ── subtext ──
    if has_sub:
        s_sw = max(0, int(float(scene.get("subtextStrokeWidth", 0))))
        s_sc = _hex(scene.get("subtextStrokeColor", "#000000")) if s_sw > 0 else None
        s_sh_op = min(1.0, float(scene.get("subtextShadowOpacity", 0)) / 100)
        s_sh_x  = int(scene.get("subtextShadowX", 2))
        s_sh_y  = int(scene.get("subtextShadowY", 2))
        s_sh_c  = _hex(scene.get("subtextShadowColor", "#000000"))
        sy = base_y + th + 6 + sub_ty0
        _draw_segments(sub_segs, ssize, sub_family,
                       _x(sub_tw), sy, sub_dx, sub_dy, sub_alpha,
                       s_sw, s_sc, s_sh_op, s_sh_x, s_sh_y, s_sh_c)


def _render_scene_bg(w: int, h: int, scene: dict, bg_offset: int = 0) -> Image.Image:
    """Background + overlay + pattern only — no text, no border."""
    img = Image.new("RGB", (w, h))
    _draw_bg(img, scene, bg_offset)
    _draw_bg_overlay(img, scene)
    _draw_pattern(img, scene)
    return img


def _render_scene(w: int, h: int, scene: dict, bg_offset: int = 0,
                  dx: int = 0, dy: int = 0, text_alpha: float = 1.0,
                  sub_dx: int = 0, sub_dy: int = 0, sub_alpha: float = 1.0) -> Image.Image:
    img = _render_scene_bg(w, h, scene, bg_offset)
    _draw_text(ImageDraw.Draw(img), scene, w, h,
               dx=dx, dy=dy, alpha=text_alpha,
               sub_dx=sub_dx, sub_dy=sub_dy, sub_alpha=sub_alpha)
    _draw_border(img, scene)
    return img


def _transition_frame(a: Image.Image, b: Image.Image, t: float,
                      kind: str, w: int, h: int) -> Image.Image:
    t = _ease_inout(t)
    if kind == "fade":
        return Image.blend(a, b, t)
    result = Image.new("RGB", (w, h))
    if kind == "slide-left":
        off = int(w * t); result.paste(a, (-off, 0)); result.paste(b, (w - off, 0))
    elif kind == "slide-right":
        off = int(w * t); result.paste(a, (off, 0));  result.paste(b, (off - w, 0))
    elif kind == "slide-top":
        off = int(h * t); result.paste(a, (0, off));  result.paste(b, (0, off - h))
    elif kind == "slide-bottom":
        off = int(h * t); result.paste(a, (0, -off)); result.paste(b, (0, h - off))
    else:
        result.paste(b if t >= 0.5 else a, (0, 0))
    return result


# ── GIF export ────────────────────────────────────────────────────────────────

def _to_gif(frames: list, durations: list) -> bytes:
    if not frames:
        raise ValueError("No frames")
    w, h = frames[0].size
    combined = Image.new("RGB", (w, h * len(frames)))
    for i, f in enumerate(frames):
        combined.paste(f, (0, i * h))
    palette_src = combined.quantize(colors=255, dither=Image.Dither.NONE)
    quantized = [f.quantize(palette=palette_src, dither=0) for f in frames]
    buf = io.BytesIO()
    quantized[0].save(
        buf, format="GIF", save_all=True,
        append_images=quantized[1:],
        loop=0,
        duration=durations if len(set(durations)) > 1 else durations[0],
        optimize=False,
    )
    return buf.getvalue()


def _ms_to_frames(ms: int) -> int:
    return max(1, round(ms / 1000 * FPS))


# ── single-scene ──────────────────────────────────────────────────────────────

def _single_scene_gif(props: dict) -> bytes:
    W   = 600
    H   = max(40, int(props.get("height", 80)))
    n   = 22
    ms  = SPEED_MS.get(props.get("animSpeed", "medium"), 55)
    typ = props.get("animationType", "gradient-shift")

    # Frame 0: fully rendered static frame so Outlook (which shows only the first
    # frame of a GIF) always displays meaningful content instead of a blank/fade start.
    frames: list[Image.Image] = [_render_scene(W, H, props)]

    if typ == "gradient-shift":
        direction = props.get("gradientDir", "horizontal")
        span = W if direction != "vertical" else H
        for i in range(n):
            img = Image.new("RGB", (W, H))
            _draw_bg(img, props, int(i * span / n))
            _draw_bg_overlay(img, props)
            _draw_pattern(img, props)
            _draw_text(ImageDraw.Draw(img), props, W, H)
            _draw_border(img, props)
            frames.append(img)

    elif typ == "text-fade":
        bg = _render_scene_bg(W, H, props)
        for i in range(n):
            t = i / n
            alpha = _ease_out(t / 0.35) if t < 0.35 else (1.0 if t < 0.70 else 1.0 - _ease_out((t - 0.70) / 0.30))
            img = bg.copy()
            _draw_text(ImageDraw.Draw(img), props, W, H, alpha=alpha, sub_alpha=alpha)
            _draw_border(img, props)
            frames.append(img)

    elif typ in ("text-slide-left", "text-slide-right", "text-slide-top", "text-slide-bottom"):
        bg = _render_scene_bg(W, H, props)
        for i in range(n):
            t = i / n
            if   t < 0.10: progress, alpha = 0.0, 1.0
            elif t < 0.55: progress, alpha = _ease_out((t - 0.10) / 0.45), 1.0
            elif t < 0.85: progress, alpha = 1.0, 1.0
            else:          progress, alpha = 1.0, 1.0 - _ease_out((t - 0.85) / 0.15)

            if   typ == "text-slide-left":   ddx, ddy = int((1 - progress) * (W + 80)), 0
            elif typ == "text-slide-right":  ddx, ddy = int(-(1 - progress) * (W + 80)), 0
            elif typ == "text-slide-top":    ddx, ddy = 0, int(-(1 - progress) * (H + 30))
            else:                            ddx, ddy = 0, int((1 - progress) * (H + 30))

            img = bg.copy()
            _draw_text(ImageDraw.Draw(img), props, W, H, dx=ddx, dy=ddy, alpha=alpha,
                       sub_dx=ddx, sub_dy=ddy, sub_alpha=alpha)
            _draw_border(img, props)
            frames.append(img)

    elif typ == "combined":
        direction = props.get("gradientDir", "horizontal")
        span = W if direction != "vertical" else H
        for i in range(n):
            t = i / n
            if   t < 0.10: progress, alpha = 0.0, 1.0
            elif t < 0.55: progress, alpha = _ease_out((t - 0.10) / 0.45), 1.0
            elif t < 0.85: progress, alpha = 1.0, 1.0
            else:          progress, alpha = 1.0, 1.0 - _ease_out((t - 0.85) / 0.15)
            img = Image.new("RGB", (W, H))
            _draw_bg(img, props, int(i * span / n))
            _draw_bg_overlay(img, props)
            _draw_pattern(img, props)
            ddx = int((1 - progress) * (W + 80))
            _draw_text(ImageDraw.Draw(img), props, W, H, dx=ddx, alpha=alpha,
                       sub_dx=ddx, sub_alpha=alpha)
            _draw_border(img, props)
            frames.append(img)

    else:
        frames = [_render_scene(W, H, props)]

    return _to_gif(frames, [ms] * len(frames))


# ── multi-scene ───────────────────────────────────────────────────────────────

def _multi_scene_gif(props: dict, scenes: list) -> bytes:
    W = 600
    H = max(40, int(props.get("height", 80)))
    frame_ms = round(1000 / FPS)

    # Scene 0 is the Outlook fallback: rendered as a fully static frame 0 with
    # a 20ms hold. Animated clients see it as a barely-perceptible flash at each
    # loop restart; Outlook shows it as the sole static image via MSO conditional.
    frames:    list[Image.Image] = [_render_scene(W, H, scenes[0])]
    durations: list[int]         = [20]

    # Animation runs over scenes[1:] only, looping back to scenes[1] (never scenes[0]).
    anim_scenes = scenes[1:] if len(scenes) >= 2 else scenes
    n_anim = len(anim_scenes)

    for i, scene in enumerate(anim_scenes):
        next_scene = anim_scenes[(i + 1) % n_anim]
        prev_scene = anim_scenes[(i - 1) % n_anim]

        hold_ms    = max(200, int(scene.get("holdMs", 2500)))
        trans_ms   = max(0,   int(scene.get("transitionOutMs", 400)))
        trans_kind = scene.get("transitionOutType", "fade")

        main_same = prev_scene.get("text", "") == scene.get("text", "")
        sub_same  = prev_scene.get("subtext", "") == scene.get("subtext", "")
        text_anim = "none" if main_same else scene.get("textAnimation", "none")
        sub_anim  = "none" if sub_same  else scene.get("subtextAnimation", "none")

        n_hold     = _ms_to_frames(hold_ms)
        anim_count = max(1, int(n_hold * 0.45)) if (text_anim != "none" or sub_anim != "none") else 0

        for j in range(n_hold):
            if j < anim_count:
                progress = j / anim_count
                ddx, ddy, ta  = _apply_anim(text_anim, progress, W, H) if text_anim != "none" else (0, 0, 1.0)
                sdx, sdy, sa  = _apply_anim(sub_anim,  progress, W, H) if sub_anim  != "none" else (0, 0, 1.0)
                img = _render_scene(W, H, scene, dx=ddx, dy=ddy, text_alpha=ta,
                                    sub_dx=sdx, sub_dy=sdy, sub_alpha=sa)
            else:
                img = _render_scene(W, H, scene)
            frames.append(img)
            durations.append(frame_ms)

        if trans_ms > 0 and trans_kind != "none":
            n_trans        = _ms_to_frames(trans_ms)
            trans_frame_ms = max(20, round(trans_ms / n_trans))

            text_exit_anim = scene.get("textExitAnimation", "none")
            sub_exit_anim  = scene.get("subtextExitAnimation", "none")

            n_main_same   = scene.get("text", "") == next_scene.get("text", "")
            n_sub_same    = scene.get("subtext", "") == next_scene.get("subtext", "")
            eff_next_text = "none" if n_main_same else next_scene.get("textAnimation", "none")
            eff_next_sub  = "none" if n_sub_same  else next_scene.get("subtextAnimation", "none")

            has_text_anims = (text_exit_anim != "none" or sub_exit_anim != "none" or
                              eff_next_text  != "none" or eff_next_sub  != "none")

            if has_text_anims:
                frame_a_bg = _render_scene_bg(W, H, scene)
                frame_b_bg = _render_scene_bg(W, H, next_scene)
                for j in range(n_trans):
                    t  = j / max(n_trans - 1, 1)
                    fr = _transition_frame(frame_a_bg, frame_b_bg, t, trans_kind, W, H)
                    dr = ImageDraw.Draw(fr)

                    # scene A exits
                    if text_exit_anim != "none":
                        ex_dx, ex_dy, ex_a = _apply_anim_exit(text_exit_anim, t, W, H)
                    else:
                        ex_dx, ex_dy, ex_a = 0, 0, max(0.0, 1.0 - t)
                    if sub_exit_anim != "none":
                        esx_dx, esx_dy, esx_a = _apply_anim_exit(sub_exit_anim, t, W, H)
                    else:
                        esx_dx, esx_dy, esx_a = 0, 0, max(0.0, 1.0 - t)
                    _draw_text(dr, scene, W, H,
                               dx=ex_dx, dy=ex_dy, alpha=ex_a,
                               sub_dx=esx_dx, sub_dy=esx_dy, sub_alpha=esx_a)

                    # scene B enters
                    if eff_next_text != "none":
                        en_dx, en_dy, en_a = _apply_anim(eff_next_text, t, W, H)
                    else:
                        en_dx, en_dy, en_a = 0, 0, min(1.0, t)
                    if eff_next_sub != "none":
                        ensx_dx, ensx_dy, ensx_a = _apply_anim(eff_next_sub, t, W, H)
                    else:
                        ensx_dx, ensx_dy, ensx_a = 0, 0, min(1.0, t)
                    _draw_text(dr, next_scene, W, H,
                               dx=en_dx, dy=en_dy, alpha=en_a,
                               sub_dx=ensx_dx, sub_dy=ensx_dy, sub_alpha=ensx_a)

                    frames.append(fr)
                    durations.append(trans_frame_ms)
            else:
                b_dx,  b_dy,  b_ta = _anim_start(eff_next_text, W, H)
                b_sdx, b_sdy, b_sa = _anim_start(eff_next_sub,  W, H)
                frame_a = _render_scene(W, H, scene)
                frame_b = _render_scene(W, H, next_scene,
                                        dx=b_dx, dy=b_dy, text_alpha=b_ta,
                                        sub_dx=b_sdx, sub_dy=b_sdy, sub_alpha=b_sa)
                for j in range(n_trans):
                    t = j / max(n_trans - 1, 1)
                    frames.append(_transition_frame(frame_a, frame_b, t, trans_kind, W, H))
                    durations.append(trans_frame_ms)

    return _to_gif(frames, durations)


# ── public API ────────────────────────────────────────────────────────────────

def generate_gif(props: dict) -> bytes:
    scenes = props.get("scenes")
    if scenes and len(scenes) >= 2:
        return _multi_scene_gif(props, scenes)
    return _single_scene_gif(props)
