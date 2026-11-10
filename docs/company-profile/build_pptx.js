// Lumenara Surgical — Company Profile deck (structured pptxgenjs build)
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const { applyTheme } = require("/root/.claude/skills/synced/4b0fde3c-6583-4d35-b314-64887e8a96ec_0c57ff8f-d351-4702-b84f-74a30f7fb489/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";
const MEDIA = "/home/user/robot-surgery-ai/assets/media";

// ---------- theme ----------
const HEX = {
  ink: "1A2733", white: "FFFFFF", navy: "0B1B2B", tint: "EEF5FA",
  accent: "1E8FD8", cyan: "3FB6FF", warn: "D97706", muted: "5B6B7A", ice: "9FDCFF", rule: "C9D6E0",
};
const THEME = {
  name: "Lumenara Clinical",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: HEX.ink, lt1: HEX.white, dk2: HEX.navy, lt2: HEX.tint,
    accent1: HEX.accent, accent2: HEX.cyan, accent3: HEX.warn, accent4: HEX.muted, accent5: HEX.ice, accent6: HEX.rule,
    hlink: HEX.accent, folHlink: HEX.muted,
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Lumenara Surgical — Company Profile";
pres.author = "Lumenara Surgical";
pres.company = "Lumenara Surgical";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const INK = C.text1, NAVY = C.text2, WHITE = C.background1, TINT = C.background2;
const ACCENT = C.accent1, CYAN = C.accent2, WARN = C.accent3, MUTED = C.accent4, ICE = C.accent5, RULE = C.accent6;

const SW = 13.333, SH = 7.5, MX = 0.6, CW = SW - 2 * MX;

// ---------- layouts ----------
const footer = (dark) => ([
  { text: { text: "LUMENARA SURGICAL  ·  Company Profile 2026", options: { x: MX, y: 7.0, w: 7, h: 0.3, fontSize: 10, color: dark ? ICE : MUTED, charSpacing: 2, margin: 0 } } },
]);
pres.defineSlideMaster({
  title: "Lumenara Title",
  background: { color: "05090D" },
  objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: MX, y: 4.35, w: 9, h: 0.4, fontSize: 14, bold: true, color: CYAN, charSpacing: 6, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 4.75, w: 12, h: 1.2, fontSize: 48, bold: true, color: WHITE, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: MX, y: 6.4, w: 9.5, h: 0.6, fontSize: 16, color: ICE, margin: 0 }, text: "" } },
  ],
});
const contentLayout = (name, dark) => pres.defineSlideMaster({
  title: name,
  background: { color: dark ? "0B1B2B" : "FFFFFF" },
  margin: [0.5, MX, 0.7, MX],
  objects: [
    { placeholder: { options: { name: "eyebrow", type: "body", x: MX, y: 0.42, w: 9, h: 0.3, fontSize: 12, bold: true, color: dark ? CYAN : ACCENT, charSpacing: 4, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.75, w: CW, h: 1.05, fontSize: 28, bold: true, color: dark ? WHITE : NAVY, valign: "top", align: "left", margin: 0 }, text: "" } },
    ...footer(dark),
  ],
  slideNumber: { x: SW - MX - 0.6, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: dark ? ICE : MUTED, align: "right" },
});
contentLayout("Lumenara Content", false);
contentLayout("Lumenara Content Dark", true);

// ---------- helpers ----------
let oid = 0;
const on = (p) => `${p}-${++oid}`;
const iconCache = {};
async function icon(name, color = "FFFFFF", size = 256) {
  const key = name + color;
  if (iconCache[key]) return iconCache[key];
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size: String(size) }));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return (iconCache[key] = "image/png;base64," + png.toString("base64"));
}
async function iconCircle(slide, name, x, y, d = 0.62, fill = ACCENT, glyph = "FFFFFF") {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: on("icon-bg") });
  const pad = d * 0.27;
  slide.addImage({ data: await icon(name, glyph), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, objectName: on("icon"), altText: name.replace(/^Fa/, "") });
}
const txt = (slide, text, o) => slide.addText(text, { isTextBox: true, margin: 0, fontSize: 14, color: INK, valign: "top", objectName: on("text"), ...o });
const card = (slide, x, y, w, h, fill = TINT) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { type: "none" }, objectName: on("card") });
const head = (slide, eyebrow, title) => {
  slide.addText(eyebrow.toUpperCase(), { placeholder: "eyebrow" });
  slide.addText(title, { placeholder: "title" });
};
const newSlide = (section, dark = false) => pres.addSlide({ masterName: dark ? "Lumenara Content Dark" : "Lumenara Content", sectionTitle: section });
const tableOpts = (colW, extra = {}) => ({
  x: MX, w: CW, colW, fontSize: 13, color: INK, valign: "middle",
  border: { type: "solid", pt: 0.75, color: HEX.rule }, margin: [0.06, 0.12, 0.06, 0.12], objectName: on("table"), ...extra,
});
const th = (text) => ({ text, options: { bold: true, color: WHITE, fill: { color: NAVY } } });
const tk = (text) => ({ text, options: { bold: true, color: NAVY, fill: { color: TINT } } });
const placeholderRun = (text) => ({ text: `[${text}]`, options: { bold: true, color: WARN } });
const notes = (slide, s) => slide.addNotes(s);

