"""
ml_service.py — Katous Fi Chkara ML Microservice
Port: 5001
Fully offline — no internet required at runtime

Endpoints:
  POST /predict   → TF-IDF + LogReg fake/AI text detection
  POST /features  → Heuristic feature scoring for source credibility
  POST /ela       → Error Level Analysis image forensics
  GET  /health    → Health check
"""

from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np
import re
import base64
import io
from PIL import Image, ImageFilter

app = Flask(__name__)

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route("/predict", methods=["OPTIONS"])
@app.route("/features", methods=["OPTIONS"])
@app.route("/ela", methods=["OPTIONS"])
def options():
    return "", 204

# ══════════════════════════════════════════
#  EMBEDDED TRAINING DATASET (fully offline)
#  40 fake + 40 real examples
# ══════════════════════════════════════════

FAKE_TEXTS = [
    "Scientists SHOCKED by this miracle cure that doctors dont want you to know about",
    "BREAKING Government hiding the truth about vaccines and autism link exposed",
    "This one weird trick cures cancer in 48 hours using lemons share before deleted",
    "URGENT 5G towers are causing COVID symptoms government hiding the truth",
    "Billionaire reveals secret diet that burns fat while you sleep EXPOSED doctors hate him",
    "NASA confirms aliens have been living among us for decades shocking truth revealed",
    "This fruit kills cancer cells 10000 times stronger than chemotherapy big pharma suppressed",
    "Banks terrified of this simple trick that eliminates your debt instantly share now",
    "Celebrity exposes Hollywood elite secret pedophile ring disturbing truth mainstream media silent",
    "Doctors baffled grandmother reversed diabetes with simple kitchen spice they dont want you to know",
    "SHOCKING study proves masks cause more harm than the virus itself truth exposed",
    "Anonymous leaks proof that election was stolen completely mainstream media is lying",
    "Big pharma suppressed this natural cure that destroys all viruses permanently",
    "Fluoride in water supply lowers IQ government conspiracy now proven by scientists",
    "Climate change is a hoax scientists are being paid to lie about data",
    "WiFi radiation causes brain tumors in children studies being suppressed by corporations",
    "Moon landing was completely faked NASA secretly admits in leaked document",
    "George Soros secretly funding migrant invasion plan finally revealed with proof",
    "Microchips found inside COVID vaccines under microscope undeniable proof",
    "Deep state planning to implement martial law and confiscate all weapons",
    "CURE FOUND doctors hiding this simple remedy that eliminates all disease",
    "Share this before they delete it the truth about chemtrails and mind control",
    "New world order agenda exposed global population reduction plan revealed",
    "Miracle berry discovered in Amazon cures all types of cancer in two weeks",
    "EXPOSED pharmaceutical companies adding addictive chemicals to medicines on purpose",
    "Secret military weather control technology causing recent floods and earthquakes",
    "Bill Gates microchips confirmed in food supply whistleblower reveals shocking truth",
    "Ancient remedy suppressed by medical establishment cures diabetes permanently guaranteed",
    "ALERT government planning mandatory vaccine with tracking chip resist now",
    "Scientist fired for proving that HIV was created in a laboratory as bioweapon",
    "Banks planning global financial collapse to steal your savings convert to gold now",
    "Mainstream media caught staging fake news broadcast undeniable video proof",
    "Princess Diana was murdered by the royal family because she knew too much",
    "Cancer is curable but the cure has been suppressed by pharmaceutical industry for decades",
    "Chemotherapy kills more patients than cancer itself oncologists finally admit truth",
    "Eating this common food every day causes Alzheimer disease doctors wont tell you",
    "Secret society controlling all world governments their plan finally exposed",
    "COVID vaccines contain graphene oxide self-assembling nanobots proof inside",
    "Obama secretly born in Kenya undeniable new evidence surfaces again",
    "Hollywood elites drink baby blood for immortality insider finally speaks out",
]

