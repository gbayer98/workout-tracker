/**
 * Aviation facts database for workout completion comparisons.
 *
 * Each fact has a weight in lbs and a fun description. When a workout finishes,
 * we find the best comparison based on total mass moved.
 *
 * Format options for comparisons:
 * - exact: "You just lifted a {name}!"
 * - fraction: "You moved {pct}% of a {name}"
 * - multiple: "You lifted {n} {name}s"
 */

interface AviationFact {
  /** Weight in lbs */
  weightLbs: number;
  /** Short label for the thing */
  name: string;
  /** The fun factoid sentence — should land as a punchline */
  fact: string;
  /** Emoji for flavor */
  emoji: string;
}

// Sorted by weight ascending. Mix of components, whole aircraft, and niche trivia.
const AVIATION_FACTS: AviationFact[] = [
  {
    weightLbs: 11,
    name: "a black box flight recorder",
    fact: "The thing that survives every crash — you just moved it.",
    emoji: "\u{1F4E6}",
  },
  {
    weightLbs: 27,
    name: "a Cessna 172 propeller",
    fact: "The part that actually keeps the bugs off the windshield.",
    emoji: "\u{1FA78}",
  },
  {
    weightLbs: 45,
    name: "an F-16 ejection seat headrest",
    fact: "The last thing a fighter pilot's helmet touches before pulling 14 Gs.",
    emoji: "\u{1FA96}",
  },
  {
    weightLbs: 65,
    name: "an airline beverage cart",
    fact: "Full of tiny bottles and passive-aggressive eye contact from row 34.",
    emoji: "\u{1F37A}",
  },
  {
    weightLbs: 130,
    name: "an ACES II ejection seat",
    fact: "This seat fires you out of an F-16 at 250 knots. You just casually lifted it.",
    emoji: "\u{1FA82}",
  },
  {
    weightLbs: 200,
    name: "a 747 main landing gear tire",
    fact: "Rated for 235 mph touchdowns and 38 tons of load. Replaced every ~300 landings.",
    emoji: "\u{1F6DE}",
  },
  {
    weightLbs: 274,
    name: "a Rolls-Royce Trent 1000 fan blade set",
    fact: "Each blade is a single crystal of titanium. A 787 has 20 of them per engine.",
    emoji: "\u{2699}\u{FE0F}",
  },
  {
    weightLbs: 440,
    name: "an aircraft lavatory module",
    fact: "Yes, the whole bathroom. At 35,000 feet someone is in there right now wondering about the blue liquid.",
    emoji: "\u{1F6BD}",
  },
  {
    weightLbs: 605,
    name: "the 1903 Wright Flyer",
    fact: "The entire aircraft that started it all at Kitty Hawk. 12 seconds of flight. You just picked it up.",
    emoji: "\u{2708}\u{FE0F}",
  },
  {
    weightLbs: 800,
    name: "a Pratt & Whitney R-1340 Wasp radial engine",
    fact: "The engine that powered the first solo Atlantic crossing. Used in over 100 aircraft designs.",
    emoji: "\u{1F529}",
  },
  {
    weightLbs: 1200,
    name: "a Cessna 172 fuel load on a max-range flight",
    fact: "That's 53 gallons of 100LL avgas — enough to fly you from Dallas to Denver.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 1663,
    name: "a Cessna 172 Skyhawk (empty)",
    fact: "The most-produced aircraft in history. More than 44,000 built. You just benched one.",
    emoji: "\u{1F6E9}\u{FE0F}",
  },
  {
    weightLbs: 2150,
    name: "the Spirit of St. Louis",
    fact: "The aircraft Lindbergh flew solo across the Atlantic in 1927 — fully fueled, ready for takeoff.",
    emoji: "\u{1F30D}",
  },
  {
    weightLbs: 2800,
    name: "a Robinson R44 helicopter",
    fact: "The world's best-selling turbine helicopter. You just shoulder-pressed one.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 3800,
    name: "a Cirrus SR22 with full fuel",
    fact: "The best-selling GA piston aircraft with a whole-airframe parachute. Yes, the whole plane has a chute.",
    emoji: "\u{1FA82}",
  },
  {
    weightLbs: 5216,
    name: "a CFM56-3 jet engine",
    fact: "The engine that powered every 737 Classic. 20,000 lbs of thrust from something you just out-lifted.",
    emoji: "\u{1F525}",
  },
  {
    weightLbs: 7500,
    name: "the fuel load for a CRJ-200 hop from Dallas to Houston",
    fact: "About 50 minutes of flight time at FL330. You just moved the gas bill.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 10000,
    name: "a Beechcraft King Air 350",
    fact: "A turboprop that can fly at 35,000 feet. Doctors, executives, and cargo all ride in these.",
    emoji: "\u{1F451}",
  },
  {
    weightLbs: 15961,
    name: "an F-16 Fighting Falcon (empty)",
    fact: "A Mach 2 fighter jet. You just moved one off the flight line.",
    emoji: "\u{1F985}",
  },
  {
    weightLbs: 24000,
    name: "a Learjet 75 Liberty",
    fact: "Max cruise: 465 knots. Range: 2,040 nm. Interior: smells like rich mahogany.",
    emoji: "\u{2728}",
  },
  {
    weightLbs: 33000,
    name: "the fuel load of a 737 MAX 8 flying LAX to JFK",
    fact: "About 5 hours of fuel at FL390. You just moved that entire fuel load.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 45000,
    name: "a fully loaded Predator MQ-9 Reaper drone",
    fact: "Wingspan of 66 feet, loiter time of 27 hours, and you just deadlifted one.",
    emoji: "\u{1F916}",
  },
  {
    weightLbs: 60000,
    name: "an SR-71 Blackbird (empty)",
    fact: "Mach 3.3 at 85,000 feet. Still the fastest air-breathing manned aircraft ever. You moved it.",
    emoji: "\u{1F426}\u{200D}\u{2B1B}",
  },
  {
    weightLbs: 91300,
    name: "a Boeing 737-800 (empty)",
    fact: "Southwest has 700 of these. You just lifted one off the ramp.",
    emoji: "\u{2708}\u{FE0F}",
  },
  {
    weightLbs: 172500,
    name: "a fully loaded 737-800 at max takeoff weight",
    fact: "189 passengers, bags, fuel, and crew. All of it. You moved all of it.",
    emoji: "\u{1F6EB}",
  },
  {
    weightLbs: 280000,
    name: "a Boeing 787-8 Dreamliner (empty)",
    fact: "50% composite by weight. The most efficient widebody ever built. You just outmuscled it.",
    emoji: "\u{1F30F}",
  },
  {
    weightLbs: 485300,
    name: "a Boeing 747-400 (empty)",
    fact: "The Queen of the Skies. Six million parts, 171 miles of wiring, and you moved it all.",
    emoji: "\u{1F451}",
  },
  {
    weightLbs: 775000,
    name: "a Boeing 777-300ER at max takeoff weight",
    fact: "The longest-range twin-engine jet in service. LAX to Singapore, nonstop. You just moved it.",
    emoji: "\u{1F30F}",
  },
  {
    weightLbs: 987000,
    name: "a Boeing 747-8 at max takeoff weight",
    fact: "The heaviest commercial aircraft ever built by Boeing. Nearly a million pounds. You did that.",
    emoji: "\u{1F680}",
  },
];