async function build() {
  const S = {
    intro: "Introduction", company: "Company", product: "Platform & Technology",
    clinical: "Clinical & Market Value", business: "Business & Growth", appendix: "Appendix",
  };

  // 1 — Title
  pres.addSection({ title: S.intro });
  let s = pres.addSlide({ masterName: "Lumenara Title", sectionTitle: S.intro });
  s.addImage({ path: path.join(MEDIA, "hero-poster.jpg"), x: 0, y: 0, w: SW, h: SH, sizing: { type: "cover", w: SW, h: SH }, objectName: "hero-image", altText: "Robot-assisted open laparotomy rendered in Blender" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: SH, fill: { color: "05090D", transparency: 45 }, line: { type: "none" }, objectName: "hero-shade" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 3.9, w: SW, h: 3.6, fill: { color: "05090D", transparency: 15 }, line: { type: "none" }, objectName: "title-shade" });
  s.addText("LUMENARA SURGICAL  ·  COMPANY PROFILE 2026", { placeholder: "eyebrow" });
  s.addText([{ text: "Precision beyond ", options: { color: WHITE } }, { text: "the human hand", options: { color: CYAN } }], { placeholder: "title" });
  s.addText("Lumenara Arc robotic surgical system  ·  Boston · Munich · Seoul", { placeholder: "body" });
  notes(s, "Opening: Lumenara builds one robotic platform for open, laparoscopic and micro-surgery. Hero image: robot-assisted open laparotomy rendered in Blender. Concept document; figures illustrative.");

  // 2 — Contents
  s = newSlide(S.intro);
  head(s, "Contents", "What this profile covers");
  const toc = [
    ["01", "Executive summary"], ["02", "Message from the CEO"], ["03", "Company overview"], ["04", "Milestones"],
    ["05", "Market opportunity"], ["06", "Lumenara Arc platform"], ["07", "MicroWrist instruments"], ["08", "Core technology"],
    ["09", "Specialties & procedures"], ["10", "Clinical value & outcomes"], ["11", "Competitive advantage"], ["12", "Adoption & training"],
    ["13", "Business model"], ["14", "Roadmap"], ["15", "Partnership & contact"], ["A", "Appendix"],
  ];
  toc.forEach(([n, label], i) => {
    const col = Math.floor(i / 8), row = i % 8;
    const x = MX + col * 6.2, y = 2.05 + row * 0.58;
    txt(s, n, { x, y, w: 0.6, h: 0.4, fontSize: 16, bold: true, color: ACCENT });
    txt(s, label, { x: x + 0.7, y, w: 5.2, h: 0.4, fontSize: 16, color: INK });
  });

  // 3 — Executive summary
  s = newSlide(S.intro, true);
  head(s, "01 · Executive summary", "One robotic platform for tremor-free, sub-millimetre control in open, laparoscopic and micro-surgery");
  txt(s, "Physiological tremor, fatigue and the limited range of the human wrist set a ceiling on surgical precision. Lumenara Arc removes it: a real-time motion engine filters tremor and scales motion down by up to 10:1, while cable-driven MicroWrist instruments articulate beyond any human wrist.", { x: MX, y: 2.05, w: 11.5, h: 1.2, fontSize: 16, color: ICE });
  const tiles = [["0.1", "mm", "Instrument tip motion resolution"], ["7", "DOF", "Degrees of freedom at the MicroWrist"], ["10:1", "", "Adjustable motion scaling"], ["4K", "3D", "Stereoscopic, fluorescence-ready vision"]];
  const tw = (CW - 3 * 0.3) / 4;
  tiles.forEach(([big, unit, label], i) => {
    const x = MX + i * (tw + 0.3);
    card(s, x, 3.65, tw, 2.75, "12283C");
    s.addText([{ text: big, options: { fontSize: 54, bold: true, color: WHITE } }, { text: unit ? "  " + unit : "", options: { fontSize: 20, bold: true, color: CYAN } }], { isTextBox: true, x: x + 0.3, y: 3.95, w: tw - 0.5, h: 1.2, margin: 0, valign: "bottom", objectName: on("stat") });
    txt(s, label, { x: x + 0.3, y: 5.3, w: tw - 0.6, h: 0.8, fontSize: 14, color: ICE });
  });

  // 4 — At a glance
  s = newSlide(S.intro);
  head(s, "01 · At a glance", "What we do, who we serve, why we are different and how we grow");
  const glance = [
    ["FaRobot", "What we do", "Design, manufacture and support the Lumenara Arc robotic surgical system and its MicroWrist instruments."],
    ["FaUserDoctor", "Who we serve", "Hospitals and surgical teams in general, colorectal, urologic, gynecologic, thoracic and reconstructive surgery."],
    ["FaCrosshairs", "Why we are different", "One platform for open, laparoscopic and micro-surgery; up to 10:1 motion scaling; haptic feedback; on-device AI."],
    ["FaChartLine", "How we grow", "System placements with recurring instrument, service and training revenue, backed by clinical partnerships."],
  ];
  const gw = (CW - 0.4) / 2, gh = 2.2;
  for (const [i, [ic, h, b]] of glance.entries()) {
    const x = MX + (i % 2) * (gw + 0.4), y = 2.1 + Math.floor(i / 2) * (gh + 0.3);
    card(s, x, y, gw, gh);
    await iconCircle(s, ic, x + 0.35, y + 0.35);
    txt(s, h, { x: x + 1.2, y: y + 0.4, w: gw - 1.5, h: 0.45, fontSize: 18, bold: true, color: NAVY });
    txt(s, b, { x: x + 1.2, y: y + 0.95, w: gw - 1.5, h: 1.1, fontSize: 15 });
  }

  // 5 — CEO message
  pres.addSection({ title: S.company });
  s = newSlide(S.company);
  head(s, "02 · Message from the CEO", "Technology should extend a surgeon's skill, never replace their judgement");
  s.addImage({ data: await icon("FaQuoteLeft", HEX.accent), x: MX, y: 2.15, w: 0.6, h: 0.5, objectName: "quote-mark", altText: "Quotation mark" });
  txt(s, "When we founded Lumenara, we asked surgeons one question: what would you do if your hands were perfectly steady? Their answers shaped everything we build: sutures placed exactly where intended, vessels repaired below a millimetre, and long reconstructions finished with the precision of the first stitch.", { x: MX + 0.9, y: 2.1, w: 7.0, h: 2.4, fontSize: 17, italic: true, color: NAVY });
  txt(s, "We measure success by what happens after surgery: shorter recoveries, fewer complications and surgeons who can operate at their best for their whole careers.", { x: MX + 0.9, y: 4.6, w: 7.0, h: 1.1, fontSize: 15 });
  s.addText([placeholderRun("Name of CEO"), { text: "\nCo-founder and Chief Executive Officer", options: { color: MUTED, fontSize: 13, bold: false } }], { isTextBox: true, x: MX + 0.9, y: 5.85, w: 7, h: 0.8, margin: 0, fontSize: 15, objectName: "ceo-sign" });
  s.addImage({ path: path.join(MEDIA, "macro.jpg"), x: 8.85, y: 2.1, w: 3.88, h: 4.6, sizing: { type: "cover", w: 3.88, h: 4.6 }, rounding: false, objectName: "ceo-image", altText: "MicroWrist needle driver close-up" });

  // 6 — Mission / vision / values
  s = newSlide(S.company);
  head(s, "03 · Company overview", "Our mission is to give every surgeon the steadiest hands in medicine");
  const mvv = [
    ["FaBullseye", "Mission", "Give every surgeon the steadiest hands in medicine."],
    ["FaEye", "Vision", "A world where the precision of surgery is limited by judgement, not by anatomy or fatigue."],
    ["FaHandshake", "Values", "Patients first · Built with surgeons · Evidence over claims · Safety by design · One team across three continents"],
  ];
  const mw = (CW - 0.6) / 3;
  for (const [i, [ic, h, b]] of mvv.entries()) {
    const x = MX + i * (mw + 0.3);
    card(s, x, 2.15, mw, 4.4);
    await iconCircle(s, ic, x + 0.4, 2.55, 0.8);
    txt(s, h, { x: x + 0.4, y: 3.6, w: mw - 0.8, h: 0.5, fontSize: 20, bold: true, color: NAVY });
    txt(s, b, { x: x + 0.4, y: 4.2, w: mw - 0.8, h: 2.1, fontSize: 16 });
  }

  // 7 — Facts + locations
  s = newSlide(S.company);
  head(s, "03 · Company overview", "Founded in 2016, more than 900 people across three R&D centres");
  const facts = [["2016", "Founded in Boston"], ["900+", "Engineers, clinicians and specialists"], ["3", "R&D and training centres"], ["40+", "Wristed MicroWrist instruments"]];
  facts.forEach(([b, l], i) => {
    const y = 2.1 + i * 1.12;
    txt(s, b, { x: MX, y, w: 2.2, h: 0.6, fontSize: 34, bold: true, color: ACCENT });
    txt(s, l, { x: MX + 2.3, y: y + 0.12, w: 2.4, h: 0.6, fontSize: 14, color: INK });
  });
  const sites = [
    ["Boston, USA", "Headquarters. Console, robotics and MicroWrist engineering; motion engine and haptics."],
    ["Munich, Germany", "Precision mechanics, sterilization and manufacturing engineering; European clinical affairs."],
    ["Seoul, Korea", "Imaging, AI scene understanding and software platform; Asia-Pacific training center."],
  ];
  for (const [i, [h, b]] of sites.entries()) {
    const y = 2.1 + i * 1.5;
    card(s, 5.4, y, 7.33, 1.3);
    await iconCircle(s, "FaLocationDot", 5.7, y + 0.34, 0.62);
    txt(s, h, { x: 6.55, y: y + 0.2, w: 6, h: 0.4, fontSize: 17, bold: true, color: NAVY });
    txt(s, b, { x: 6.55, y: y + 0.62, w: 5.95, h: 0.6, fontSize: 14 });
  }
  s.addText([{ text: "Regulatory status: ", options: { color: INK } }, placeholderRun("To be provided")], { isTextBox: true, x: 5.4, y: 6.6, w: 7.33, h: 0.3, margin: 0, fontSize: 12, objectName: "reg-status" });

  // 8 — Milestones timeline
  s = newSlide(S.company);
  head(s, "04 · Milestones", "From a surgeon-led research project to a platform for open, laparoscopic and micro-surgery");
  const ms = [
    ["2016", "Founded in Boston by surgeons, roboticists and imaging scientists"],
    ["2018", "First cable-driven MicroWrist prototype and tremor-filtering motion engine"],
    ["2019", "Munich precision-engineering center opens"],
    ["2021", "Seoul imaging and AI center; first 4K stereoscopic vision tower"],
    ["2023", "Lumenara Arc introduced with open and MIS docking"],
    ["2025", "40+ wristed instruments; AI tissue and vessel tracking"],
    ["2026", "Arc 2 with 10:1 scaling and 5 mm instruments; Seoul Training Center"],
  ];
  const lineY = 3.55;
  s.addShape(pres.shapes.LINE, { x: MX + 0.8, y: lineY, w: CW - 1.6, h: 0, line: { color: RULE, width: 2 }, objectName: "timeline" });
  const bw = 1.6, step = (CW - bw) / (ms.length - 1);
  ms.forEach(([yr, d], i) => {
    const cx = MX + bw / 2 + i * step;
    const last = i === ms.length - 1;
    s.addShape(pres.shapes.OVAL, { x: cx - 0.13, y: lineY - 0.13, w: 0.26, h: 0.26, fill: { color: last ? CYAN : ACCENT }, line: { color: WHITE, width: 2 }, objectName: on("dot") });
    const bx = cx - bw / 2;
    txt(s, yr, { x: bx, y: 2.75, w: bw, h: 0.5, fontSize: 22, bold: true, color: last ? ACCENT : NAVY, align: "center" });
    txt(s, d, { x: bx, y: 3.95, w: bw, h: 2.2, fontSize: 13, align: "center" });
  });
  txt(s, "Dates before 2026 are illustrative for this concept document.", { x: MX, y: 6.5, w: CW, h: 0.3, fontSize: 11, italic: true, color: MUTED });

  // 9 — Problem / response
  pres.addSection({ title: S.product });
  s = newSlide(S.product);
  head(s, "05 · Market opportunity", "Surgery now asks for more precision than the unaided hand can reliably deliver");
  const prob = [
    ["FaWaveSquare", "Physiological tremor", "8–12 Hz tremor limits fine suturing", "Real-time tremor filtering"],
    ["FaMicroscope", "Scale of anatomy", "Vessels below 0.8 mm at the edge of manual technique", "10:1 scaling, 0.1 mm tip resolution"],
    ["FaArrowsRotate", "Restricted access", "Rigid tools cannot turn corners deep in the body", "7-DOF wrist, ±90° articulation"],
    ["FaUserDoctor", "Surgeon fatigue", "Long cases in awkward postures reduce consistency", "Seated, ergonomic console"],
    ["FaLayerGroup", "Open vs. MIS divide", "Most robots serve port-based surgery only", "Open and MIS docking modes"],
  ];
  txt(s, "CHALLENGE", { x: MX + 0.85, y: 2.0, w: 3, h: 0.3, fontSize: 11, bold: true, color: MUTED, charSpacing: 2 });
  txt(s, "WHAT HAPPENS TODAY", { x: 4.6, y: 2.0, w: 4, h: 0.3, fontSize: 11, bold: true, color: MUTED, charSpacing: 2 });
  txt(s, "LUMENARA ARC", { x: 9.0, y: 2.0, w: 3.7, h: 0.3, fontSize: 11, bold: true, color: ACCENT, charSpacing: 2 });
  for (const [i, [ic, c, today, arc]] of prob.entries()) {
    const y = 2.4 + i * 0.86;
    if (i % 2 === 0) card(s, MX, y, CW, 0.76);
    await iconCircle(s, ic, MX + 0.15, y + 0.13, 0.5);
    txt(s, c, { x: MX + 0.85, y: y + 0.22, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: NAVY });
    txt(s, today, { x: 4.6, y: y + 0.22, w: 4.2, h: 0.4, fontSize: 14 });
    txt(s, arc, { x: 9.0, y: y + 0.22, w: 3.7, h: 0.4, fontSize: 14, bold: true, color: ACCENT });
  }

  // 10 — Market context
  s = newSlide(S.product);
  head(s, "05 · Market context", "Robotic surgery is expanding into more specialties, case types and surgeons per system");
  const mk = [
    ["FaGlobe", "Global surgical robotics market", "To be provided from a cited market report"],
    ["FaHospital", "Annual procedures addressable by Arc", "To be provided"],
  ];
  for (const [i, [ic, h, ph]] of mk.entries()) {
    const x = MX + i * (6.2);
    card(s, x, 2.15, 5.9, 2.4);
    await iconCircle(s, ic, x + 0.4, 2.5, 0.7);
    txt(s, h, { x: x + 0.4, y: 3.35, w: 5.1, h: 0.45, fontSize: 17, bold: true, color: NAVY });
    s.addText([placeholderRun(ph)], { isTextBox: true, x: x + 0.4, y: 3.85, w: 5.1, h: 0.5, margin: 0, fontSize: 15, objectName: on("ph") });
  }
  txt(s, "Priority regions", { x: MX, y: 4.95, w: 4, h: 0.4, fontSize: 17, bold: true, color: NAVY });
  const regions = [["North America", "Installed-base growth, academic partners"], ["Europe", "DACH first, from the Munich center"], ["Asia-Pacific", "Korea first, from the Seoul Training Center"]];
  regions.forEach(([r, d], i) => {
    const x = MX + i * 4.1;
    txt(s, r, { x, y: 5.45, w: 3.8, h: 0.4, fontSize: 15, bold: true, color: ACCENT });
    txt(s, d, { x, y: 5.85, w: 3.8, h: 0.6, fontSize: 14 });
  });
  txt(s, "Market figures are intentionally left blank. Insert data from a cited source before external distribution.", { x: MX, y: 6.55, w: CW, h: 0.3, fontSize: 11, italic: true, color: MUTED });

  // 11 — Platform
  s = newSlide(S.product);
  head(s, "06 · The Lumenara Arc platform", "One system for open, laparoscopic and micro-surgical procedures");
  const comps = [
    ["FaDesktop", "Arc Console", "Where the surgeon operates: seated, focused and in full view of the team.", "4K stereoscopic viewer · haptic hand controllers · eye-tracked camera · 1:1–10:1 scaling"],
    ["FaRobot", "Arc Patient Cart", "Four slim arms that pivot around a software-defined remote centre of motion.", "Open and MIS docking · active collision avoidance · setup in under 5 minutes"],
    ["FaTowerBroadcast", "Arc Vision Tower", "Imaging, energy and intelligence for the whole team.", "4K 3D imaging · ICG fluorescence · AI tissue and vessel tracking · case recording"],
  ];
  for (const [i, [ic, h, d, f]] of comps.entries()) {
    const x = MX + i * (mw + 0.3);
    card(s, x, 2.15, mw, 4.45);
    await iconCircle(s, ic, x + 0.4, 2.5, 0.8);
    txt(s, h, { x: x + 0.4, y: 3.5, w: mw - 0.8, h: 0.5, fontSize: 20, bold: true, color: NAVY });
    txt(s, d, { x: x + 0.4, y: 4.05, w: mw - 0.8, h: 1.1, fontSize: 15 });
    txt(s, f, { x: x + 0.4, y: 5.25, w: mw - 0.8, h: 1.2, fontSize: 13, color: ACCENT, bold: true });
  }

  // 12 — Case flow
  s = newSlide(S.product);
  head(s, "06 · How a case flows", "Dock, lock the pivot, operate, verify and learn, in one continuous workflow");
  const flow = [
    ["Dock", "Position the cart and dock the arms over the incision or to the ports."],
    ["Lock the pivot", "Each arm locks a remote centre of motion so the body wall takes no strain."],
    ["Operate", "Tremor is filtered and motion scaled in real time from the console."],
    ["Verify", "Fluorescence and AI overlays confirm perfusion and critical structures."],
    ["Learn", "The case is recorded securely for review, training and analytics."],
  ];
  const fw = (CW - 4 * 0.25) / 5;
  flow.forEach(([h, d], i) => {
    const x = MX + i * (fw + 0.25);
    card(s, x, 2.3, fw, 3.9);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 2.6, w: 0.7, h: 0.7, fill: { color: ACCENT }, line: { type: "none" }, objectName: on("step") });
    txt(s, String(i + 1), { x: x + 0.3, y: 2.6, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: WHITE, align: "center", valign: "middle" });
    txt(s, h, { x: x + 0.3, y: 3.55, w: fw - 0.5, h: 0.45, fontSize: 17, bold: true, color: NAVY });
    txt(s, d, { x: x + 0.3, y: 4.1, w: fw - 0.5, h: 1.9, fontSize: 14 });
  });

  // 13 — MicroWrist
  s = newSlide(S.product);
  head(s, "07 · MicroWrist instruments", "A wrist that turns where a human hand can't");
  s.addImage({ path: path.join(MEDIA, "macro.jpg"), x: MX, y: 2.1, w: 6.3, h: 4.6, sizing: { type: "cover", w: 6.3, h: 4.6 }, objectName: "microwrist-image", altText: "MicroWrist needle driver passing a curved needle through bowel tissue" });
  const spec = [["Wrist articulation", "±90° pitch · ±90° yaw"], ["Roll", "540° continuous"], ["Degrees of freedom", "7 at the tip"], ["Shaft diameter", "8 mm and 5 mm"], ["Tip resolution", "0.1 mm"], ["Instrument library", "40+ wristed tools"], ["Usage tracking", "Chip-verified life"]];
  s.addTable([[th("Specification"), th("Value")], ...spec.map(([a, b]) => [tk(a), b])], tableOpts([2.4, 3.43], { x: 7.3, w: 5.43, y: 2.1, fontSize: 14, rowH: 0.52 }));

  // 14 — Instrument families
  s = newSlide(S.product);
  head(s, "07 · Instrument families", "More than 40 wristed tools across suturing, grasping, dissection and supermicrosurgery");
  const fam = [
    ["FaLink", "Suturing", "Large and micro needle drivers, including suture-cut variants."],
    ["FaHandHoldingMedical", "Grasping & retraction", "Cadiere, fenestrated and atraumatic bowel graspers."],
    ["FaScissors", "Dissection & energy", "Curved and micro scissors, Maryland and fenestrated bipolar, monopolar hook and spatula."],
    ["FaMicroscope", "Supermicrosurgery (Arc 2)", "5 mm instruments for vessels and lymphatics below 0.8 mm."],
  ];
  for (const [i, [ic, h, b]] of fam.entries()) {
    const x = MX + (i % 2) * (gw + 0.4), y = 2.1 + Math.floor(i / 2) * (gh + 0.3);
    card(s, x, y, gw, gh);
    await iconCircle(s, ic, x + 0.35, y + 0.35);
    txt(s, h, { x: x + 1.2, y: y + 0.4, w: gw - 1.5, h: 0.45, fontSize: 18, bold: true, color: NAVY });
    txt(s, b, { x: x + 1.2, y: y + 0.95, w: gw - 1.5, h: 1.1, fontSize: 15 });
  }

  // 15 — Core technology grid
  s = newSlide(S.product);
  head(s, "08 · Core technology", "Seven technologies that turn a surgeon's intent into steady, precise motion");
  const tech = [
    ["FaWaveSquare", "Motion engine", "Filters 8–12 Hz tremor; scales motion 1:1 to 10:1."],
    ["FaCrosshairs", "Remote centre of motion", "Software-locked pivot protects the body wall."],
    ["FaHandHoldingMedical", "Haptic feedback", "Tissue and suture tension returned down to 0.05 N."],
    ["FaBrain", "AI scene understanding", "Real-time segmentation of tissue, vessels and tools."],
    ["FaSun", "Fluorescence imaging", "Near-infrared ICG reveals perfusion in one click."],
    ["FaShieldHalved", "Collision-aware arms", "Live kinematic model keeps arms and team safe."],
    ["FaChartLine", "Connected insights", "Case analytics for surgeons and teams."],
  ];
  const tcw = (CW - 3 * 0.25) / 4, tch = 2.15;
  for (const [i, [ic, h, b]] of tech.entries()) {
    const x = MX + (i % 4) * (tcw + 0.25), y = 2.05 + Math.floor(i / 4) * (tch + 0.25);
    card(s, x, y, tcw, tch);
    await iconCircle(s, ic, x + 0.3, y + 0.3, 0.6);
    txt(s, h, { x: x + 0.3, y: y + 0.98, w: tcw - 0.6, h: 0.5, fontSize: 15, bold: true, color: NAVY, valign: "bottom" });
    txt(s, b, { x: x + 0.3, y: y + 1.55, w: tcw - 0.6, h: 0.55, fontSize: 13 });
  }
  const lx = MX + 3 * (tcw + 0.25), ly = 2.05 + tch + 0.25;
  card(s, lx, ly, tcw, tch, NAVY);
  txt(s, "Try it", { x: lx + 0.3, y: ly + 0.35, w: tcw - 0.6, h: 0.4, fontSize: 15, bold: true, color: CYAN });
  txt(s, "An interactive motion-engine demo runs on the Technology page of our website.", { x: lx + 0.3, y: ly + 0.8, w: tcw - 0.6, h: 1.2, fontSize: 13, color: WHITE });

  // 16 — Motion engine chart
  s = newSlide(S.product);
  head(s, "08 · How the motion engine works", "Tremor is filtered out and motion scaled down before it reaches the instrument tip");
  const N = 60, labels = [], hand = [], tip = [];
  let sm = 0;
  for (let k = 0; k < N; k++) {
    const tt = k / 20;
    const intent = 6 * Math.sin(tt * 1.4);
    const tremor = 1.6 * Math.sin(tt * 2 * Math.PI * 9.3 / 4) + 0.9 * Math.sin(tt * 2 * Math.PI * 11.7 / 4 + 1.3);
    const h = intent + tremor;
    sm += ((h / 5) - sm) * 0.25;
    labels.push(k % 10 === 0 ? (k * 50 / 1000).toFixed(1) + " s" : ""); hand.push(+h.toFixed(2)); tip.push(+sm.toFixed(2));
  }
  s.addChart(pres.charts.LINE, [
    { name: "Surgeon hand input (mm)", labels, values: hand },
    { name: "Instrument tip output, 5:1 + filter (mm)", labels, values: tip },
  ], {
    x: MX, y: 2.0, w: 7.6, h: 4.75, objectName: "motion-chart",
    chartColors: [HEX.warn, HEX.accent], lineSize: 2, lineDataSymbol: "none",
    showTitle: true, title: "Illustrative signal: hand input vs. instrument tip", titleFontSize: 13, titleColor: HEX.navy, titleFontFace: "+mn-lt",
    showLegend: true, legendPos: "b", legendFontSize: 11, legendFontFace: "+mn-lt", legendColor: HEX.ink,
    catAxisLabelColor: HEX.muted, valAxisLabelColor: HEX.muted, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", catAxisLabelFrequency: 10,
    valGridLine: { color: "E3EAF0", size: 0.5 }, catGridLine: { style: "none" },
  });
  const me = [["Capture", "Sample the surgeon's hand position at high frequency."], ["Filter", "Remove the 8–12 Hz tremor band, keep deliberate motion."], ["Scale", "Scale motion down, e.g. 5:1 for suturing, 10:1 for micro."], ["Drive", "Compute arm and wrist joints with the RCM locked."], ["Feel", "Return tip forces to the hands as haptic feedback."]];
  me.forEach(([h, d], i) => {
    const y = 2.05 + i * 0.95;
    s.addShape(pres.shapes.OVAL, { x: 8.6, y, w: 0.5, h: 0.5, fill: { color: ACCENT }, line: { type: "none" }, objectName: on("step") });
    txt(s, String(i + 1), { x: 8.6, y, w: 0.5, h: 0.5, fontSize: 15, bold: true, color: WHITE, align: "center", valign: "middle" });
    txt(s, h, { x: 9.3, y: y - 0.02, w: 3.4, h: 0.35, fontSize: 15, bold: true, color: NAVY });
    txt(s, d, { x: 9.3, y: y + 0.33, w: 3.43, h: 0.55, fontSize: 12 });
  });

  // 17 — Specialties
  pres.addSection({ title: S.clinical });
  s = newSlide(S.clinical);
  head(s, "09 · Specialties & procedures", "Built for the procedures that demand the most precision");
  const spRows = [
    ["General & Colorectal", "Stable traction and wristed suturing for intracorporeal anastomoses and deep pelvic dissection", "Colectomy · LAR · hernia · cholecystectomy"],
    ["Urology", "Nerve-sparing dissection and watertight anastomosis in the confined pelvis", "Prostatectomy · partial nephrectomy · pyeloplasty"],
    ["Gynecology", "Visualization and articulation for complex benign and oncologic cases", "Hysterectomy · myomectomy · sacrocolpopexy"],
    ["Thoracic", "Articulated access around the hilum through small incisions", "Lobectomy · segmentectomy · thymectomy"],
    ["Micro & Reconstructive", "Up to 10:1 scaling for vessels and lymphatics below 0.8 mm", "Lymphovenous anastomosis · free flap · nerve repair"],
  ];
  s.addTable([[th("Specialty"), th("Where Arc adds value"), th("Representative procedures")], ...spRows.map(([a, b, c]) => [tk(a), b, c])], tableOpts([2.8, 5.0, 4.33], { y: 2.05, fontSize: 14, rowH: 0.78 }));

  // 18 — Stakeholder value
  s = newSlide(S.clinical);
  head(s, "10 · Clinical value", "Precision only matters when it shows up in recovery");
  const sv = [
    ["FaHeartPulse", "Patients", "Smaller incisions, more precise repairs and fewer conversions to open surgery.", "Length of stay · complications · return to activity"],
    ["FaUserDoctor", "Surgeons", "Seated ergonomics, tremor-free control and haptic feedback reduce fatigue.", "Ergonomic load · fatigue · learning curve"],
    ["FaHospital", "Hospitals", "One platform for more specialties and case types, with data to manage the program.", "Conversion rate · OR time · utilization"],
  ];
  for (const [i, [ic, h, b, m]] of sv.entries()) {
    const x = MX + i * (mw + 0.3);
    card(s, x, 2.15, mw, 4.45);
    await iconCircle(s, ic, x + 0.4, 2.5, 0.8);
    txt(s, h, { x: x + 0.4, y: 3.5, w: mw - 0.8, h: 0.5, fontSize: 20, bold: true, color: NAVY });
    txt(s, b, { x: x + 0.4, y: 4.05, w: mw - 0.8, h: 1.2, fontSize: 15 });
    txt(s, "WE MEASURE", { x: x + 0.4, y: 5.35, w: mw - 0.8, h: 0.3, fontSize: 11, bold: true, color: MUTED, charSpacing: 2 });
    txt(s, m, { x: x + 0.4, y: 5.65, w: mw - 0.8, h: 0.8, fontSize: 13, bold: true, color: ACCENT });
  }

  // 19 — Outcome indicators (dark)
  s = newSlide(S.clinical, true);
  head(s, "10 · Outcome indicators", "Outcome indicators we track with clinical partners");
  const oi = [["1.2", "days", "Shorter average hospital stay"], ["34", "%", "Fewer conversions to open surgery"], ["28", "%", "Lower surgeon-reported fatigue"], ["96", "%", "System uptime across installed base"]];
  oi.forEach(([big, unit, label], i) => {
    const x = MX + i * (tw + 0.3);
    card(s, x, 2.25, tw, 3.4, "12283C");
    s.addText([{ text: big, options: { fontSize: 60, bold: true, color: WHITE } }, { text: " " + unit, options: { fontSize: 20, bold: true, color: CYAN } }], { isTextBox: true, x: x + 0.3, y: 2.6, w: tw - 0.5, h: 1.3, margin: 0, valign: "bottom", objectName: on("stat") });
    txt(s, label + "*", { x: x + 0.3, y: 4.15, w: tw - 0.6, h: 1.0, fontSize: 15, color: ICE });
  });
  txt(s, "* Illustrative figures for this concept document. Not clinical data. Replace with peer-reviewed or registry results before external use.", { x: MX, y: 6.0, w: CW, h: 0.5, fontSize: 12, italic: true, color: ICE });

  // 20 — Competitive comparison
  s = newSlide(S.clinical);
  head(s, "11 · Competitive advantage", "The only platform designed from day one for open, laparoscopic and micro-surgery");
  const cmp = [
    ["Surgical approach", "Laparoscopic (ports) only", "Open, laparoscopic and micro-surgical"],
    ["Motion scaling", "Fixed or limited range", "Adjustable 1:1 to 10:1"],
    ["Haptic feedback", "Limited or none", "Force feedback to 0.05 N"],
    ["Supermicrosurgery", "Not supported", "5 mm instruments, structures below 0.8 mm"],
    ["Intelligence", "Imaging only", "On-device AI tissue and vessel tracking"],
    ["Setup", "Dedicated room, long docking", "Docking in under 5 minutes"],
  ];
  s.addTable([[th("Capability"), th("Typical port-based systems"), { text: "Lumenara Arc", options: { bold: true, color: WHITE, fill: { color: ACCENT } } }],
    ...cmp.map(([a, b, c]) => [tk(a), { text: b, options: { color: MUTED } }, { text: c, options: { bold: true, color: NAVY } }])],
    tableOpts([3.0, 4.3, 4.83], { y: 2.05, fontSize: 14, rowH: 0.62 }));
  txt(s, "Comparison describes general market positioning and does not refer to any specific competitor product.", { x: MX, y: 6.55, w: CW, h: 0.3, fontSize: 11, italic: true, color: MUTED });

  // 21 — Moats
  s = newSlide(S.clinical);
  head(s, "11 · Why it is hard to copy", "Mechanics, software and an ecosystem built with surgeons since 2016");
  const moat = [
    ["FaMicrochip", "MicroWrist mechanics", "Cable-driven wrist design and manufacturing know-how developed since 2018."],
    ["FaWaveSquare", "Motion engine", "Tremor filtering and motion scaling tuned with surgeons across five specialties."],
    ["FaUsers", "Ecosystem", "Training centers, a proctor network and case analytics build long-term relationships."],
    ["FaFileContract", "Intellectual property", null],
  ];
  for (const [i, [ic, h, b]] of moat.entries()) {
    const x = MX + (i % 2) * (gw + 0.4), y = 2.1 + Math.floor(i / 2) * (gh + 0.3);
    card(s, x, y, gw, gh);
    await iconCircle(s, ic, x + 0.35, y + 0.35);
    txt(s, h, { x: x + 1.2, y: y + 0.4, w: gw - 1.5, h: 0.45, fontSize: 18, bold: true, color: NAVY });
    if (b) txt(s, b, { x: x + 1.2, y: y + 0.95, w: gw - 1.5, h: 1.1, fontSize: 15 });
    else s.addText([{ text: "Patents filed and granted: ", options: { color: INK } }, placeholderRun("To be provided")], { isTextBox: true, x: x + 1.2, y: y + 0.95, w: gw - 1.5, h: 1.1, margin: 0, fontSize: 15, valign: "top", objectName: on("ph") });
  }

  // 22 — Adoption process
  pres.addSection({ title: S.business });
  s = newSlide(S.business);
  head(s, "12 · Adoption", "A five-step path from first assessment to an optimized robotic program");
  const ad = [["Assessment", "Case mix, specialty priorities and program goals with hospital leadership."], ["Program plan", "Business case, room planning and a training pathway for the whole team."], ["Installation", "Delivery, room integration and validation by Lumenara engineers."], ["Go-live", "First cases with on-site clinical specialists and proctors."], ["Optimization", "Utilization reviews, new specialties and continuous education."]];
  ad.forEach(([h, d], i) => {
    const x = MX + i * (fw + 0.25);
    txt(s, String(i + 1).padStart(2, "0"), { x, y: 2.2, w: fw, h: 0.8, fontSize: 40, bold: true, color: ACCENT });
    s.addShape(pres.shapes.LINE, { x, y: 3.1, w: fw, h: 0, line: { color: RULE, width: 1.5 }, objectName: on("rule") });
    txt(s, h, { x, y: 3.3, w: fw, h: 0.45, fontSize: 17, bold: true, color: NAVY });
    txt(s, d, { x, y: 3.85, w: fw - 0.1, h: 1.8, fontSize: 14 });
  });
  s.addText([{ text: "Service levels: ", options: { bold: true, color: NAVY } }, { text: "preventive maintenance, remote monitoring, a dedicated clinical specialist during ramp-up; response times ", options: { color: INK } }, placeholderRun("To be provided")], { isTextBox: true, x: MX, y: 6.05, w: CW, h: 0.6, margin: 0, fontSize: 14, objectName: "service" });

  // 23 — Training (dark, with image)
  s = newSlide(S.business, true);
  head(s, "12 · Training pathway", "From first case to fellowship-level mastery");
  const tr = [["FaVrCardboard", "Simulate", "Physics-based VR simulator, 60+ validated exercises, objective scoring."], ["FaFlask", "Practice", "Dry and wet labs at training centers in Boston, Munich and Seoul."], ["FaChalkboardUser", "Proctor", "Expert proctors join first cases, in person or by tele-mentoring."], ["FaChartLine", "Improve", "Dashboards benchmark efficiency, economy of motion and outcomes."]];
  for (const [i, [ic, h, d]] of tr.entries()) {
    const y = 2.1 + i * 1.15;
    await iconCircle(s, ic, MX, y, 0.7, CYAN, HEX.navy);
    txt(s, h, { x: MX + 1.0, y: y - 0.02, w: 5.6, h: 0.4, fontSize: 18, bold: true, color: WHITE });
    txt(s, d, { x: MX + 1.0, y: y + 0.38, w: 5.6, h: 0.6, fontSize: 14, color: ICE });
  }
  s.addImage({ path: path.join(MEDIA, "hero-poster.jpg"), x: 7.6, y: 2.1, w: 5.13, h: 4.55, sizing: { type: "cover", w: 5.13, h: 4.55 }, objectName: "training-image", altText: "Robotic instruments at the operative field" });

  // 24 — Business model
  s = newSlide(S.business);
  head(s, "13 · Business model", "A system placement that grows into recurring instrument, service and training revenue");
  const rev = [["FaCubes", "Systems", "Console, cart and vision tower", "Purchase or lease"], ["FaScrewdriverWrench", "Instruments", "MicroWrist tools, drapes, accessories", "Recurring, per procedure"], ["FaBolt", "Service", "Maintenance, updates, monitoring", "Recurring, annual"], ["FaGraduationCap", "Training & data", "Courses, proctoring, analytics", "Recurring"]];
  for (const [i, [ic, h, d, n]] of rev.entries()) {
    const x = MX + i * (tw + 0.3);
    card(s, x, 2.1, tw, 2.75);
    await iconCircle(s, ic, x + 0.3, 2.35, 0.62);
    txt(s, h, { x: x + 0.3, y: 3.15, w: tw - 0.6, h: 0.4, fontSize: 17, bold: true, color: NAVY });
    txt(s, d, { x: x + 0.3, y: 3.6, w: tw - 0.6, h: 0.6, fontSize: 13 });
    txt(s, n, { x: x + 0.3, y: 4.3, w: tw - 0.6, h: 0.4, fontSize: 13, bold: true, color: ACCENT });
  }
  txt(s, "Acquisition options for hospitals", { x: MX, y: 5.15, w: 6, h: 0.4, fontSize: 17, bold: true, color: NAVY });
  [["Purchase", "Capital purchase with multi-year service"], ["Lease", "Operating lease over the program's life"], ["Usage-based", "Per-procedure price incl. instruments and service"]].forEach(([h, d], i) => {
    const x = MX + i * 4.1;
    txt(s, h, { x, y: 5.6, w: 3.8, h: 0.35, fontSize: 15, bold: true, color: ACCENT });
    txt(s, d, { x, y: 5.95, w: 3.8, h: 0.5, fontSize: 13 });
  });
  s.addText([{ text: "Revenue mix and unit economics: ", options: { color: INK } }, placeholderRun("To be provided")], { isTextBox: true, x: MX, y: 6.55, w: CW, h: 0.3, margin: 0, fontSize: 12, objectName: "rev-ph" });

  // 25 — Roadmap
  s = newSlide(S.business);
  head(s, "14 · Roadmap", "From open and MIS surgery today to supermicrosurgery and connected intelligence");
  const rm = [
    ["Short term", "2026–2027", "Arc 2 with 10:1 scaling · 5 mm MicroWrist · expanded AI tracking", "Seoul Training Center · Asia-Pacific placements"],
    ["Mid term", "2028–2029", "Supermicrosurgery instrument set · procedure-specific AI guidance · tele-mentoring at scale", "More European and Asia-Pacific markets · academic partnerships"],
    ["Long term", "2030+", "Assisted autonomy for well-defined subtasks, always under surgeon control", "Global installed base · outcome-based service models"],
  ];
  rm.forEach(([h, yrs, prod, mkt], i) => {
    const x = MX + i * (mw + 0.3);
    card(s, x, 2.1, mw, 4.4, i === 0 ? NAVY : TINT);
    const dark = i === 0;
    txt(s, h, { x: x + 0.4, y: 2.4, w: mw - 0.8, h: 0.45, fontSize: 20, bold: true, color: dark ? WHITE : NAVY });
    txt(s, yrs, { x: x + 0.4, y: 2.88, w: mw - 0.8, h: 0.35, fontSize: 14, bold: true, color: dark ? CYAN : ACCENT });
    txt(s, "PRODUCT", { x: x + 0.4, y: 3.5, w: mw - 0.8, h: 0.3, fontSize: 11, bold: true, color: dark ? ICE : MUTED, charSpacing: 2 });
    txt(s, prod, { x: x + 0.4, y: 3.8, w: mw - 0.8, h: 1.2, fontSize: 14, color: dark ? WHITE : INK });
    txt(s, "MARKET", { x: x + 0.4, y: 5.05, w: mw - 0.8, h: 0.3, fontSize: 11, bold: true, color: dark ? ICE : MUTED, charSpacing: 2 });
    txt(s, mkt, { x: x + 0.4, y: 5.35, w: mw - 0.8, h: 1.0, fontSize: 14, color: dark ? WHITE : INK });
  });
  txt(s, "Roadmap items are forward-looking and subject to regulatory clearance in each market.", { x: MX, y: 6.6, w: CW, h: 0.3, fontSize: 11, italic: true, color: MUTED });

  // 26 — Partnership & contact (dark closing)
  s = newSlide(S.business, true);
  head(s, "15 · Partnership & contact", "See Lumenara Arc in your operating room");
  const ways = [["FaUserDoctor", "Demonstration", "Hands-on session with your surgical team, at your hospital or a Lumenara Training Center."], ["FaFlask", "Clinical partnership", "Joint studies, registries and fellowship programs."], ["FaHandshake", "Distribution", "Regional sales and service partnerships."]];
  for (const [i, [ic, h, d]] of ways.entries()) {
    const y = 2.15 + i * 1.2;
    await iconCircle(s, ic, MX, y, 0.7, CYAN, HEX.navy);
    txt(s, h, { x: MX + 1.0, y: y - 0.02, w: 5.4, h: 0.4, fontSize: 18, bold: true, color: WHITE });
    txt(s, d, { x: MX + 1.0, y: y + 0.38, w: 5.4, h: 0.6, fontSize: 14, color: ICE });
  }
  card(s, 7.4, 2.15, 5.33, 4.3, "12283C");
  const contact = [["Website", "robot-surgery-ai.vercel.app"], ["Request a demo", "robot-surgery-ai.vercel.app/demo/"], ["Email", null], ["Phone", null], ["Offices", "Boston (HQ) · Munich · Seoul"]];
  contact.forEach(([k, v], i) => {
    const y = 2.5 + i * 0.75;
    txt(s, k.toUpperCase(), { x: 7.8, y, w: 4.6, h: 0.3, fontSize: 11, bold: true, color: CYAN, charSpacing: 2 });
    s.addText(v ? [{ text: v, options: { color: WHITE } }] : [placeholderRun("To be provided")], { isTextBox: true, x: 7.8, y: y + 0.3, w: 4.6, h: 0.35, margin: 0, fontSize: 15, objectName: on("contact") });
  });

  // 27 — Appendix: specifications
  pres.addSection({ title: S.appendix });
  s = newSlide(S.appendix);
  head(s, "Appendix A · System specifications", "Lumenara Arc system specifications");
  const specs = [["Arms", "4, collision-aware, remote centre of motion"], ["Docking modes", "Open (over incision) and MIS (ports)"], ["Motion scaling", "1:1 to 10:1, adjustable"], ["Tremor filtering", "8–12 Hz band, 4 levels (Off / Low / High / Max)"], ["Tip motion resolution", "0.1 mm"], ["Haptic feedback", "To 0.05 N"], ["Vision", "4K stereoscopic 3D, near-infrared ICG fluorescence"], ["Instruments", "40+ MicroWrist tools, 8 mm and 5 mm"], ["Setup time", "Under 5 minutes"]];
  s.addTable([[th("Specification"), th("Value")], ...specs.map(([a, b]) => [tk(a), b])], tableOpts([3.6, 8.53], { y: 1.95, fontSize: 14, rowH: 0.46 }));

  // 28 — Appendix: glossary + notice
  s = newSlide(S.appendix);
  head(s, "Appendix B · Glossary and notice", "Key terms used in this profile");
  const gl = [["Anastomosis", "Surgical connection of two tubular structures, such as bowel ends or vessels"], ["DOF", "Degrees of freedom: independent ways an instrument can move"], ["ICG fluorescence", "Near-infrared imaging with indocyanine green to show blood flow"], ["Laparotomy", "An open incision into the abdominal cavity"], ["MIS", "Minimally invasive surgery through small ports"], ["Motion scaling", "Reducing hand motion to a smaller instrument motion, e.g. 5:1"], ["RCM", "Remote centre of motion: fixed instrument pivot at the incision or port"]];
  s.addTable([[th("Term"), th("Meaning")], ...gl.map(([a, b]) => [tk(a), b])], tableOpts([2.8, 9.33], { y: 1.95, fontSize: 13, rowH: 0.44 }));
  txt(s, "Notice: concept company profile. Lumenara Surgical, Lumenara Arc and MicroWrist are fictional names. Specifications, outcome indicators and milestones are illustrative and do not describe an actual medical device or clinical results. Fields marked [To be provided] must be completed before external use. Imagery was procedurally modelled and rendered in Blender.", { x: MX, y: 5.75, w: CW, h: 0.95, fontSize: 12, italic: true, color: MUTED });

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
}

build().catch((e) => { console.error(e); process.exit(1); });
