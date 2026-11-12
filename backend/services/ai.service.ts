import { rulesConfig } from "../config";
import fs from "fs";
import path from "path";

// Python ML service for SBERT agenda relevance (configured via ML_SERVICE_URL, defaults to http://localhost:8000)
const ML_BASE = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");

// Per-process cache: agenda text → result  (invalidated when agenda changes)
let _lastAgendaText = "";
let _agendaCallPending = false;

type TextModelArtifact = {
  classes: string[];
  vocabulary: string[];
  class_documents: Record<string, number>;
  class_tokens: Record<string, number>;
  token_counts: Record<string, Record<string, number>>;
};

export class AiService {
  private readonly offensiveModel = this.loadTextModel("offensive_model.json");
  private readonly agendaModel = this.loadTextModel("agenda_model.json");

  private loadTextModel(fileName: string): TextModelArtifact | null {
    const modelPaths = [
      path.join(process.cwd(), "ml", "models", fileName),
      path.join(process.cwd(), "..", "ml", "models", fileName)
    ];
    for (const filePath of modelPaths) {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) as TextModelArtifact;
      } catch (_) {}
    }
    return null;
  }

  private predictModel(model: TextModelArtifact | null, text: string): Record<string, number> {
    if (!model || !model.classes?.length) return {};
    const tokens = (text || "").toLowerCase().match(/[a-zA-Z']{2,}/g) || [];
    const vocabularySize = Math.max(1, model.vocabulary.length);
    const totalDocuments = Object.values(model.class_documents).reduce((sum, count) => sum + count, 0);
    const scores: Record<string, number> = {};
    for (const label of model.classes) {
      let score = Math.log(((model.class_documents[label] || 0) + 1) / (totalDocuments + model.classes.length));
      const denominator = (model.class_tokens[label] || 0) + vocabularySize;
      for (const token of tokens) {
        score += Math.log(((model.token_counts[label]?.[token] || 0) + 1) / denominator);
      }
      scores[label] = score;
    }
    const maximum = Math.max(...Object.values(scores));
    const probabilities = Object.fromEntries(model.classes.map((label) => [label, Math.exp(scores[label] - maximum)]));
    const normalizer = Object.values(probabilities).reduce((sum, value) => sum + value, 0);
    return Object.fromEntries(Object.entries(probabilities).map(([label, value]) => [label, value / normalizer]));
  }
  /**
   * Analyze speech relevance to the legislative agenda.
   *
   * Primary path : POST /api/agenda/relevance on the Python ML service
   *                Uses SBERT (all-MiniLM-L6-v2) semantic similarity.
   * Fallback path: Improved keyword + Naive-Bayes scoring when Python
   *                is unavailable (e.g. dev mode without uvicorn running).
   */
  async analyzeSpeechRelevanceAsync(
    text: string,
    currentTopic?: string
  ): Promise<{ score: number; isOffTopic: boolean; matched: string[]; category: string; fireAlert: boolean; alertMessage: string }> {
    const lower = (text || "").toLowerCase();
    if (!lower.trim()) {
      return { score: 0, isOffTopic: false, matched: [], category: "RELEVANT", fireAlert: false, alertMessage: "" };
    }

    // ── Primary: SBERT via Python ML service ─────────────────────────────
    if (currentTopic) {
      try {
        const res = await fetch(`${ML_BASE}/api/agenda/relevance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, agenda_text: currentTopic }),
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data: any = await res.json();
          return {
            score:        Number(data.score ?? 0.5),
            isOffTopic:   data.category === "IRRELEVANT",
            matched:      [],
            category:     data.category ?? "RELEVANT",
            fireAlert:    Boolean(data.fire_alert),
            alertMessage: data.alert_message ?? "",
          };
        }
      } catch (_) {
        // Python ML service not running — fall through to keyword fallback
      }
    }

    // ── Fallback: keyword + NB scoring ───────────────────────────────────
    const result = this.analyzeSpeechRelevance(text, currentTopic);
    return {
      ...result,
      category:     result.isOffTopic ? "IRRELEVANT" : "RELEVANT",
      fireAlert:    false,
      alertMessage: "",
    };
  }

  /**
   * Synchronous keyword-based fallback (used by telemetry tick + when
   * the async SBERT path is not yet available).
   */
  analyzeSpeechRelevance(text: string, currentTopic?: string): { score: number; isOffTopic: boolean; matched: string[] } {
    const lower = (text || "").toLowerCase();
    if (!lower.trim()) return { score: 0, isOffTopic: false, matched: [] };

    // Build a topic-aware keyword set.
    // Always include parliamentary/procedural terms, then enrich with words
    // derived from the active bill title so detection adapts at runtime.
    const baseKeywords = new Set([
      "education", "school", "schools", "digital", "ai", "teacher", "budget",
      "broadband", "rural", "stem", "grant", "student", "privacy", "governance",
      "infrastructure", "pedagogy", "curriculum", "solar", "connectivity", "audit", "grants"
    ]);
    const topicWords = currentTopic?.toLowerCase().match(/[a-z]{3,}/g) || [];
    // Replace the default bill-specific base when a different topic is active
    const stopFunctionWords = new Set(["and", "for", "the", "with", "from", "bill", "act", "into", "that"]);
    const hasNewTopic = topicWords.some((w) => !stopFunctionWords.has(w) && !baseKeywords.has(w));
    const keywords = new Set(hasNewTopic ? [] : [...baseKeywords]);
    for (const word of topicWords) {
      if (!stopFunctionWords.has(word)) keywords.add(word);
    }
    // Always keep parliamentary core terms regardless of topic
    for (const coreWord of ["parliament", "committee", "legislation", "amendment", "clause", "section", "member", "minister", "honourable"]) {
      keywords.add(coreWord);
    }

    const matched = [...keywords].filter((keyword) =>
      new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)
    );

    if (
      lower.includes("cricket") ||
      lower.includes("resort") ||
      lower.includes("vacation") ||
      lower.includes("movie") ||
      lower.includes("personal property")
    ) {
      return { score: 0.22, isOffTopic: true, matched: [] };
    }

    const base = (matched.length / 5) * 0.7 + 0.3;
    // Raise minimum floor: short sentences with no keywords should score 0.50
    // so normal conversational phrases don't constantly trip the off-topic rule.
    const score = Math.min(0.98, Math.max(0.50, base));
    const modelProbability = this.predictModel(this.agendaModel, text).on_topic;
    const blendedScore = modelProbability === undefined ? score : (score * 0.8) + (modelProbability * 0.2);
    // Use a lower threshold (0.38) so only genuinely off-topic speech is flagged
    const minThreshold = rulesConfig?.thresholds?.agenda_similarity_min || 0.38;
    return { score: Number(blendedScore.toFixed(2)), isOffTopic: blendedScore < minThreshold, matched };
  }

  /**
   * Classify speaker emotion and acoustic agitation.
   * Uses keyword signals from the transcript text plus dB level as acoustic proxy.
   */
  analyzeEmotion(text: string, noiseDb: number): { label: string; confidence: number; isHeated: boolean } {
    const lower = (text || "").toLowerCase();
    // Angry: extreme language or very loud acoustics
    const angryKeywords = ["shut up", "disgrace", "liar", "fraud", "traitor", "idiot", "stupid", "fool", "moron", "scoundrel", "bloody fool"];
    if (angryKeywords.some((kw) => lower.includes(kw)) || noiseDb > 82) {
      return { label: "Angry", confidence: 0.92, isHeated: true };
    }
    // Heated: strong dissent language or moderately loud acoustics
    const heatedKeywords = ["unacceptable", "outrageous", "shame", "shameful", "protest", "disgraceful", "corrupt", "criminal", "rubbish", "nonsense", "this is wrong", "intolerable", "objection"];
    if (heatedKeywords.some((kw) => lower.includes(kw)) || noiseDb > 74) {
      return { label: "Heated", confidence: 0.88, isHeated: true };
    }
    // Positive: appreciation and commendation
    const positiveKeywords = ["appreciate", "commend", "congratulate", "support", "excellent", "well done", "thank", "grateful", "honour", "agree"];
    if (positiveKeywords.some((kw) => lower.includes(kw))) {
      return { label: "Positive", confidence: 0.91, isHeated: false };
    }
    // Calm: procedural or restrained language
    const calmKeywords = ["respectfully", "clause", "procedure", "pursuant", "order", "schedule", "section", "honourable", "chair", "amendment"];
    if (calmKeywords.some((kw) => lower.includes(kw))) {
      return { label: "Calm", confidence: 0.94, isHeated: false };
    }
    return { label: "Neutral", confidence: 0.86, isHeated: false };
  }

  /**
   * Detect unparliamentary and offensive phrases
   */
  analyzeOffensive(text: string): { isOffensive: boolean; flaggedWords: string[] } {
    const lower = (text || "").toLowerCase();
    const offensiveList = [
      "idiot", "idiotic", "stupid", "moron", "bastard", "corrupt thief", "thief",
      "scoundrel", "liar", "lies", "lie", "shut up", "clown", "traitor", "bloody fool",
      "shameful", "corrupt", "corruption", "cheat", "scam", "fraud", "disgrace",
      "rubbish", "bribe", "criminal", "fool", "nonsense"
    ];
    const flagged = offensiveList.filter((term) => {
      const pattern = term.split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
      return new RegExp(`\\b${pattern}\\b`, "i").test(lower);
    });
    const modelProbability = this.predictModel(this.offensiveModel, text).offensive || 0;
    return { isOffensive: flagged.length > 0 || modelProbability >= 0.65, flaggedWords: flagged };
  }

  /**
   * Simulate acoustic noise fluctuation.
   * Returns realistic DEMO-mode dB values:
   *  - HIGH_NOISE forced event: 85.6 dB (triggers high-noise alert)
   *  - HEATED forced event: 77.2 dB (triggers heated-debate alert via emotion)
   *  - Baseline: mild jitter around 52 dB to reflect normal chamber ambience
   */
  simulateNoise(forcedEvent: string | null | undefined, currentDb: number): number {
    if (forcedEvent === "HIGH_NOISE") return 85.6;
    if (forcedEvent === "HEATED") return 77.2;
    if (forcedEvent === "OFFENSIVE") return 68.4;
    // Gentle random walk around 52 dB baseline; clamp 48–62 so normal rules don't fire
    const delta = (Math.random() - 0.5) * 4;
    const next = currentDb > 0 ? currentDb + delta : 52;
    return Number(Math.min(62, Math.max(48, next)).toFixed(1));
  }

  /**
   * Simulate computer vision seat occupancy and well-rush displacement
   */
  simulateSeats(forcedEvent: string | null | undefined, currentSeats: Record<string, any>): Record<string, any> {
    const updated = { ...currentSeats };
    for (const seatId of Object.keys(updated)) {
      const s = { ...updated[seatId] };
      if (forcedEvent === "WELL_RUSH" && (seatId === "S06" || seatId === "S006" || seatId === "S02")) {
        s.status = "Moved to Well";
        s.movementStatus = "Well Rush / Displaced";
        s.x = 48;
        s.y = 80;
      } else {
        s.status = "Seated Correctly";
        s.movementStatus = "Normal";
        const idx = parseInt(seatId.replace(/\D/g, "") || "1") - 1;
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        s.x = 18 + col * 22 + (Math.random() * 1.5 - 0.75);
        s.y = 28 + row * 26 + (Math.random() * 1.5 - 0.75);
      }
      updated[seatId] = s;
    }
    return updated;
  }

  /**
   * Generate a live session summary using ONLY agenda-relevant transcripts.
   *
   * Rules:
   *  - Only include transcripts where relevance >= RELEVANCE_THRESHOLD (0.38)
   *  - Organize discussion points by agenda topic they best match
   *  - Each topic gets key sentences spoken about it, deduplicated
   *  - Actionable proposals are extracted from relevant speech only
   *  - If no relevant transcripts exist, signals empty state
   */
  generateLiveSummary(currentBill: string, recentTranscripts: Array<Record<string, any>>, agendaTopics?: Array<{ title: string; description?: string }>) {
    const RELEVANCE_THRESHOLD = 0.38;

    // 1. Filter to only agenda-relevant transcripts
    const allTranscripts = recentTranscripts.filter(t =>
      typeof t.text === "string" && t.text.trim().length > 0
    );

    const relevantTranscripts = allTranscripts.filter(t => {
      const rel = typeof t.relevance === "number" ? t.relevance : 1;
      return rel >= RELEVANCE_THRESHOLD;
    });

    const speakerNames = Array.from(new Set(
      relevantTranscripts
        .map(t => t.speakerName || t.name)
        .filter((n): n is string => typeof n === "string" && n.length > 0)
    ));

    // 2. If no relevant transcripts at all, return empty-state payload
    if (relevantTranscripts.length === 0) {
      return {
        session_title: `${currentBill} — Live Session Summary`,
        brief_summary: `No agenda-related discussion available yet.`,
        has_relevant_content: false,
        relevant_transcript_count: 0,
        total_transcript_count: allTranscripts.length,
        key_topics: [],
        agenda_topic_discussions: [],
        transformative_ideas: [],
        policy_suggestions: [],
        key_keywords: [],
        speakers: speakerNames,
        last_updated: new Date().toLocaleTimeString()
      };
    }

    // 3. Build word-frequency table from relevant transcripts only
    const stopWords = new Set([
      "about","after","again","against","also","among","because","before","being","between",
      "could","from","have","into","more","most","must","other","over","should","some","such",
      "than","that","their","there","these","they","this","those","through","under","very",
      "what","when","where","which","while","with","would","your","the","and","for","are",
      "was","were","has","had","her","his","him","our","you","not","but","can","will","all",
      "any","its","who","how","then","them","been","said","speaker","honourable","member",
      "shall","upon","therefore","hereby","whereas","pursuant","section","clause","bill"
    ]);

    const wordFreq = new Map<string, { count: number; speeches: Set<string> }>();
    for (const t of relevantTranscripts) {
      const words = (t.text as string).toLowerCase().match(/[a-z]{4,}/g) || [];
      const seen = new Set<string>();
      for (const word of words) {
        if (stopWords.has(word)) continue;
        if (!wordFreq.has(word)) wordFreq.set(word, { count: 0, speeches: new Set() });
        const entry = wordFreq.get(word)!;
        entry.count++;
        if (!seen.has(word)) { entry.speeches.add(t.id || t.member_id || "unknown"); seen.add(word); }
      }
    }

    const keyTopics = [...wordFreq.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([word, { count, speeches }]) => ({
        title: word.replace(/^./, c => c.toUpperCase()),
        description: `Mentioned ${count} time${count !== 1 ? "s" : ""} across ${speeches.size} relevant speech${speeches.size !== 1 ? "es" : ""}.`,
        relevance_score: Math.min(100, Math.round((speeches.size / Math.max(1, relevantTranscripts.length)) * 100)),
        speeches_count: speeches.size
      }));

    // 4. Organize discussions by agenda topic
    //    Each relevant transcript sentence is assigned to the best-matching topic
    const topics: Array<{ title: string; description?: string }> = agendaTopics?.length
      ? agendaTopics
      : [{ title: currentBill, description: "Active parliamentary agenda" }];

    // Build keyword sets for each topic
    const topicKeywords: Array<Set<string>> = topics.map(topic => {
      const words = `${topic.title} ${topic.description || ""}`.toLowerCase().match(/[a-z]{3,}/g) || [];
      return new Set(words.filter(w => !stopWords.has(w)));
    });

    // For each relevant transcript, find the best-matching topic by keyword overlap
    const topicDiscussions: Array<{
      topic_id: string;
      topic_title: string;
      sentences: Array<{ text: string; speaker: string; relevance: number }>;
    }> = topics.map((t, i) => ({ topic_id: `T${String(i + 1).padStart(2, "0")}`, topic_title: t.title, sentences: [] }));

    for (const t of relevantTranscripts) {
      const sentences = (t.text as string)
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 15);

      for (const sentence of sentences) {
        const sentWords = new Set((sentence.toLowerCase().match(/[a-z]{3,}/g) || []).filter(w => !stopWords.has(w)));

        // Score each topic by overlap with sentence words
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < topicKeywords.length; i++) {
          const overlap = [...sentWords].filter(w => topicKeywords[i].has(w)).length;
          if (overlap > bestScore) { bestScore = overlap; bestIdx = i; }
        }

        topicDiscussions[bestIdx].sentences.push({
          text: sentence,
          speaker: t.speakerName || t.name || "Member",
          relevance: typeof t.relevance === "number" ? t.relevance : 1
        });
      }
    }

    // Keep only topics that got actual sentences; deduplicate sentences
    const agendaTopicDiscussions = topicDiscussions
      .filter(td => td.sentences.length > 0)
      .map(td => {
        const seen = new Set<string>();
        const unique = td.sentences.filter(s => {
          const key = s.text.toLowerCase().slice(0, 60);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return { ...td, sentences: unique.slice(0, 6) }; // max 6 sentences per topic
      });

    // 5. Extract actionable proposals from relevant transcripts only
    const allActionable = relevantTranscripts.flatMap(t =>
      (t.text as string)
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => /\b(propose|proposal|recommend|recommendation|suggest|should|establish|create|introduce|implement)\b/i.test(s) && s.length > 20)
        .map(sentence => ({
          sentence,
          member_name: t.speakerName || t.name || "Unknown Member",
          party: t.party || "—"
        }))
    );

    const seenSentences = new Set<string>();
    const deduped = allActionable.filter(({ sentence }) => {
      const key = sentence.toLowerCase().slice(0, 60);
      if (seenSentences.has(key)) return false;
      seenSentences.add(key);
      return true;
    }).slice(-5);

    const transformativeIdeas = deduped.filter(({ sentence }) =>
      /\b(idea|innovative|create|establish|introduce|build)\b/i.test(sentence)
    );
    const policySuggestions = deduped.filter(({ sentence }) =>
      /\b(recommend|recommendation|suggest|should|propose|proposal)\b/i.test(sentence) &&
      !transformativeIdeas.some(idea => idea.sentence === sentence)
    );

    // 6. Brief summary
    const recentSentences = relevantTranscripts.slice(-3).map(t => t.text.trim());
    const briefSummary = `${relevantTranscripts.length} agenda-relevant speech${relevantTranscripts.length !== 1 ? "es" : ""} recorded on ${currentBill}. ` +
      `${allTranscripts.length - relevantTranscripts.length} off-topic segment${allTranscripts.length - relevantTranscripts.length !== 1 ? "s" : ""} excluded.` +
      (recentSentences.length ? ` Recent: ${recentSentences.join(" ")}` : "");

    return {
      session_title: `${currentBill} — Live Session Summary`,
      brief_summary: briefSummary,
      has_relevant_content: true,
      relevant_transcript_count: relevantTranscripts.length,
      total_transcript_count: allTranscripts.length,
      key_topics: keyTopics,
      agenda_topic_discussions: agendaTopicDiscussions,
      transformative_ideas: transformativeIdeas.map(({ sentence, member_name, party }, i) => ({
        id: `IDEA-${String(i + 1).padStart(2, "0")}`,
        idea: sentence,
        member_name,
        party,
        impact_area: "Extracted from agenda-relevant speech",
        national_benefit: "Requires human review; no impact claim has been inferred."
      })),
      policy_suggestions: policySuggestions.map(({ sentence, member_name }, i) => ({
        id: `SUGG-${String(i + 1).padStart(2, "0")}`,
        suggestion: sentence,
        member_name,
        focus: "Extracted from agenda-relevant speech",
        development_potential: "Review required"
      })),
      key_keywords: keyTopics.map(t => ({
        word: t.title,
        category: "Agenda-relevant topic",
        significance: t.description
      })),
      speakers: speakerNames,
      last_updated: new Date().toLocaleTimeString()
    };
  }
}

export const aiService = new AiService();
