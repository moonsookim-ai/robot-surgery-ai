// Lumenara Surgical — Company Profile (DOCX)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, PageBreak,
  Header, Footer, PageNumber, TableOfContents, LevelFormat, VerticalAlign,
  TabStopType, TabStopPosition, Bookmark, InternalHyperlink, PositionalTab,
  PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
} = require("docx");
const PAGES = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : {};
const TOC = [];
let listCount = 0;

const MEDIA = "/home/user/robot-surgery-ai/assets/media";
const OUT = process.argv[2];

// ---------- palette & type ----------
const NAVY = "0B1B2B", INK = "1A2733", MUTED = "5B6B7A", ACCENT = "1E8FD8", LIGHT = "EAF4FB", RULE = "C9D6E0", WARN = "B45309";
const FONT = "Arial";
const W = 9026; // A4 content width in DXA with 1" margins (11906 - 2*1440)

// ---------- helpers ----------
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
const p = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [t(children)], spacing: { after: 140, line: 300 }, ...o });
const body = (text, o = {}) => p([t(text, { size: 21, color: INK })], o);
const lead = (text) => p([t(text, { size: 24, color: INK })], { spacing: { after: 200, line: 320 } });
const h1 = (text, eyebrow) => {
  const id = "ch_" + eyebrow;
  TOC.push([eyebrow, text, id]);
  return [
    new Paragraph({ pageBreakBefore: true, children: [t(eyebrow.toUpperCase(), { size: 17, bold: true, color: ACCENT, characterSpacing: 40 })], spacing: { before: 0, after: 60 }, keepNext: true }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id, children: [t(text)] })] }),
  ];
};
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
const bullet = (text, boldLead) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80, line: 290 },
  children: boldLead ? [t(boldLead + " ", { bold: true, size: 21, color: INK }), t(text, { size: 21, color: INK })] : [t(text, { size: 21, color: INK })],
});
const newList = () => { listCount += 1; };
const num = (text, boldLead) => new Paragraph({
  numbering: { reference: "steps" + listCount, level: 0 },
  spacing: { after: 80, line: 290 },
  children: boldLead ? [t(boldLead + " ", { bold: true, size: 21, color: INK }), t(text, { size: 21, color: INK })] : [t(text, { size: 21, color: INK })],
});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const keyMessage = (text) => new Paragraph({
  children: [t(text, { size: 26, bold: true, color: NAVY })],
  spacing: { before: 60, after: 240, line: 330 },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: ACCENT, space: 12 } },
  indent: { left: 240 },
});
const note = (text) => p([t(text, { size: 17, italics: true, color: MUTED })], { spacing: { before: 80, after: 160 } });
const placeholder = (text) => t(`[${text}]`, { size: 21, color: WARN, bold: true });
const img = (file, w, h, caption) => {
  const out = [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "jpg", data: fs.readFileSync(path.join(MEDIA, file)), transformation: { width: w, height: h },
      altText: { title: caption || file, description: caption || file, name: file } })],
  })];
  if (caption) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [t(caption, { size: 16, color: MUTED, italics: true })] }));
  return out;
};

const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, width, o = {}) => new TableCell({
  borders, width: { size: width, type: WidthType.DXA },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
  margins: { top: 90, bottom: 90, left: 130, right: 130 },
  verticalAlign: o.vAlign || VerticalAlign.TOP,
  columnSpan: o.span,
  children: (Array.isArray(content) ? content : [content]).map((c) => typeof c === "string"
    ? new Paragraph({ spacing: { after: 40, line: 270 }, alignment: o.align, children: [t(c, { size: o.size || 19, bold: !!o.bold, color: o.color || INK })] })
    : c),
});
const table = (cols, rows, o = {}) => new Table({
  width: { size: W, type: WidthType.DXA },
  columnWidths: cols,
  rows: rows.map((r, i) => new TableRow({
    tableHeader: i === 0 && o.header !== false,
    cantSplit: true,
    children: r.map((c, j) => {
      const isHead = i === 0 && o.header !== false;
      const isKey = o.keyCol && j === 0 && !isHead;
      return cell(c, cols[j], { fill: isHead ? NAVY : isKey ? LIGHT : (i % 2 === 0 ? "F7FAFC" : undefined), bold: isHead || isKey, color: isHead ? "FFFFFF" : INK });
    }),
  })),
});
const spacer = (after = 120) => new Paragraph({ children: [], spacing: { after } });