REAL_TEXTS = [
    "The Federal Reserve raised interest rates by 25 basis points at its policy meeting Wednesday",
    "Researchers at MIT developed a new battery technology improving energy storage capacity by 40 percent",
    "The United Nations General Assembly convened in New York to discuss international climate policy frameworks",
    "Apple reported quarterly earnings of 90 billion dollars exceeding analyst expectations for the period",
    "Scientists discovered a new species of deep sea fish near the Mariana Trench during an oceanographic expedition",
    "The European Central Bank announced new monetary policy measures aimed at controlling inflation across the eurozone",
    "A study published in Nature Medicine identified a significant link between sleep quality and long-term memory consolidation",
    "The World Health Organization updated its clinical guidelines on antibiotic resistance and antimicrobial stewardship",
    "NASA successfully launched the Artemis mission which successfully orbited the Moon according to mission objectives",
    "Parliament passed comprehensive new legislation regulating social media platforms with particular focus on protecting minors",
    "Economists forecast moderate GDP growth of approximately 2.3 percent for the upcoming fiscal year according to projections",
    "A large-scale vaccine trial demonstrated 87 percent efficacy against the newly identified influenza strain in clinical testing",
    "The International Monetary Fund released its annual global economic outlook report with updated regional forecasts",
    "Astronomers identified three new exoplanets located within the habitable zone of nearby star systems using telescope data",
    "The Supreme Court issued a landmark ruling on digital privacy rights affecting millions of internet users nationwide",
    "A comprehensive new study published in JAMA links prolonged sedentary behavior to significantly increased cardiovascular disease risk",
    "Major technology companies reached agreement on new data sharing standards proposed by the European Union commission",
    "University researchers published peer-reviewed findings on error correction techniques in quantum computing systems",
    "Global average temperatures in October reached the highest levels recorded since systematic measurements began in the 1880s",
    "The central bank announced it would maintain its benchmark interest rate at current levels pending further economic data",
    "Archaeologists uncovered a previously unknown ancient settlement dating back approximately 3000 years near the Mediterranean coast",
    "A new clinical trial for Alzheimer disease treatment showed promising results in slowing cognitive decline in early-stage patients",
    "The transportation department announced plans to expand high-speed rail infrastructure connecting major metropolitan areas",
    "Cybersecurity researchers identified a significant vulnerability affecting millions of devices running older operating system versions",
    "The agriculture department released updated dietary guidelines based on the latest nutritional science research findings",
    "A international consortium of scientists completed the most detailed map of the human brain connectome to date",
    "The stock market closed higher on Thursday following positive economic data releases from the labor department",
    "Environmental agencies reported a measurable improvement in air quality metrics across several major cities this year",
    "Researchers developed a new surgical technique that reduces recovery time for common orthopedic procedures significantly",
    "The education ministry announced curriculum reforms focused on improving mathematics and science literacy in secondary schools",
    "A biodiversity survey found unexpected increases in several endangered species populations in protected conservation areas",
    "The telecommunications regulator approved new spectrum allocations to support the expansion of wireless broadband services",
    "Scientists completed a comprehensive analysis of ice core samples revealing detailed climate data spanning the last 800000 years",
    "The pharmaceutical company announced positive phase three trial results for its new treatment targeting autoimmune conditions",
    "Urban planners released a detailed report on strategies to reduce traffic congestion in growing metropolitan regions",
    "A long-term study tracking 50000 participants found strong correlations between regular physical activity and reduced dementia risk",
    "The energy commission approved new renewable energy targets requiring 60 percent clean power generation by the target year",
    "Marine biologists documented significant coral reef recovery in areas where fishing restrictions have been strictly enforced",
    "The international space station crew successfully completed a complex spacewalk to install new solar panel arrays",
    "Economists analyzing labor market data found wage growth outpacing inflation for the first time in several years",
]

# ── Train model at startup ──
print("[ML] Training TF-IDF + Logistic Regression...")

ALL_TEXTS  = FAKE_TEXTS + REAL_TEXTS
ALL_LABELS = [1] * len(FAKE_TEXTS) + [0] * len(REAL_TEXTS)

vectorizer = TfidfVectorizer(
    max_features=8000,
    ngram_range=(1, 3),
    sublinear_tf=True,
    strip_accents="unicode",
    min_df=1,
)
X_train = vectorizer.fit_transform(ALL_TEXTS)

classifier = LogisticRegression(
    max_iter=1000,
    C=2.0,
    class_weight="balanced",
    solver="lbfgs",
)
classifier.fit(X_train, ALL_LABELS)

print(f"[ML] Ready — {len(ALL_TEXTS)} samples | {X_train.shape[1]} TF-IDF features")


