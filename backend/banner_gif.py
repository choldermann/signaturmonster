"""Animated GIF generator for email banners — single-scene and multi-scene."""
from PIL import Image, ImageDraw, ImageFont
import io

FONT_BOLD = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
FONT_REG = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
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


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for p in (FONT_BOLD if bold else FONT_REG):
        try:
            return ImageFont.truetype(p, int(size))
        except OSError:
            pass
    return ImageFont.load_default()


# ── animation helpers ─────────────────────────────────────────────────────────

def _anim_start(anim: str, W: int, H: int) -> tuple:
    """(dx, dy, alpha) at the very START of an animation — text is hidden/off-screen."""
    if anim == "fade":         return 0, 0, 0.0
    if anim == "slide-left":   return W + 80, 0, 1.0
    if anim == "slide-right":  return -(W + 80), 0, 1.0
    if anim == "slide-top":    return 0, -(H + 30), 1.0
    if anim == "slide-bottom": return 0, H + 30, 1.0
    return 0, 0, 1.0   # "none"


def _apply_anim(anim: str, progress: float, W: int, H: int) -> tuple:
    """(dx, dy, alpha) for a given animation progress 0→1."""
    p = _ease_out(progress)
    if anim == "fade":         return 0, 0, p
    if anim == "slide-left":   return int((1 - p) * (W + 80)), 0, 1.0
    if anim == "slide-right":  return int(-(1 - p) * (W + 80)), 0, 1.0
    if anim == "slide-top":    return 0, int(-(1 - p) * (H + 30)), 1.0
    if anim == "slide-bottom": return 0, int((1 - p) * (H + 30)), 1.0
    return 0, 0, 1.0   # "none"


# ── drawing ───────────────────────────────────────────────────────────────────

def _draw_bg(img: Image.Image, scene: dict, offset: int = 0):
    draw = ImageDraw.Draw(img)
    w, h = img.size
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
    else:
        span = w * 2
        for x in range(w):
            raw = (x + offset) % span
            t = raw / span if raw < span // 2 else 1.0 - (raw - span // 2) / (span // 2)
            draw.line([(x, 0), (x, h)], fill=_blend_rgb(c1, c2, t))


def _sample_bg(scene: dict, x: int, y: int, w: int, h: int) -> tuple:
    c1 = _hex(scene.get("color1", "#fce499"))
    c2 = _hex(scene.get("color2", "#f08030"))
    if scene.get("bgType", "solid") != "gradient":
        return c1
    t = (y / max(h-1, 1)) if scene.get("gradientDir") == "vertical" else (x / max(w-1, 1))
    return _blend_rgb(c1, c2, t)