// stat tiles (one-row table)
const stats = (items) => {
  const cw = Math.floor(W / items.length);
  const cols = items.map((_, i) => (i === items.length - 1 ? W - cw * (items.length - 1) : cw));
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: cols,
    rows: [new TableRow({ children: items.map(([big, unit, label], i) => new TableCell({
      width: { size: cols[i], type: WidthType.DXA },
      borders: { top: { style: BorderStyle.SINGLE, size: 18, color: ACCENT }, bottom: border, left: border, right: border },
      shading: { fill: LIGHT, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 140, bottom: 140, left: 140, right: 140 },
      children: [
        new Paragraph({ spacing: { after: 40 }, children: [t(big, { size: 40, bold: true, color: NAVY }), t(" " + unit, { size: 20, bold: true, color: ACCENT })] }),
        new Paragraph({ spacing: { after: 0, line: 260 }, children: [t(label, { size: 17, color: MUTED })] }),
      ],
    })) })],
  });
};

// ---------- content ----------
const cover = [
  new Paragraph({ spacing: { before: 400, after: 120 }, children: [t("LUMENARA SURGICAL", { size: 22, bold: true, color: ACCENT, characterSpacing: 80 })] }),
  new Paragraph({ spacing: { after: 160, line: 560 }, children: [t("Precision beyond", { size: 60, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 300, line: 560 }, children: [t("the human hand.", { size: 60, bold: true, color: ACCENT })] }),
  new Paragraph({ spacing: { after: 360 }, children: [t("Company Profile  ·  Lumenara Arc Robotic Surgical System", { size: 24, color: INK })] }),
  ...img("hero-poster.jpg", 602, 339, "Robot-assisted open laparotomy: MicroWrist instruments placing a running suture on a bowel anastomosis (rendered in Blender)."),
  new Paragraph({ spacing: { before: 600, after: 60 }, children: [t("Edition 1.0  ·  November 2026", { size: 19, color: MUTED })] }),
  new Paragraph({ spacing: { after: 60 }, children: [t("Boston  ·  Munich  ·  Seoul", { size: 19, color: MUTED })] }),
  new Paragraph({ spacing: { after: 0 }, children: [t("Concept document. Lumenara is a fictional company; product names, specifications and figures are illustrative.", { size: 16, italics: true, color: MUTED })] }),
];

const tocBlock = () => [
  new Paragraph({ pageBreakBefore: true, children: [t("Contents", { size: 36, bold: true, color: NAVY })], spacing: { after: 300 } }),
  ...TOC.map(([eb, title, id]) => new Paragraph({
    spacing: { after: 120 },
    tabStops: [{ type: TabStopType.LEFT, position: 700 }, { type: TabStopType.RIGHT, position: W, leader: "dot" }],
    children: [new InternalHyperlink({ anchor: id, children: [
      t(eb, { size: 21, bold: true, color: ACCENT }),
      t("\t" + title, { size: 21, color: INK }),
      t("\t" + String(PAGES[id] || "–"), { size: 21, color: MUTED }),
    ] })],
  })),
];

const ch1 = [
  ...h1("Executive Summary", "01"),
  keyMessage("Lumenara builds one robotic platform that brings tremor-free, sub-millimetre control to open, laparoscopic and micro-surgical procedures."),
  body("Surgery is moving toward smaller incisions, finer anatomy and more complex reconstructions. Each step raises the demand on the one instrument that has not changed: the human hand. Physiological tremor, fatigue over long cases and the limited range of the human wrist all set a ceiling on precision."),
  body("Lumenara Arc removes that ceiling. A real-time motion engine filters tremor and scales motion down by up to 10:1, while cable-driven MicroWrist instruments articulate beyond the range of any human wrist. Unlike systems built only for port-based surgery, Arc docks over an open incision as easily as it docks to ports."),
  spacer(60),
  stats([["0.1", "mm", "Instrument tip motion resolution"], ["7", "DOF", "Degrees of freedom at the MicroWrist"], ["10:1", "", "Adjustable motion scaling"], ["4K", "3D", "Stereoscopic, fluorescence-ready vision"]]),
  spacer(200),
  h2("At a glance"),
  table([2600, 6426], [
    ["Item", "Summary"],
    ["What we do", "Design, manufacture and support the Lumenara Arc robotic surgical system and its MicroWrist instrument family."],
    ["Who we serve", "Hospitals and surgical teams in general, colorectal, urologic, gynecologic, thoracic and reconstructive surgery."],
    ["Why we are different", "One platform for open, laparoscopic and micro-surgery; up to 10:1 motion scaling; haptic feedback; on-device AI scene understanding."],
    ["How we grow", "System placements with recurring instrument, service and training revenue, supported by clinical partnerships."],
  ], { keyCol: true }),
];

const ch2 = [
  ...h1("Message from the CEO", "02"),
  keyMessage("Technology should extend a surgeon's skill, never replace their judgement."),
  body("When we founded Lumenara, we asked surgeons a simple question: what would you do if your hands were perfectly steady? The answers shaped everything we build. They described sutures placed exactly where intended, vessels repaired below a millimetre, and long reconstructions finished with the same precision as the first stitch."),
  body("Lumenara Arc is our answer. It is built by surgeons, roboticists and imaging scientists working side by side, and it is designed to fit how operating rooms really work: open cases and minimally invasive cases, routine procedures and the most demanding reconstructions."),
  body("We measure our success by what happens after surgery: shorter recoveries, fewer complications and surgeons who can operate at their best for their whole careers. Thank you for your interest in Lumenara. We look forward to working with you."),
  spacer(200),
  p([t("[Name of CEO]", { size: 21, bold: true, color: NAVY })], { spacing: { after: 20 } }),
  p([t("Co-founder and Chief Executive Officer, Lumenara Surgical", { size: 19, color: MUTED })]),
  note("The CEO's name and signature are to be provided."),
];

const ch3 = [
  ...h1("Company Overview", "03"),
  keyMessage("Founded in 2016 by surgeons and engineers, Lumenara now employs more than 900 people across three R&D centres."),
  h2("Mission, vision and values"),
  table([2200, 6826], [
    ["", "Statement"],
    ["Mission", "Give every surgeon the steadiest hands in medicine."],
    ["Vision", "A world where the precision of surgery is limited by judgement, not by anatomy or fatigue."],
    ["Values", "Patients first · Built with surgeons · Evidence over claims · Safety by design · One team across three continents"],
  ], { keyCol: true }),
  spacer(),
  h2("Company facts"),
  table([3000, 6026], [
    ["Item", "Detail"],
    ["Company name", "Lumenara Surgical"],
    ["Founded", "2016"],
    ["Headquarters", "Boston, United States"],
    ["R&D and training centres", "Boston (USA) · Munich (Germany) · Seoul (Republic of Korea)"],
    ["Employees", "900+ engineers, clinicians and specialists"],
    ["Core product", "Lumenara Arc robotic surgical system"],
    ["Instrument portfolio", "40+ wristed MicroWrist instruments"],
    ["Regulatory status", "[To be provided]"],
  ], { keyCol: true }),
  spacer(),
  h2("Organization"),
  bullet("Console, robotics and MicroWrist instrument engineering; motion engine and haptics.", "Boston:"),
  bullet("Precision mechanics, sterilization and manufacturing engineering; European clinical affairs.", "Munich:"),
  bullet("Imaging, AI scene understanding and software platform; Asia-Pacific training center.", "Seoul:"),
  bullet("Clinical affairs, quality and regulatory, customer service and professional education operate across all three sites.", "Global functions:"),
];

const ch4 = [
  ...h1("Milestones", "04"),
  keyMessage("From a surgeon-led research project to a platform for open, laparoscopic and micro-surgery."),
  table([1500, 7526], [
    ["Year", "Milestone"],
    ["2016", "Lumenara Surgical founded in Boston by surgeons, roboticists and imaging scientists."],
    ["2018", "First cable-driven MicroWrist prototype; motion engine with real-time tremor filtering."],
    ["2019", "Munich precision-engineering center opens."],
    ["2021", "Seoul imaging and AI center opens; first stereoscopic 4K vision tower."],
    ["2023", "Lumenara Arc platform introduced with open and MIS docking modes."],
    ["2025", "Instrument portfolio passes 40 wristed tools; AI tissue and vessel tracking added."],
    ["2026", "Arc 2 announced with 10:1 motion scaling and 5 mm MicroWrist instruments; Seoul Training Center opens for Asia-Pacific teams."],
  ]),
  note("Dates before 2026 are illustrative for this concept document."),
];

const ch5 = [
  ...h1("Market Opportunity and the Problem We Solve", "05"),
  keyMessage("Surgery is asking for more precision than the unaided human hand can reliably deliver."),
  h2("The limits of the human hand"),
  table([2600, 3213, 3213], [
    ["Challenge", "What happens today", "How Lumenara Arc responds"],
    ["Physiological tremor", "8–12 Hz tremor limits fine suturing and micro-anastomoses.", "Real-time tremor filtering at the console."],
    ["Scale of anatomy", "Vessels and lymphatics below 0.8 mm are at the edge of manual technique.", "Up to 10:1 motion scaling and 0.1 mm tip resolution."],
    ["Restricted access", "Rigid instruments cannot turn corners deep in the pelvis or chest.", "7-DOF MicroWrist instruments with ±90° articulation."],
    ["Surgeon fatigue", "Long cases in awkward postures reduce consistency and shorten careers.", "Seated, ergonomic console with eye-tracked camera control."],
    ["Open vs. MIS divide", "Most robots serve port-based surgery only; open cases stay manual.", "One platform with open and MIS docking modes."],
  ], { keyCol: true }),
  spacer(),
  h2("Market context"),
  body("Robot-assisted surgery is expanding from a few high-volume procedures into general surgery, thoracic and reconstructive work. Hospitals want platforms that serve more specialties, more case types and more surgeons per system."),
  p([t("Global surgical robotics market size and growth: ", { size: 21, color: INK }), placeholder("To be provided from a cited market report")]),
  p([t("Annual procedures addressable by Lumenara Arc: ", { size: 21, color: INK }), placeholder("To be provided")]),
  p([t("Priority regions: ", { size: 21, color: INK }), t("North America, Europe (DACH first) and Asia-Pacific (Korea first).", { size: 21, color: INK })]),
  note("Market figures are intentionally left blank. Please insert data from a cited source before external distribution."),
];

const ch6 = [
  ...h1("The Lumenara Arc Platform", "06"),
  keyMessage("One system. Open, laparoscopic and micro-surgical."),
  body("Lumenara Arc combines an immersive surgeon console, a four-arm patient cart and an intelligent vision tower. It docks over an open incision as easily as it docks to ports, and switches between the two in minutes."),
  table([2400, 3313, 3313], [
    ["Component", "What it does", "Key features"],
    ["Arc Console", "Where the surgeon operates: seated, focused and in full view of the team.", "4K stereoscopic viewer · haptic hand controllers · eye-tracked camera control · 1:1–10:1 motion scaling · tele-mentoring"],
    ["Arc Patient Cart", "Four slim arms that hold and move the instruments around a software-defined remote centre of motion (RCM).", "Open and MIS docking modes · active collision avoidance · setup in under 5 minutes"],
    ["Arc Vision Tower", "Imaging, energy and intelligence for the whole team.", "4K 3D imaging · near-infrared ICG fluorescence · AI tissue and vessel tracking · secure case recording"],
  ], { keyCol: true }),
  spacer(),
  h2("How a case flows"),
  (newList(), null),
  num("The patient cart is positioned and its arms are docked over the incision or to the ports.", "Dock."),
  num("Each arm locks a remote centre of motion at the incision or port, so the body wall never takes the strain of instrument movement.", "Lock the pivot."),
  num("The surgeon controls the instruments from the console; tremor is filtered and motion is scaled in real time.", "Operate."),
  num("Fluorescence and AI overlays confirm perfusion and highlight critical structures before closure.", "Verify."),
  num("The case is recorded securely for review, training and analytics.", "Learn."),
];

const ch7 = [
  ...h1("MicroWrist Instruments", "07"),
  keyMessage("A wrist that turns where a hand can't."),
  ...img("macro.jpg", 470, 265, "MicroWrist needle driver passing a curved needle through bowel tissue (rendered in Blender)."),
  body("Cable-driven MicroWrist instruments articulate beyond the range of the human wrist, giving surgeons true dexterity deep inside the body. Needle drivers, graspers, scissors and advanced bipolar energy are available, each with chip-verified usage tracking."),
  table([3600, 5426], [
    ["Specification", "Value"],
    ["Wrist articulation", "±90° pitch · ±90° yaw"],
    ["Roll", "540° continuous"],
    ["Degrees of freedom", "7 at the instrument tip"],
    ["Shaft diameter", "8 mm and 5 mm"],
    ["Tip motion resolution", "0.1 mm"],
    ["Instrument library", "40+ wristed tools"],
    ["Usage tracking", "Chip-verified life and reprocessing count"],
  ], { keyCol: true }),
  spacer(),
  h2("Instrument families"),
  bullet("Large and micro needle drivers, including suture-cut variants.", "Suturing:"),
  bullet("Cadiere, fenestrated and atraumatic bowel graspers.", "Grasping and retraction:"),
  bullet("Curved and micro scissors, Maryland and fenestrated bipolar, monopolar hook and spatula.", "Dissection and energy:"),
  bullet("5 mm instruments for vessels and lymphatics below 0.8 mm.", "Supermicrosurgery (Arc 2):"),
];

const ch8 = [
  ...h1("Core Technology", "08"),
  keyMessage("Every hand movement passes through the motion engine: tremor out, scale down, intent preserved."),
  table([2500, 6526], [
    ["Technology", "What it does for the surgeon and patient"],
    ["Motion engine", "Filters 8–12 Hz physiological tremor and scales console motion by 1:1 to 10:1, so the instrument tip follows only what the surgeon means to do."],
    ["Remote centre of motion", "Arms pivot around a software-locked point at the incision or port, protecting the body wall from instrument forces."],
    ["Haptic force feedback", "Strain sensors at the wrist return tissue and suture tension to the surgeon's hands, down to 0.05 N."],
    ["AI scene understanding", "On-device models segment tissue planes, vessels and instruments in real time and highlight critical structures."],
    ["Fluorescence imaging", "Near-infrared ICG overlays reveal perfusion and anatomy in one click."],
    ["Collision-aware arms", "A live kinematic model of all four arms prevents clashes and keeps the bedside team safe."],
    ["Connected insights", "Secure case analytics turn every procedure into feedback for surgeons, teams and hospital leadership."],
  ], { keyCol: true }),
  spacer(),
  h2("How the motion engine works"),
  (newList(), null),
  num("The console samples the surgeon's hand position at high frequency.", "Capture."),
  num("A low-pass filter removes the 8–12 Hz tremor band while keeping deliberate motion.", "Filter."),
  num("Motion is scaled down around the instrument's working point (for example 5:1 for fine suturing, 10:1 for supermicrosurgery).", "Scale."),
  num("Joint commands are computed for the arm and the MicroWrist while the remote centre of motion stays locked.", "Drive."),
  num("Measured tip forces are returned to the hand controllers as haptic feedback.", "Feel."),
  note("An interactive version of this demonstration is available on the Technology page of the Lumenara website."),
];

const ch9 = [
  ...h1("Specialties and Procedures", "09"),
  keyMessage("Built for the procedures that demand the most."),
  table([2500, 3263, 3263], [
    ["Specialty", "Where Arc adds value", "Representative procedures"],
    ["General & Colorectal", "Stable traction and wristed suturing for intracorporeal anastomoses and deep pelvic dissection.", "Colectomy · low anterior resection · ventral and inguinal hernia · cholecystectomy · bowel anastomosis"],
    ["Urology", "Nerve-sparing dissection and watertight anastomosis in the confined pelvis.", "Radical prostatectomy · partial nephrectomy · pyeloplasty · cystectomy"],
    ["Gynecology", "Visualization and articulation for complex benign and oncologic cases.", "Hysterectomy · myomectomy · sacrocolpopexy · endometriosis resection"],
    ["Thoracic", "Articulated access around the hilum through small incisions.", "Lobectomy · segmentectomy · thymectomy · esophagectomy"],
    ["Micro & Reconstructive", "Up to 10:1 scaling for anastomoses of vessels and lymphatics below 0.8 mm.", "Lymphovenous anastomosis · free flap reconstruction · nerve repair · vascular microsurgery"],
  ], { keyCol: true }),
];

const ch10 = [
  ...h1("Clinical Value and Outcomes", "10"),
  keyMessage("Precision only matters when it shows up in recovery."),
  h2("Value for each stakeholder"),
  table([2200, 6826], [
    ["Stakeholder", "Value"],
    ["Patients", "Smaller incisions, more precise repairs and fewer conversions to open surgery, aiming for shorter stays and faster return to normal life."],
    ["Surgeons", "Seated ergonomics, tremor-free control and haptic feedback reduce fatigue and extend what is technically possible."],
    ["Hospitals", "One platform for more specialties and case types, higher utilization and data to manage program performance."],
  ], { keyCol: true }),
  spacer(),
  h2("Outcome indicators"),
  stats([["1.2", "days", "Shorter average hospital stay*"], ["34", "%", "Fewer conversions to open surgery*"], ["28", "%", "Lower surgeon-reported fatigue*"], ["96", "%", "System uptime across installed base*"]]),
  note("* Illustrative figures for this concept document. Not clinical data. Replace with results from peer-reviewed studies or registry data before external use."),
  h2("How we measure"),
  bullet("Length of stay, complications, readmissions and return to normal activity.", "Patients:"),
  bullet("Ergonomic load, fatigue scores and learning-curve progression.", "Surgeons:"),
  bullet("Conversion rate, operating-room time and system utilization.", "Hospitals:"),
];

const ch11 = [
  ...h1("Competitive Advantage", "11"),
  keyMessage("The only platform designed from day one for open, laparoscopic and micro-surgery."),
  table([2800, 3113, 3113], [
    ["Capability", "Typical port-based robotic systems", "Lumenara Arc"],
    ["Surgical approach", "Laparoscopic (ports) only", "Open, laparoscopic and micro-surgical"],
    ["Motion scaling", "Fixed or limited range", "Adjustable 1:1 to 10:1"],
    ["Haptic feedback", "Limited or none", "Force feedback to 0.05 N"],
    ["Supermicrosurgery", "Not supported", "5 mm instruments for structures below 0.8 mm"],
    ["Intelligence", "Imaging only", "On-device AI tissue and vessel tracking"],
    ["Setup", "Dedicated room and long docking", "Docking in under 5 minutes"],
  ], { keyCol: true }),
  note("Comparison describes general market positioning and does not refer to any specific competitor product."),
  h2("Why it is hard to copy"),
  bullet("Cable-driven wrist design and manufacturing know-how developed since 2018.", "MicroWrist mechanics:"),
  bullet("Real-time tremor filtering and motion scaling tuned with surgeons across five specialties.", "Motion engine:"),
  bullet("Training centers, proctor network and case analytics create long-term relationships with surgical teams.", "Ecosystem:"),
  bullet("[To be provided: number of patents filed and granted]", "Intellectual property:"),
];

const ch12 = [
  ...h1("Adoption and Training", "12"),
  keyMessage("From first case to fellowship-level mastery."),
  h2("Adoption process"),
  table([1500, 2600, 4926], [
    ["Step", "Phase", "What happens"],
    ["1", "Assessment", "Case-mix review, specialty priorities and program goals with hospital leadership."],
    ["2", "Program plan", "Business case, room planning and a training pathway for the whole team."],
    ["3", "Installation", "Delivery, room integration and system validation by Lumenara engineers."],
    ["4", "Go-live", "First cases with on-site clinical specialists and proctors."],
    ["5", "Optimization", "Utilization reviews, new specialties and continuous education."],
  ]),
  spacer(),
  h2("Training pathway"),
  (newList(), null),
  num("A physics-based VR simulator with 60+ validated exercises and objective skill scoring.", "Simulate."),
  num("Hands-on dry and wet labs at Lumenara Training Centers in Boston, Munich and Seoul.", "Practice."),
  num("Expert proctors join the first cases, in person or by low-latency tele-mentoring.", "Proctor."),
  num("Personal dashboards benchmark efficiency, economy of motion and outcomes.", "Improve."),
  spacer(),
  h2("Service and support"),
  bullet("Preventive maintenance and remote system monitoring.", "Uptime:"),
  bullet("Dedicated clinical specialist for each site during ramp-up.", "Clinical support:"),
  bullet("[To be provided: service-level response times]", "Service levels:"),
];

const ch13 = [
  ...h1("Business Model", "13"),
  keyMessage("A system placement that grows into recurring instrument, service and training revenue."),
  table([2600, 3213, 3213], [
    ["Revenue stream", "Description", "Nature"],
    ["Systems", "Arc Console, Patient Cart and Vision Tower.", "One-time (purchase) or periodic (lease)"],
    ["Instruments & accessories", "MicroWrist instruments with tracked life, drapes and accessories.", "Recurring, per procedure"],
    ["Service", "Maintenance, software updates and remote monitoring.", "Recurring, annual contract"],
    ["Training & data", "Simulation, courses, proctoring and analytics subscriptions.", "Recurring"],
  ], { keyCol: true }),
  spacer(),
  h2("Acquisition options for hospitals"),
  bullet("Capital purchase with a multi-year service agreement.", "Purchase:"),
  bullet("Operating lease that spreads cost across the program's life.", "Lease:"),
  bullet("Per-procedure pricing that bundles system access, instruments and service.", "Usage-based:"),
  p([t("Revenue mix and unit economics: ", { size: 21, color: INK }), placeholder("To be provided")]),
];

const ch14 = [
  ...h1("Roadmap", "14"),
  keyMessage("From open and MIS surgery today to supermicrosurgery and connected intelligence tomorrow."),
  table([2000, 3513, 3513], [
    ["Horizon", "Product", "Market"],
    ["Short term (2026–2027)", "Arc 2 with 10:1 motion scaling; 5 mm MicroWrist instruments; expanded AI tissue tracking.", "Seoul Training Center operations; Asia-Pacific placements."],
    ["Mid term (2028–2029)", "Supermicrosurgery instrument set; procedure-specific AI guidance; tele-mentoring at scale.", "Additional European and Asia-Pacific markets; academic center partnerships."],
    ["Long term (2030+)", "Assisted autonomy for well-defined subtasks (e.g. suturing assistance) under surgeon control.", "Global installed base with outcome-based service models."],
  ], { keyCol: true }),
  note("Roadmap items are forward-looking and subject to regulatory clearance in each market."),
];

const ch15 = [
  ...h1("Partnership and Contact", "15"),
  keyMessage("See Lumenara Arc in your operating room."),
  body("We partner with hospitals, academic centers and distributors that share our commitment to evidence-based, surgeon-led innovation."),
  h2("Ways to work with us"),
  bullet("Hands-on demonstration with your surgical team, at your hospital or a Lumenara Training Center.", "Demonstration:"),
  bullet("Joint studies, registries and fellowship programs.", "Clinical partnership:"),
  bullet("Regional sales and service partnerships.", "Distribution:"),
  spacer(),
  table([2600, 6426], [
    ["Contact", "Details"],
    ["Website", "robot-surgery-ai.vercel.app"],
    ["Request a demo", "robot-surgery-ai.vercel.app/demo/"],
    ["Email", "[To be provided]"],
    ["Phone", "[To be provided]"],
    ["Offices", "Boston (HQ) · Munich · Seoul"],
  ], { keyCol: true }),
];

const appendix = [
  ...h1("Appendix", "A"),
  h2("A. System specifications"),
  table([3600, 5426], [
    ["Specification", "Value"],
    ["Arms", "4, collision-aware, remote centre of motion"],
    ["Docking modes", "Open (over incision) and MIS (ports)"],
    ["Motion scaling", "1:1 to 10:1, adjustable"],
    ["Tremor filtering", "8–12 Hz band, 4 levels (Off / Low / High / Max)"],
    ["Tip motion resolution", "0.1 mm"],
    ["Haptic feedback", "To 0.05 N"],
    ["Vision", "4K stereoscopic 3D, near-infrared ICG fluorescence"],
    ["Instruments", "40+ MicroWrist tools, 8 mm and 5 mm"],
    ["Setup time", "Under 5 minutes"],
  ], { keyCol: true }),
  spacer(),
  h2("B. Glossary"),
  table([2800, 6226], [
    ["Term", "Meaning"],
    ["Anastomosis", "Surgical connection of two tubular structures, such as bowel ends or blood vessels."],
    ["DOF", "Degrees of freedom: the independent ways an instrument can move."],
    ["Haptic feedback", "Force information returned to the surgeon's hands."],
    ["ICG fluorescence", "Imaging with indocyanine green dye under near-infrared light to show blood flow."],
    ["Laparotomy", "An open incision into the abdominal cavity."],
    ["MIS", "Minimally invasive surgery performed through small ports."],
    ["Motion scaling", "Reducing the surgeon's hand motion to a smaller instrument motion, e.g. 5:1."],
    ["RCM", "Remote centre of motion: the fixed pivot point of an instrument at the incision or port."],
    ["Tremor filtering", "Removal of involuntary hand tremor (8–12 Hz) from control signals."],
  ], { keyCol: true }),
  spacer(),
  h2("C. Notice"),
  body("This is a concept company profile. Lumenara Surgical, Lumenara Arc and MicroWrist are fictional names. Specifications, outcome indicators and milestones are illustrative and do not describe an actual medical device or clinical results. Fields marked [To be provided] must be completed with verified information before external use. Imagery was procedurally modelled and rendered in Blender."),
];

// ---------- document ----------
const doc = new Document({
  creator: "Lumenara Surgical",
  title: "Lumenara Surgical — Company Profile",
  description: "Company profile for the Lumenara Arc robotic surgical system",
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 40, bold: true, color: NAVY },
        paragraph: { spacing: { before: 0, after: 200 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: NAVY },
        paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } }, run: { color: ACCENT } } }] },
      ...Array.from({ length: listCount + 1 }, (_, i) => ({ reference: "steps" + i, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 340 } }, run: { color: ACCENT, bold: true } } }] })),
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }, titlePage: true },
      headers: {
        first: new Header({ children: [new Paragraph({ children: [] })] }),
        default: new Header({ children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [t("LUMENARA SURGICAL", { size: 15, bold: true, color: NAVY, characterSpacing: 40 }), t("\tCompany Profile 2026", { size: 15, color: MUTED })],
        })] }),
      },
      footers: {
        first: new Footer({ children: [new Paragraph({ children: [] })] }),
        default: new Footer({ children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [t("Concept document · figures illustrative", { size: 15, color: MUTED }), t("\t", { size: 15 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: MUTED })],
        })] }),
      },
      children: [...cover, ...tocBlock(), ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...ch8, ...ch9, ...ch10, ...ch11, ...ch12, ...ch13, ...ch14, ...ch15, ...appendix].filter(Boolean),
    },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length); });