# ══════════════════════════════════════════
#  FEATURE HELPERS
# ══════════════════════════════════════════

CLICKBAIT_SIGNALS = [
    "shocking", "exposed", "secret", "conspiracy", "they don't want",
    "you won't believe", "mainstream media", "doctors hate", "government hiding",
    "share before", "deleted", "suppressed", "banned", "miracle", "cure",
    "urgent", "breaking", "exclusive", "truth revealed", "wake up",
    "sheeple", "deep state", "new world order", "elite", "cabal",
    "zaama", "sahha wella la", "zid share",
]

TRUSTED_DOMAINS = [
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nytimes.com",
    "theguardian.com", "washingtonpost.com", "nasa.gov", "who.int",
    "cdc.gov", "nature.com", "sciencemag.org", "nejm.org", "bmj.com",
    "lemonde.fr", "lefigaro.fr", "liberation.fr", "franceinfo.fr",
    "aljazeera.com", "economist.com", "ft.com", "bloomberg.com",
    "wikipedia.org", "britannica.com", "gov.tn", "un.org", "unicef.org",
]

SUSPICIOUS_DOMAIN_PATTERNS = [
    r"breaking.?news\d*\.",
    r"truth.?revealed",
    r"health.?secret",
    r"(real|true).?news\d*\.",
    r"daily.?expose",
    r"natural.?cure",
    r"patriot",
    r"\d{2,}news",
    r"infowars",
    r"worldtruth",
    r"beforeitsnews",
]


def extract_domain(url):
    url = re.sub(r"https?://", "", url or "").lower()
    url = re.sub(r"www\.", "", url)
    return url.split("/")[0]


def count_clickbait(text):
    t = text.lower()
    return sum(1 for s in CLICKBAIT_SIGNALS if s in t)


def caps_ratio(text):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c.isupper()) / len(letters)


def exclamation_density(text):
    words = text.split()
    return text.count("!") / max(len(words), 1)


def avg_sentence_length(text):
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if not sentences:
        return 0.0
    return float(np.mean([len(s.split()) for s in sentences]))


def lexical_diversity(text):
    words = text.lower().split()
    return len(set(words)) / max(len(words), 1)


def score_domain(url):
    if not url:
        return 50, "unknown", ["no_url_provided"]

    domain = extract_domain(url)
    flags  = []
    penalty = 0

    for trusted in TRUSTED_DOMAINS:
        if trusted in domain:
            return 92, "trusted", ["established_media_outlet"]

    for pattern in SUSPICIOUS_DOMAIN_PATTERNS:
        if re.search(pattern, domain, re.IGNORECASE):
            penalty += 25
            flags.append("suspicious_domain_pattern")
            break

    if not url.startswith("https://"):
        penalty += 15
        flags.append("no_https")

    if len(domain) > 30:
        penalty += 10
        flags.append("unusually_long_domain")

    if re.search(r"\d{2,}", domain):
        penalty += 10
        flags.append("numbers_in_domain")

    if domain.count("-") >= 2:
        penalty += 10
        flags.append("multiple_hyphens_in_domain")

    for tld in [".info", ".biz", ".xyz", ".click", ".top", ".club"]:
        if domain.endswith(tld):
            penalty += 15
            flags.append("suspicious_tld")
            break

    score = max(0, min(100, 70 - penalty))
    verdict = "trusted" if score >= 70 else "suspicious"
    if not flags:
        flags.append("unverified_domain")

    return score, verdict, flags


# ══════════════════════════════════════════
#  ELA HELPERS
# ══════════════════════════════════════════

