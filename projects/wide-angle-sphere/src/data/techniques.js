// insighttimer.com/techniques — the real directory, scraped 2026-09-11.
// The KEY is a category (it becomes a parent pill), the value its techniques
// (they become the white sub-pills orbiting that parent).
//
// Order matters: `pills3d.count` takes the first N categories, so the most
// recognisable ones are first.

export const TECHNIQUES = {
  "Mindfulness": ["Body Scan", "RAIN Practice", "Thought Watching", "Mindful Eating", "Deep Listening", "Urge Surfing", "Three-Minute Breathing Space", "Presence Practice", "Mindful Bathing", "Tea Meditation", "Technology Fast", "Mindful Driving", "Spinal Scan", "Impermanence Awareness", "Detached Mindfulness", "Attention Training Technique", "Emotional Labeling", "Full-Body Awareness", "Mindful Cooking", "Mindful Drinking", "Morning Routine", "Soji (Zen Cleaning)", "Gatha Practice", "Dadirri (Deep Listening)", "MBSR Formal Sitting", "MBCT Decentering", "Loving Kindness Body Scan", "Mindful Awareness", "Mindful Morning Routine"],
  "Breathwork": ["Box Breathing", "4-7-8 Breathing", "Diaphragmatic Breathing", "Kapalabhati", "Bhramari (Bee Breath)", "Resonant Breathing", "Extended Exhale", "Breath Retention", "Tummo Inner Fire", "Circular Breathing", "Tactical Breathing", "Paced Breathing", "Vase Breathing", "Surya Bhedana", "Simhasana (Lion's Breath)", "Counted Breathing", "Natural Breathing", "Pursed-Lip Breathing", "Straw Breathing", "Dirga Pranayama", "Breath Holds", "Reverse Breathing", "Cold Exposure Breathing", "Conscious Connected Breathing", "Recovery Breathing", "Partner Breathing", "Toning with Breath", "Trauma Release Breathing"],
  "Loving-Kindness": ["Loving-Kindness (Metta)", "Metta for Self", "Metta for Difficult Person", "Metta for Neutral Person", "Tonglen (Sending and Taking)", "Karuna (Compassion)", "Just-Like-Me Meditation", "Compassion-Focused Imagery", "Tonglen Partner Practice"],
  "Sleep": ["Sleep Preparation Ritual", "Letting Go Practice", "Face Release", "Jaw Release", "Breath-Coordinated Release", "Evening Reflection", "Receptive Sensing", "Flotation-REST", "Sabbath Practice"],
  "Sound Healing": ["Tibetan Singing Bowl Sound Bath", "Binaural Beats", "Vocal Toning", "Overtone Singing", "Shamanic Drumming Journey", "Rain Sound Meditation", "Raga Meditation", "Pink Noise", "White Noise Meditation", "Soundscape Awareness", "Gregorian Chant", "Group Drumming Circle", "ASMR", "Ambient Sound Meditation", "Anahata Nada (Inner Sound)", "Receptive Silence", "Sound Focus", "Taiko Meditation", "Tongue Drum / Handpan", "Qawwali Listening", "Silence Retreat Practice", "Devotional Music", "Environmental Sound", "External Sound", "Singing Along Meditation", "Sound Healing Vocalisation", "Sound and Silence Alternation", "Vocal Toning Body Scan", "Tibetan Bowl Striking", "Music and Breathwork Integration"],
  "Visualization": ["Safe Place Visualization", "Mountain Meditation", "Garden Visualization", "Best Possible Self", "White Light Meditation", "Cord Cutting Visualization", "Colour Breathing", "Container Visualization", "Inner Advisor Visualization", "Success Rehearsal", "Threshold Crossing", "Active Imagination", "Archetypal Encounter", "Creative Imagery", "Five Elements Balancing", "Forgiveness Visualization", "Gratitude Visualization", "Guru Yoga", "Kabbalistic Pathworking", "Light Body Visualization", "Memory Reconsolidation Imagery", "Pranic Healing Visualization", "Pure Land Visualization", "Vajrasattva Purification", "Body Dialogue Visualization", "Intention Setting Visualization"],
  "Gratitude": ["Gratitude Meditation", "Savoring Practice"],
  "Somatics": ["Somatic Experiencing", "Pendulation Practice", "Titration Practice", "Orienting Practice", "Boundary Awareness", "Impulse Tracking", "Somatic Unwinding", "Body Story Tracking", "Discharge Awareness", "Hakomi Mindful Body Inquiry", "Sensorimotor Awareness", "Completion of Defensive Responses"],
  "Meditation": ["Do Nothing", "Shikantaza (Just Sitting)", "Samatha", "Choiceless Awareness", "Koan Practice", "Trataka (Candle Gazing)", "Heart Opening", "Letting Go Meditation", "Spacious Awareness", "Panoramic Awareness", "Centering Practice", "Heartfulness Practice", "Kundalini Meditation", "Heart Breath", "Heartbeat Awareness", "Heart Space Awareness", "Heart-Gut Connection", "Inner Critic Reframing", "Two-Chair Dialogue", "Quaker Meeting for Worship", "Sharing Circle", "Council Circle Practice", "Indigenous Talking Circle", "Family Constellation Circle", "Group Coherence Meditation", "Collective Intention Setting", "Deeksha (Oneness Blessing)", "Muraqabah (Sufi Heart)", "Qalb Dhikr (Heart Remembrance)", "Clear Light Sleep Yoga", "Schema Mode Awareness"],
  "Yoga Nidra": ["Yoga Nidra", "Sleep Body Scan"],
  "Body Awareness": ["Body Scan", "Postural Scan", "Tense-and-Release", "Felt Sense Check-In", "Sensation Investigation", "Pain Awareness", "Sensory Rest", "Visceral Sensing", "Spinal Wave Awareness", "Stillness-in-Movement", "Subtle Movement Sensing", "Contact Point Awareness", "Passive Body Listening", "Micro-Gesture Awareness", "Visual Field Awareness", "Sense Door Practice", "See-Hear-Feel Practice", "Somatic Inquiry", "Applied Relaxation", "Alexander Technique Awareness", "Body-Mind Centering", "Sitting Alignment Awareness", "Spinal Alignment Awareness", "Lying Posture Awareness", "Primary Control Awareness", "Felt Shift Awareness"],
  "Grounding": ["5-4-3-2-1 Sensory Grounding", "Sit Spot Practice", "Sky Gazing", "Stargazing Meditation", "Sunrise/Sunset Contemplation", "Weight Awareness"],
  "Self-Inquiry": ["Self-Inquiry", "Neti Neti", "Headless Way", "Self-Remembering", "Tracing the I-Thought"],
  "Chakras": ["Chakra Meditation", "Chakra Balancing", "Chakra Cleansing", "Chakra Visualization", "Chakra Awareness", "Chakra-Focused Breathing", "Heart Chakra Meditation"],
  "Qigong": ["Qi Cultivation", "Zhan Zhuang", "Ba Duan Jin", "Microcosmic Orbit", "Dan Tien Meditation", "Shibashi", "Wu Qin Xi", "Authentic Movement", "Continuum Movement", "Gravity-Led Movement", "Gentle Joint Mobilisation", "Jing Cultivation"],
  "Mantra": ["Mantra Repetition (Japa)", "Om Mani Padme Hum", "So Hum Meditation"],
  "Contemplation": ["Contemplative Inquiry", "Impermanence Contemplation", "Five Remembrances", "Existential Inquiry", "Poetry Contemplation", "Philosophical Reflection", "Six Element Meditation", "Precious Human Life", "The Work"],
  "Journaling": ["Contemplative Journaling", "Ignatian Examen", "Naikan Reflection", "Life Review Meditation", "Values Contemplation", "Attachment-Based Self-Reflection"],
  "Relationships": ["Eye-Gazing", "Insight Dialogue", "Empathic Listening", "Authentic Relating", "Nonviolent Communication", "Imago Dialogue", "Contemplative Dyad", "Contemplative Hevruta", "Gottman-Informed Connection", "Touch-Based Partner Meditation"],
  "Nervous System Regulation": ["Orienting to Safety", "Settling Practice", "Co-Regulation Practice", "Glimmers Practice", "Dorsal Vagal Awareness", "Capacity Building", "Polyvagal-Informed Self-Regulation"],
  "Non-Dual Awareness": ["Resting as Awareness", "Loving Awareness", "Witness Consciousness", "Direct Recognition", "Natural State Resting", "Mahamudra Natural Mind"],
  "Energy Work": ["Reiki Self-Healing", "Inner Smile", "Aura Sensing", "Aura Cleansing", "Prana/Chi Awareness", "Nadi/Meridian Awareness", "Light Body Meditation", "Crystal Healing", "Energy Blockage Awareness", "Middle Pillar", "Qabalistic Cross", "Sefirot Sequential Meditation", "Shaktipat Meditation", "Sacred Union Meditation", "Lightning Flash Meditation", "Jin Shin Jyutsu Self-Help", "Jigam (Energy Sensing)", "Pratyabhijna (Self-Recognition)"],
  "Prayer": ["Silent Prayer", "Lectio Divina", "Dhikr (Remembrance of Allah)", "Refuge Prayer", "Bodhisattva Vow", "Surrender Prayer", "Bhakti Meditation", "Puja", "Simran (Naam Japna)", "Salawat (Prophetic Blessing)", "Hitbodedut", "Amidah Meditation", "Nembutsu / Nianfo", "Buddhānussati", "Angelic Invocation", "Darshan-Style Presence"],
  "Dance": ["Free-Form Movement", "Flowing Rhythm", "Staccato Rhythm", "Chaos Rhythm", "Stillness Rhythm", "Nataraj Meditation", "Sema Ceremony Practice", "Open Floor Practice", "Soul Motion Practice", "Music-Driven Movement", "Embodied Celebration", "Peak-and-Release Dance"],
  "Chanting": ["Kirtan", "Bhajans", "Buddhist Sutra Chanting", "Sacred Choral Singing"],
  "Mindful Movement": ["TRE-Style Shaking", "Therapeutic Tremoring", "Vibrational Release", "Osho Dynamic Meditation", "Osho Kundalini Shaking", "Standing Zikr with Movement"],
  "Lucid Dreaming": ["Lucid Dream Induction", "Dream Yoga", "Dream Incubation", "WILD Practice", "Astral Projection"],
  "Inner Child Work": ["Inner Child Healing", "Inner Child Visualization"],
  "Forgiveness": ["Forgiveness Practice", "Forgiveness of Self Practice"],
  "Shadow Work": ["Shadow Work Visualization"],
  "IFS": ["Parts Dialogue Practice", "Parts-Based Visualization"],
  "ACT": ["Acceptance Meditation", "Leaves on a Stream", "Observer Self Meditation", "Values Clarification"],
  "CBT": ["Thought Record Practice", "Rational Self-Analysis", "Behavioral Activation Meditation"],
  "DBT": ["Emotion Surfing Practice", "Half-Smile & Willing Hands", "Self-Soothing Practice", "Interpersonal Effectiveness"],
  "Hypnotherapy": ["Self-Hypnosis", "Ericksonian Trance"],
  "Habit Building": ["Habit Stacking", "Habit Loop Awareness", "Tiny Habits Practice", "Identity-Based Habit Change", "Mindful Self-Discipline"],
  "Life Coaching": ["Purpose Discovery", "Ikigai Exploration", "Growth Mindset", "Character Strengths Meditation", "Strengths Spotting", "Self-Coaching Practice", "Life Transitions", "Work-Life Integration", "NLP Anchoring", "NLP Presuppositions"],
  "Affirmations": ["Affirmation Meditation", "Self-Affirmation Practice"],
  "Intention Setting": ["Sankalpa Practice"],
  "Goal Setting": ["Accountability Self-Review"],
  "Self-Discovery": ["Mirror Work"],
  "Shamanic Journey": ["Descent Journey", "Soul Retrieval Visualization", "Vision Quest"],
  "Tai Chi": ["Tai Chi Walking", "Wuji Standing"],
  "Walking Meditation": ["Kinhin (Zen Walking)", "Labyrinth Walking"],
  "Yoga": ["Vinyasa Flow", "Restorative Yoga"],
};

export const CATEGORIES = Object.keys(TECHNIQUES);