export interface AviationComparison {
  emoji: string;
  headline: string;
  detail: string;
}

/**
 * Given total mass moved in lbs, find the most interesting aviation comparison.
 * Returns a fun factoid with headline and detail text.
 */
export function getAviationComparison(massMovedLbs: number): AviationComparison | null {
  if (massMovedLbs <= 0) return null;

  // Strategy: find the closest fact where we can make a clean comparison.
  // Prefer exact matches (0.8x to 1.2x), then multiples, then fractions.

  let bestMatch: {
    fact: AviationFact;
    ratio: number;
    type: "exact" | "multiple" | "fraction";
  } | null = null;

  for (const fact of AVIATION_FACTS) {
    const ratio = massMovedLbs / fact.weightLbs;

    // Exact-ish match (within 80%-120%)
    if (ratio >= 0.8 && ratio <= 1.2) {
      bestMatch = { fact, ratio, type: "exact" };
      break; // Exact match is best, stop looking
    }

    // Clean multiple (2x to 50x, prefer round-ish numbers)
    if (ratio >= 2 && ratio <= 50) {
      const rounded = Math.round(ratio);
      if (!bestMatch || bestMatch.type !== "exact") {
        bestMatch = { fact, ratio: rounded, type: "multiple" };
      }
    }

    // Percentage of something big (10% to 99%)
    if (ratio >= 0.1 && ratio < 0.8) {
      const pct = Math.round(ratio * 100);
      if (!bestMatch || (bestMatch.type === "fraction" && fact.weightLbs > bestMatch.fact.weightLbs)) {
        bestMatch = { fact, ratio: pct, type: "fraction" };
      }
    }
  }

  if (!bestMatch) {
    // Fallback for very small workouts
    const lightest = AVIATION_FACTS[0];
    const pct = Math.round((massMovedLbs / lightest.weightLbs) * 100);
    if (pct >= 1) {
      return {
        emoji: lightest.emoji,
        headline: `You moved ${pct}% of ${lightest.name}`,
        detail: lightest.fact,
      };
    }
    return null;
  }

  const { fact, ratio, type } = bestMatch;

  if (type === "exact") {
    return {
      emoji: fact.emoji,
      headline: `You just lifted ${fact.name}`,
      detail: fact.fact,
    };
  }

  if (type === "multiple") {
    return {
      emoji: fact.emoji,
      headline: `You moved ${ratio}x ${fact.name}`,
      detail: fact.fact,
    };
  }

  // fraction
  return {
    emoji: fact.emoji,
    headline: `You moved ${ratio}% of ${fact.name}`,
    detail: fact.fact,
  };
}