def decode_image(b64_str):
    """Decode base64 string (with or without data: prefix) to PIL Image."""
    # Strip data:image/...;base64, prefix if present
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def ela_analysis(img, quality=92):
    """
    True ELA: save at quality Q, reload, compute pixel diff amplified ×10.
    Returns (diff_array, manipulation_score 0-100).
    
    FIX vs old version:
    - Use quality=92 (not 90) — closer to typical camera JPEG quality
    - Amplify diff ×10 so it's visible on screen
    - Use per-channel max instead of mean → catches localized edits
    - Normalize heatmap to its own max, not a fixed scale
    """
    width, height = img.size

    # Save at slightly lower quality → untouched areas compress similarly,
    # edited areas (re-saved at different quality before) stand out
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    recompressed = Image.open(buf).convert("RGB")

    orig = np.array(img, dtype=np.float32)
    recomp = np.array(recompressed, dtype=np.float32)

    # Absolute diff per channel, amplified ×10 to make it visible
    diff_rgb = np.abs(orig - recomp) * 10.0
    diff_rgb = np.clip(diff_rgb, 0, 255)

    # Use max across channels — edited regions often spike in one channel
    diff_max = diff_rgb.max(axis=2)

    # Stats for manipulation scoring
    mean_diff = diff_max.mean()
    std_diff  = diff_max.std()
    p95       = np.percentile(diff_max, 95)

    # High mean + high std + high p95 = likely manipulation
    # Typical unmanipulated JPEG: mean_diff < 5, std < 8, p95 < 20
    # Manipulated regions: localized spikes pushing p95 up
    norm_mean = min(1.0, mean_diff / 30.0)
    norm_std  = min(1.0, std_diff  / 25.0)
    norm_p95  = min(1.0, p95       / 80.0)

    manipulation_prob = (norm_mean * 0.3 + norm_std * 0.3 + norm_p95 * 0.4)
    manipulation_prob = round(float(np.clip(manipulation_prob, 0.0, 1.0)), 3)

    return diff_max, manipulation_prob


def build_heatmap(diff_array, size):
    """
    Convert diff array to a visible RGB heatmap.
    Uses a green→yellow→red colormap instead of grayscale
    so suspicious zones are obvious at a glance.
    """
    h, w = diff_array.shape

    # Normalize to 0-255
    d_max = diff_array.max()
    if d_max < 1e-6:
        normalized = np.zeros_like(diff_array, dtype=np.uint8)
    else:
        normalized = (diff_array / d_max * 255).astype(np.uint8)

    # Build RGB colormap: low=dark blue, mid=yellow, high=red
    r = np.clip(normalized.astype(np.float32) * 2 - 255, 0, 255).astype(np.uint8)
    g = np.clip(255 - np.abs(normalized.astype(np.float32) - 128) * 2, 0, 255).astype(np.uint8)
    b = np.clip(255 - normalized.astype(np.float32) * 2, 0, 255).astype(np.uint8)

    rgb = np.stack([r, g, b], axis=2)
    heatmap = Image.fromarray(rgb, mode="RGB")

    # Resize to match original if needed
    if heatmap.size != size:
        heatmap = heatmap.resize(size, Image.LANCZOS)

    # Light smoothing for readability
    heatmap = heatmap.filter(ImageFilter.GaussianBlur(radius=1))

    buf = io.BytesIO()
    heatmap.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ══════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": "TF-IDF + LogisticRegression",
        "training_samples": len(ALL_TEXTS),
        "tfidf_features": int(X_train.shape[1]),
    })


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not data or not data.get("text"):
        return jsonify({"error": "Missing 'text' field"}), 400

    text = str(data["text"]).strip()
    if len(text) < 5:
        return jsonify({"error": "Text too short (min 5 chars)"}), 400

    X        = vectorizer.transform([text])
    proba    = classifier.predict_proba(X)[0]
    fake_prob = float(proba[1])
    real_prob = float(proba[0])
    ml_score  = round(real_prob * 100)

    if real_prob >= 0.65:
        ml_verdict       = "real"
        confidence_label = "high" if real_prob >= 0.80 else "medium"
    elif fake_prob >= 0.65:
        ml_verdict       = "fake"
        confidence_label = "high" if fake_prob >= 0.80 else "medium"
    else:
        ml_verdict       = "uncertain"
        confidence_label = "low"

    cb_count = count_clickbait(text)
    cap      = round(caps_ratio(text), 3)
    exc      = round(exclamation_density(text), 3)
    avg_sl   = round(avg_sentence_length(text), 1)
    lex_div  = round(lexical_diversity(text), 3)

    flags = []
    if cb_count >= 2:
        flags.append(f"clickbait_language ({cb_count} signals)")
    if cap > 0.25:
        flags.append(f"excessive_caps ({round(cap * 100)}%)")
    if exc > 0.05:
        flags.append("excessive_exclamation_marks")
    if avg_sl < 8:
        flags.append("very_short_sentences")
    if lex_div < 0.4:
        flags.append("low_lexical_diversity")
    if fake_prob > 0.70:
        flags.append("high_fake_probability_ml")

    return jsonify({
        "fake_probability":    round(fake_prob, 3),
        "real_probability":    round(real_prob, 3),
        "ml_verdict":          ml_verdict,
        "ml_score":            ml_score,
        "confidence_label":    confidence_label,
        "clickbait_count":     cb_count,
        "caps_ratio":          cap,
        "avg_sentence_length": avg_sl,
        "lexical_diversity":   lex_div,
        "flags":               flags,
    })