def _draw_text(draw: ImageDraw.Draw, scene: dict, w: int, h: int,
               dx: int = 0, dy: int = 0, alpha: float = 1.0,
               sub_dx: int = 0, sub_dy: int = 0, sub_alpha: float = 1.0):
    """Draw main text and subtext with independent position/alpha per element."""
    text    = scene.get("text", "")
    subtext = scene.get("subtext", "")
    tc      = _hex(scene.get("textColor",    "#333333"))
    sc      = _hex(scene.get("subtextColor", "#555555"))
    fsize   = int(scene.get("fontSize",    16))
    ssize   = int(scene.get("subtextSize", 12))
    bold    = scene.get("fontWeight", "bold") == "bold"
    align   = scene.get("textAlign", "center")
    pad     = int(scene.get("padding", 16))

    fm  = _font(fsize, bold)
    fs  = _font(ssize, False)
    bb  = draw.textbbox((0, 0), text, font=fm)
    tw  = bb[2] - bb[0]
    th  = bb[3] - bb[1]
    ty0 = -bb[1]

    total_h = th
    sb = sh = sy0 = None
    if subtext:
        sb  = draw.textbbox((0, 0), subtext, font=fs)
        sh  = sb[3] - sb[1]
        sy0 = -sb[1]
        total_h += sh + 6

    base_y = (h - total_h) // 2

    def _x(width):
        if align == "center": return (w - width) // 2
        if align == "right":  return w - width - pad
        return pad

    # ── main text ──
    tx = _x(tw)
    ty = base_y + ty0
    draw_tc = tc
    if alpha < 1.0:
        bg = _sample_bg(scene, max(0, tx + tw // 2), max(0, ty + th // 2), w, h)
        draw_tc = _blend_rgb(bg, tc, alpha)
    draw.text((tx + dx, ty + dy), text, font=fm, fill=draw_tc)

    # ── subtext ──
    if subtext and sb is not None:
        sw  = sb[2] - sb[0]
        sx  = _x(sw)
        sy  = base_y + th + 6 + sy0
        draw_sc = sc
        if sub_alpha < 1.0:
            bg = _sample_bg(scene, max(0, sx + sw // 2), max(0, sy + sh // 2), w, h)
            draw_sc = _blend_rgb(bg, sc, sub_alpha)
        draw.text((sx + sub_dx, sy + sub_dy), subtext, font=fs, fill=draw_sc)


def _render_scene(w: int, h: int, scene: dict, bg_offset: int = 0,
                  dx: int = 0, dy: int = 0, text_alpha: float = 1.0,
                  sub_dx: int = 0, sub_dy: int = 0, sub_alpha: float = 1.0) -> Image.Image:
    img = Image.new("RGB", (w, h))
    _draw_bg(img, scene, bg_offset)
    _draw_text(ImageDraw.Draw(img), scene, w, h,
               dx=dx, dy=dy, alpha=text_alpha,
               sub_dx=sub_dx, sub_dy=sub_dy, sub_alpha=sub_alpha)
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


# ── single-scene (original animation presets) ─────────────────────────────────

def _single_scene_gif(props: dict) -> bytes:
    W   = 600
    H   = max(40, int(props.get("height", 80)))
    n   = 22
    ms  = SPEED_MS.get(props.get("animSpeed", "medium"), 55)
    typ = props.get("animationType", "gradient-shift")
    frames: list[Image.Image] = []

    if typ == "gradient-shift":
        direction = props.get("gradientDir", "horizontal")
        span = W if direction != "vertical" else H
        for i in range(n):
            img = Image.new("RGB", (W, H))
            _draw_bg(img, props, int(i * span / n))
            _draw_text(ImageDraw.Draw(img), props, W, H)
            frames.append(img)

    elif typ == "text-fade":
        bg = Image.new("RGB", (W, H))
        _draw_bg(bg, props, 0)
        for i in range(n):
            t = i / n
            alpha = _ease_out(t / 0.35) if t < 0.35 else (1.0 if t < 0.70 else 1.0 - _ease_out((t - 0.70) / 0.30))
            img = bg.copy()
            _draw_text(ImageDraw.Draw(img), props, W, H, alpha=alpha, sub_alpha=alpha)
            frames.append(img)

    elif typ in ("text-slide-left", "text-slide-right", "text-slide-top", "text-slide-bottom"):
        bg = Image.new("RGB", (W, H))
        _draw_bg(bg, props, 0)
        for i in range(n):
            t = i / n
            if   t < 0.10: progress, alpha = 0.0, 1.0
            elif t < 0.55: progress, alpha = _ease_out((t - 0.10) / 0.45), 1.0
            elif t < 0.85: progress, alpha = 1.0, 1.0
            else:          progress, alpha = 1.0, 1.0 - _ease_out((t - 0.85) / 0.15)

            if   typ == "text-slide-left":   dx, dy = int((1 - progress) * (W + 80)), 0
            elif typ == "text-slide-right":  dx, dy = int(-(1 - progress) * (W + 80)), 0
            elif typ == "text-slide-top":    dx, dy = 0, int(-(1 - progress) * (H + 30))
            else:                            dx, dy = 0, int((1 - progress) * (H + 30))

            img = bg.copy()
            _draw_text(ImageDraw.Draw(img), props, W, H, dx=dx, dy=dy, alpha=alpha,
                       sub_dx=dx, sub_dy=dy, sub_alpha=alpha)
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
            dx = int((1 - progress) * (W + 80))
            _draw_text(ImageDraw.Draw(img), props, W, H, dx=dx, alpha=alpha,
                       sub_dx=dx, sub_alpha=alpha)
            frames.append(img)

    else:
        img = Image.new("RGB", (W, H))
        _draw_bg(img, props, 0)
        _draw_text(ImageDraw.Draw(img), props, W, H)
        frames = [img]

    return _to_gif(frames, [ms] * len(frames))


# ── multi-scene ───────────────────────────────────────────────────────────────

def _multi_scene_gif(props: dict, scenes: list) -> bytes:
    W = 600
    H = max(40, int(props.get("height", 80)))
    frame_ms = round(1000 / FPS)

    frames:    list[Image.Image] = []
    durations: list[int]         = []

    for i, scene in enumerate(scenes):
        next_scene = scenes[(i + 1) % len(scenes)]
        prev_scene = scenes[(i - 1) % len(scenes)]

        hold_ms    = max(200, int(scene.get("holdMs", 2500)))
        trans_ms   = max(0,   int(scene.get("transitionOutMs", 400)))
        trans_kind = scene.get("transitionOutType", "fade")

        # ── smart animation: skip if text identical to previous scene ──
        main_same = prev_scene.get("text", "") == scene.get("text", "")
        sub_same  = prev_scene.get("subtext", "") == scene.get("subtext", "")

        text_anim = "none" if main_same else scene.get("textAnimation", "none")
        sub_anim  = "none" if sub_same  else scene.get("subtextAnimation", "none")

        # ── hold frames ──
        n_hold     = _ms_to_frames(hold_ms)
        anim_count = max(1, int(n_hold * 0.45)) if (text_anim != "none" or sub_anim != "none") else 0

        for j in range(n_hold):
            if j < anim_count:
                progress = j / anim_count
                dx,  dy,  ta = _apply_anim(text_anim, progress, W, H) if text_anim != "none" else (0, 0, 1.0)
                sdx, sdy, sa = _apply_anim(sub_anim,  progress, W, H) if sub_anim  != "none" else (0, 0, 1.0)
                img = _render_scene(W, H, scene,
                                    dx=dx, dy=dy, text_alpha=ta,
                                    sub_dx=sdx, sub_dy=sdy, sub_alpha=sa)
            else:
                img = _render_scene(W, H, scene)
            frames.append(img)
            durations.append(frame_ms)

        # ── transition frames ──
        if trans_ms > 0 and trans_kind != "none":
            n_trans = _ms_to_frames(trans_ms)
            frame_a = _render_scene(W, H, scene)

            # Render frame_b with next scene's text at its animation START position
            # so the text doesn't appear prematurely during the transition
            n_main_same = scene.get("text", "") == next_scene.get("text", "")
            n_sub_same  = scene.get("subtext", "") == next_scene.get("subtext", "")
            eff_next_text = "none" if n_main_same else next_scene.get("textAnimation", "none")
            eff_next_sub  = "none" if n_sub_same  else next_scene.get("subtextAnimation", "none")

            b_dx,  b_dy,  b_ta = _anim_start(eff_next_text, W, H)
            b_sdx, b_sdy, b_sa = _anim_start(eff_next_sub,  W, H)
            frame_b = _render_scene(W, H, next_scene,
                                    dx=b_dx, dy=b_dy, text_alpha=b_ta,
                                    sub_dx=b_sdx, sub_dy=b_sdy, sub_alpha=b_sa)

            trans_frame_ms = max(20, round(trans_ms / n_trans))
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
