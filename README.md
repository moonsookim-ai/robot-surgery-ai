# robot-surgery-ai
로봇수술 테마 스타트업 랜딩페이지
## Lumenara Surgical — robotic surgery company website (English)

A concept homepage for a (fictional) robotic-surgery company. The hero section is an
immersive, looping render of a **robot-assisted open laparotomy**: three wristed robotic
instruments pivoting around a remote centre of motion while a needle driver places a
running suture on a bowel anastomosis. The scene is modelled, lit, animated and rendered
entirely from code in **Blender** (Cycles).

```
index.html                    single-page site (hero, platform, technology lab, specialties, outcomes, training, company, demo form)
assets/css/style.css          styles (dark clinical theme, responsive, reduced-motion aware)
assets/js/main.js             interactions (hero parallax + surgeon-console HUD, tremor/motion-scaling demo, tabs, counters, form)
assets/media/                 Blender renders: hero.webm / hero.mp4 loop, hero-poster.jpg, macro.jpg
blender/build_surgical_scene.py   procedural Blender scene + render driver
blender/encode_hero.sh        PNG sequence -> web video / posters (ffmpeg)
```

### View the site

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
```

### Re-render the Blender scene

Blender can run as a Python module (`pip install bpy==5.2.3`, Python 3.13), or use a
Blender 5.x install with `blender -b -P blender/build_surgical_scene.py -- <args>`.

```bash
python blender/build_surgical_scene.py --mode preview --view hero  --out render        # quick 960x540 check
python blender/build_surgical_scene.py --mode still   --view hero  --frame 30 --out render
python blender/build_surgical_scene.py --mode still   --view macro --frame 30 --out render
python blender/build_surgical_scene.py --mode anim    --view hero  --out render/frames  # 96-frame seamless loop, 1280x720
blender/encode_hero.sh render/frames render/still_hero_030.png render/still_macro_030.png
```

What the scene contains (all procedural, no external assets):

- povidone-iodine–prepped skin, a retracted incision with skin / subcutaneous fat / rectus muscle layers
- wet small-bowel loops and mesenteric fat (subsurface scattering, clear-coat wetness, vessel and blood masks)
- a bowel anastomosis with a violet running suture, curved taper needle and a live suture strand
- Balfour-style steel retractors, lap sponge, surgical drapes
- three RCM-constrained robotic instruments (needle driver, grasper, Maryland bipolar) with cable-driven wrists and jaws
- twin focused surgical light heads, monitor rim light, shallow depth of field, AgX colour

> Concept website: Lumenara is fictional; product names, specifications and figures are illustrative.