@app.route("/features", methods=["POST"])
def features():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No JSON body"}), 400

    url  = data.get("url",  "") or ""
    text = data.get("text", "") or ""

    dom_score, dom_verdict, dom_flags = score_domain(url)

    text_flags   = []
    text_penalty = 0

    if text:
        cb = count_clickbait(text)
        if cb >= 3:
            text_penalty += 20
            text_flags.append(f"clickbait_language ({cb} signals)")
        elif cb >= 1:
            text_penalty += 8
            text_flags.append("mild_clickbait")

        cap = caps_ratio(text)
        if cap > 0.30:
            text_penalty += 15
            text_flags.append(f"excessive_caps ({round(cap * 100)}%)")

        exc = exclamation_density(text)
        if exc > 0.05:
            text_penalty += 10
            text_flags.append("excessive_exclamation")

    combined_score   = max(0, min(100, dom_score - text_penalty))
    combined_verdict = "suspicious" if text_penalty >= 15 else dom_verdict
    combined_flags   = dom_flags + text_flags or ["no_strong_signals_detected"]

    return jsonify({
        "source_score":   combined_score,
        "source_verdict": combined_verdict,
        "domain":         extract_domain(url) if url else "none",
        "has_https":      url.startswith("https://"),
        "combined_flags": combined_flags,
    })


@app.route("/ela", methods=["POST", "OPTIONS"])
def ela():
    """
    Error Level Analysis (ELA) for image forensics.

    Input : { "image_base64": "data:image/jpeg;base64,..." OR raw base64,
              "media_type": "image/jpeg" }
    Output: { "ela_score": 0-100,
              "manipulation_probability": 0.0-1.0,
              "heatmap_base64": "data:image/png;base64,...",
              "analysis": "...",
              "flags": [...] }
    """
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data or not data.get("image_base64"):
        return jsonify({"error": "Missing 'image_base64' field"}), 400

    try:
        img = decode_image(data["image_base64"])
    except Exception as e:
        return jsonify({"error": f"Invalid image data: {str(e)}"}), 400

    try:
        diff_array, manipulation_prob = ela_analysis(img, quality=92)
        heatmap_b64 = build_heatmap(diff_array, img.size)
    except Exception as e:
        return jsonify({"error": f"ELA processing failed: {str(e)}"}), 500

    ela_score = round(manipulation_prob * 100)
    flags     = []
    analysis  = ""

    if manipulation_prob > 0.6:
        flags.append("possible_image_manipulation")
        analysis = (
            "Significant error level anomalies detected. "
            "Suspicious zones (red/yellow in heatmap) suggest splicing or local editing."
        )
    elif manipulation_prob > 0.35:
        flags.append("suspicious_error_patterns")
        analysis = (
            "Moderate error level inconsistencies. "
            "Could indicate minor retouching or multiple JPEG re-saves."
        )
    else:
        flags.append("error_levels_consistent")
        analysis = (
            "Error levels consistent with unmanipulated JPEG compression. "
            "Likely authentic image."
        )

    # Extra flags based on raw stats
    p95 = float(np.percentile(diff_array, 95))
    if p95 > 60:
        flags.append("extreme_pixel_differences")

    suspicious_pixels = int((diff_array > diff_array.mean() + diff_array.std() * 2).sum())
    pixel_ratio = suspicious_pixels / max(diff_array.size, 1)
    if pixel_ratio > 0.08:
        flags.append("wide_region_anomaly")

    return jsonify({
        "ela_score":              ela_score,
        "manipulation_probability": manipulation_prob,
        "heatmap_base64":         f"data:image/png;base64,{heatmap_b64}",
        "analysis":               analysis,
        "flags":                  flags,
    })


if __name__ == "__main__":
    print("[ML] Flask ML service starting on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)