/**
 * Aviation facts database for workout completion comparisons.
 *
 * Each fact has a weight in lbs and a fun description. When a workout finishes,
 * we find the best comparison based on total mass moved.
 *
 * Facts are curated for personality — niche, surprising, specific. The kind of
 * thing that makes you go "wait, really?" and tell someone about it.
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

// Sorted by weight ascending.
// Mix of components, whole aircraft, military, commercial, space, and weird trivia.
const AVIATION_FACTS: AviationFact[] = [
  // ===== ULTRA LIGHT (1-25 lbs) =====
  {
    weightLbs: 1.5,
    name: "an airplane mode switch",
    fact: "Just kidding. But the FAA's entire regulation on portable electronic devices is 47 pages long.",
    emoji: "\u{1F4F1}",
  },
  {
    weightLbs: 3,
    name: "an ADS-B transponder",
    fact: "This little box broadcasts your position to every aircraft within 200 miles. FAA made it mandatory in 2020.",
    emoji: "\u{1F4E1}",
  },
  {
    weightLbs: 5,
    name: "a cockpit voice recorder microphone",
    fact: "It captures the last 2 hours of everything said in the cockpit. Everything.",
    emoji: "\u{1F3A4}",
  },
  {
    weightLbs: 7,
    name: "an SR-71 Blackbird pilot's helmet visor",
    fact: "Gold-plated to reflect solar radiation at 85,000 feet where the sky turns black.",
    emoji: "\u{1FA96}",
  },
  {
    weightLbs: 8,
    name: "a fighter pilot's G-suit",
    fact: "Inflates around your legs at 4+ Gs to keep blood from pooling. Without it, you'd black out in seconds.",
    emoji: "\u{1F9BE}",
  },
  {
    weightLbs: 11,
    name: "a black box flight recorder",
    fact: "Survives 3,400 Gs of impact and 2,000\u00B0F fires. Also it's orange, not black.",
    emoji: "\u{1F4E6}",
  },
  {
    weightLbs: 14,
    name: "an F-22 Raptor oxygen mask",
    fact: "Delivers breathing gas up to 60,000 feet. The mask alone costs more than most used cars.",
    emoji: "\u{1F637}",
  },
  {
    weightLbs: 18,
    name: "a B-2 Spirit windshield wiper motor",
    fact: "Even a $2 billion stealth bomber needs to see through the rain.",
    emoji: "\u{1F327}\u{FE0F}",
  },
  {
    weightLbs: 22,
    name: "a Stinger missile",
    fact: "Shoulder-fired, heat-seeking, Mach 2.2. Changed the entire Soviet-Afghan war.",
    emoji: "\u{1F680}",
  },

  // ===== LIGHT (25-100 lbs) =====
  {
    weightLbs: 27,
    name: "a Cessna 172 propeller",
    fact: "Two blades of aluminum spinning at 2,400 RPM. Also doubles as a very aggressive bug zapper.",
    emoji: "\u{1FA78}",
  },
  {
    weightLbs: 30,
    name: "an A-10 Warthog pilot's seat armor plate",
    fact: "A titanium bathtub that can take hits from 23mm cannon rounds. The pilot sits in it like a throne.",
    emoji: "\u{1F6E1}\u{FE0F}",
  },
  {
    weightLbs: 35,
    name: "an aircraft emergency slide inflation bottle",
    fact: "Goes from a packed suitcase to a 16-foot slide in under 6 seconds. Don't pull that handle.",
    emoji: "\u{1F6DD}",
  },
  {
    weightLbs: 42,
    name: "a Sidewinder AIM-9 missile",
    fact: "First fired in combat in 1958. Still in service. Has killed more aircraft than any other missile in history.",
    emoji: "\u{1F4A5}",
  },
  {
    weightLbs: 50,
    name: "an Apollo astronaut's spacesuit",
    fact: "21 layers of material. Cost $100,000 in 1969 dollars. Had to be custom-fitted like a bespoke suit.",
    emoji: "\u{1F468}\u{200D}\u{1F680}",
  },
  {
    weightLbs: 65,
    name: "an airline beverage cart (empty)",
    fact: "Full of tiny bottles and passive-aggressive eye contact from row 34.",
    emoji: "\u{1F37A}",
  },
  {
    weightLbs: 75,
    name: "a Hellfire missile",
    fact: "Laser-guided, launched from an Apache helicopter. Travels at Mach 1.3 and costs $117,000.",
    emoji: "\u{1F525}",
  },
  {
    weightLbs: 85,
    name: "an F-35 Lightning II helmet",
    fact: "Costs $400,000. Lets the pilot see through the airplane. Yes, through it. Cameras on the outside, display inside.",
    emoji: "\u{1FA96}",
  },

  // ===== MEDIUM-LIGHT (100-350 lbs) =====
  {
    weightLbs: 100,
    name: "a loaded airline cargo container (LD3 half)",
    fact: "That little metal igloo in the belly of every widebody. Your suitcase is in one right now.",
    emoji: "\u{1F9F3}",
  },
  {
    weightLbs: 130,
    name: "an ACES II ejection seat",
    fact: "Fires you out of an F-16 at 250 knots using a rocket. Zero-zero capability: works at zero altitude, zero speed.",
    emoji: "\u{1FA82}",
  },
  {
    weightLbs: 150,
    name: "a 747 cockpit door (post-9/11)",
    fact: "Reinforced to resist small arms fire and grenade blasts. Basically a bank vault at 35,000 feet.",
    emoji: "\u{1F6AA}",
  },
  {
    weightLbs: 185,
    name: "the GAU-8 Avenger's ammo drum (empty)",
    fact: "The drum alone — without the 1,174 rounds of depleted uranium it holds for the A-10 Warthog.",
    emoji: "\u{1F4A3}",
  },
  {
    weightLbs: 200,
    name: "a 747 main landing gear tire",
    fact: "Rated for 235 mph touchdowns and 38 tons of load. Costs $5,000. Replaced every ~300 landings.",
    emoji: "\u{1F6DE}",
  },
  {
    weightLbs: 230,
    name: "a JDAM guidance kit",
    fact: "Strapped onto a dumb bomb to make it GPS-guided. Turns $25k of iron into a precision weapon.",
    emoji: "\u{1F3AF}",
  },
  {
    weightLbs: 265,
    name: "an F-16 nose cone radome",
    fact: "Protects the AN/APG-68 radar that can track targets 80 nautical miles out. Made of fiberglass so radar passes through.",
    emoji: "\u{1F4E1}",
  },
  {
    weightLbs: 274,
    name: "a Rolls-Royce Trent 1000 fan blade set",
    fact: "Each blade is a single crystal of titanium alloy. A 787 has 20 of them per engine spinning at 2,700 RPM.",
    emoji: "\u{2699}\u{FE0F}",
  },
  {
    weightLbs: 320,
    name: "a Cessna 172 engine (Lycoming O-360)",
    fact: "180 horsepower from 4 cylinders. Air-cooled. Has been basically the same design since the 1950s. If it ain't broke...",
    emoji: "\u{1F527}",
  },
  {
    weightLbs: 345,
    name: "a GBU-12 Paveway laser-guided bomb",
    fact: "A 500-lb bomb with a laser seeker bolted on. The weapon of choice for close air support since Vietnam.",
    emoji: "\u{1F4A5}",
  },

  // ===== MEDIUM (350-800 lbs) =====
  {
    weightLbs: 370,
    name: "the Space Shuttle's toilet",
    fact: "Cost $23 million to develop. Used airflow instead of gravity. Astronauts had to practice aiming with a camera.",
    emoji: "\u{1F6BD}",
  },
  {
    weightLbs: 440,
    name: "an aircraft lavatory module",
    fact: "The whole bathroom. At FL350 someone is in there right now wondering about the blue liquid.",
    emoji: "\u{1F6BD}",
  },
  {
    weightLbs: 500,
    name: "a Mark 82 general-purpose bomb",
    fact: "The most dropped bomb in US military history. Simple, unguided, devastating. First used in Vietnam, still in service.",
    emoji: "\u{1F4A3}",
  },
  {
    weightLbs: 530,
    name: "an AMRAAM AIM-120 missile loadout (4 missiles)",
    fact: "What an F-22 carries internally. Each one can hit a target 100 miles away at Mach 4.",
    emoji: "\u{1F680}",
  },
  {
    weightLbs: 605,
    name: "the 1903 Wright Flyer",
    fact: "The entire aircraft that started everything at Kitty Hawk. 12 seconds of flight. You just picked it up.",
    emoji: "\u{2708}\u{FE0F}",
  },
  {
    weightLbs: 620,
    name: "an RQ-11 Raven surveillance drone",
    fact: "Just kidding — a Raven weighs 4 lbs. You moved 155 of them. Enough to surveil an entire country.",
    emoji: "\u{1F440}",
  },
  {
    weightLbs: 700,
    name: "a Pratt & Whitney F119 afterburner section",
    fact: "The back half of the engine that gives the F-22 supercruise — supersonic without afterburner. Only fighter that can do it.",
    emoji: "\u{1F525}",
  },
  {
    weightLbs: 800,
    name: "a Pratt & Whitney R-1340 Wasp radial engine",
    fact: "Nine cylinders arranged in a star. The engine that made commercial aviation possible in the 1930s.",
    emoji: "\u{1F529}",
  },

  // ===== MEDIUM-HEAVY (800-2,000 lbs) =====
  {
    weightLbs: 925,
    name: "a Mark 84 bomb",
    fact: "2,000 lbs of explosive and casing. Creates a crater 50 feet wide. The biggest conventional bomb in standard US inventory.",
    emoji: "\u{1F4A5}",
  },
  {
    weightLbs: 1000,
    name: "a Cessna 172's max useful load",
    fact: "Pilot, three passengers, fuel, and bags. That's it. You just moved everything a Skyhawk can carry.",
    emoji: "\u{1F6E9}\u{FE0F}",
  },
  {
    weightLbs: 1100,
    name: "a Maverick AGM-65 missile (loaded on an A-10)",
    fact: "TV or infrared guided. The A-10 can carry 6 of them. Tank commanders hate this one weird trick.",
    emoji: "\u{1F3AF}",
  },
  {
    weightLbs: 1200,
    name: "a Cessna 172's fuel for a max-range flight",
    fact: "53 gallons of 100LL avgas — enough to fly you from Dallas to Denver with reserves.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 1350,
    name: "a P-51 Mustang's Rolls-Royce Merlin engine",
    fact: "V-12, 1,490 horsepower, supercharged. The sound alone won the air war over Europe.",
    emoji: "\u{1F3B5}",
  },
  {
    weightLbs: 1500,
    name: "an AH-64 Apache helicopter rotor head assembly",
    fact: "Four blades, fully articulated. Can take 23mm hits and keep spinning. They engineered it to be angry.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 1663,
    name: "a Cessna 172 Skyhawk (empty)",
    fact: "The most-produced aircraft in history. Over 44,000 built and counting. You just benched one.",
    emoji: "\u{1F6E9}\u{FE0F}",
  },
  {
    weightLbs: 1800,
    name: "an F-16's full internal fuel load",
    fact: "7,000 lbs of JP-8. Burns through it in about 2 hours at military power. Your gas bill is nothing.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 1940,
    name: "a GAU-8 Avenger cannon (without ammo)",
    fact: "The 30mm gatling gun built for the A-10 Warthog. They literally designed the airplane around this gun.",
    emoji: "\u{1F52B}",
  },

  // ===== HEAVY (2,000-5,000 lbs) =====
  {
    weightLbs: 2150,
    name: "the Spirit of St. Louis (ready for takeoff)",
    fact: "Lindbergh flew this solo across the Atlantic in 1927. No GPS, no autopilot, no copilot, 33.5 hours awake.",
    emoji: "\u{1F30D}",
  },
  {
    weightLbs: 2430,
    name: "a GBU-31 JDAM (2,000 lb class)",
    fact: "GPS-guided. Dropped from 40,000 feet. Hits within 15 feet of the target. Every. Single. Time.",
    emoji: "\u{1F3AF}",
  },
  {
    weightLbs: 2650,
    name: "a Piper Cub (loaded for a bush flight in Alaska)",
    fact: "On oversized tundra tires, with a moose strapped to the floats. This is normal in Alaska.",
    emoji: "\u{1F3D4}\u{FE0F}",
  },
  {
    weightLbs: 2800,
    name: "a Robinson R44 helicopter",
    fact: "The best-selling civil helicopter in the world. News choppers, ranch work, flight schools. You just shoulder-pressed one.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 3100,
    name: "a Predator MQ-1 drone (empty)",
    fact: "The drone that changed modern warfare. Flew its first armed mission in 2001. Controlled from a trailer in Nevada.",
    emoji: "\u{1F916}",
  },
  {
    weightLbs: 3500,
    name: "a Spitfire Mk I (empty)",
    fact: "The fighter that saved Britain in 1940. Elliptical wings, Merlin engine, and more kill markings than any other Allied fighter.",
    emoji: "\u{1F1EC}\u{1F1E7}",
  },
  {
    weightLbs: 3800,
    name: "a Cirrus SR22 with full fuel",
    fact: "Best-selling GA piston aircraft. Has a whole-airframe parachute. Pull a handle and the entire plane floats down.",
    emoji: "\u{1FA82}",
  },
  {
    weightLbs: 4200,
    name: "a T-38 Talon (empty)",
    fact: "Every US Air Force pilot since 1961 learned to fly supersonic in this. Over 50,000 pilots trained.",
    emoji: "\u{1F393}",
  },
  {
    weightLbs: 4900,
    name: "a Cessna Citation M2 engine (one side)",
    fact: "A Williams FJ44 turbofan. Sips 100 gallons per hour and gets you to FL410. Business meeting in 2 hours.",
    emoji: "\u{1F4BC}",
  },

  // ===== VERY HEAVY (5,000-15,000 lbs) =====
  {
    weightLbs: 5216,
    name: "a CFM56-3 jet engine",
    fact: "Powered every 737 Classic ever built. 20,000 lbs of thrust from something you just out-lifted.",
    emoji: "\u{1F525}",
  },
  {
    weightLbs: 5800,
    name: "a de Havilland Beaver (loaded for floats)",
    fact: "The greatest bush plane ever made. Lands on water, gravel, ice. Canada's gift to aviation.",
    emoji: "\u{1F1E8}\u{1F1E6}",
  },
  {
    weightLbs: 6300,
    name: "an AH-1 Cobra attack helicopter (empty)",
    fact: "The first dedicated attack helicopter. So narrow from the front it's nearly invisible in a head-on approach.",
    emoji: "\u{1F40D}",
  },
  {
    weightLbs: 7500,
    name: "the fuel for a CRJ-200 from Dallas to Houston",
    fact: "50 minutes of flight time at FL330. You just casually moved the gas bill for 50 passengers.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 8500,
    name: "an F-5 Tiger II (empty)",
    fact: "The aggressor aircraft. Plays the bad guy at Top Gun school. Small, cheap, and very hard to see in a dogfight.",
    emoji: "\u{1F405}",
  },
  {
    weightLbs: 9200,
    name: "a GE-F414 engine pair (Super Hornet)",
    fact: "The two engines in an F/A-18E/F Super Hornet. Together they make 44,000 lbs of thrust. You moved both.",
    emoji: "\u{1F525}",
  },
  {
    weightLbs: 10000,
    name: "a Beechcraft King Air 350",
    fact: "A turboprop that climbs to FL350. Doctors, executives, and cargo all ride in these. The Toyota Camry of business aviation.",
    emoji: "\u{1F451}",
  },
  {
    weightLbs: 11300,
    name: "an MH-6 Little Bird helicopter (loaded)",
    fact: "The special ops helicopter. Fits 6 operators on external benches. They literally sit on the outside.",
    emoji: "\u{1F977}",
  },
  {
    weightLbs: 12500,
    name: "a UH-1 Huey (empty)",
    fact: "The sound of Vietnam. That iconic \"whop-whop-whop.\" Over 16,000 built. More than any other military helicopter.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 14500,
    name: "a P-3 Orion torpedo loadout",
    fact: "8 torpedoes in the bomb bay of a submarine hunter. Flying around at 200 knots listening for subs with sonobuoys.",
    emoji: "\u{1F4A3}",
  },

  // ===== AIRCRAFT-WEIGHT CLASS (15,000-50,000 lbs) =====
  {
    weightLbs: 15961,
    name: "an F-16 Fighting Falcon (empty)",
    fact: "A Mach 2 fighter that can pull 9 Gs. First flew in 1974 and will still be flying in 2050. You just moved it off the ramp.",
    emoji: "\u{1F985}",
  },
  {
    weightLbs: 19700,
    name: "an F/A-18C Hornet (empty)",
    fact: "Tom Cruise flew one in the original Top Gun. Well, sat in one. The Navy flew it. You just lifted it.",
    emoji: "\u{1F3AC}",
  },
  {
    weightLbs: 22000,
    name: "an AH-64 Apache (empty)",
    fact: "Can find, track, and engage 128 targets simultaneously. Flies at night in sandstorms. And you just picked it up.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 24000,
    name: "a Learjet 75 Liberty",
    fact: "Max cruise: 465 knots. Range: 2,040 nm. Interior: smells like rich mahogany and good decisions.",
    emoji: "\u{2728}",
  },
  {
    weightLbs: 29300,
    name: "a fully loaded F-16 with external stores",
    fact: "2 AIM-9s, 6 AMRAAMs, a targeting pod, two drop tanks, and 500 rounds. Ready for war. You moved all of it.",
    emoji: "\u{1FA96}",
  },
  {
    weightLbs: 33000,
    name: "the fuel for a 737 MAX 8 flying LAX to JFK",
    fact: "5 hours of fuel at FL390. About 5,000 gallons. That's $20,000 of Jet-A you just moved.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 36000,
    name: "an F-22 Raptor (empty)",
    fact: "The most dominant air superiority fighter ever built. Stealth, supercruise, thrust vectoring. And you just moved it.",
    emoji: "\u{1F985}",
  },
  {
    weightLbs: 40000,
    name: "a Chinook CH-47 helicopter (empty)",
    fact: "Twin rotors, no tail rotor. Can carry a howitzer underneath while troops sit inside. The Army's flying truck.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 45000,
    name: "a fully loaded MQ-9 Reaper drone",
    fact: "Wingspan of 66 feet. Loiter time: 27 hours. Controlled from 7,500 miles away. You just deadlifted one.",
    emoji: "\u{1F916}",
  },
  {
    weightLbs: 50000,
    name: "a fully loaded Chinook (troops + cargo)",
    fact: "26,000 lbs of cargo slung underneath plus 33 troops inside. All of it. On your back.",
    emoji: "\u{1F4AA}",
  },

  // ===== HEAVY AIRCRAFT (50,000-200,000 lbs) =====
  {
    weightLbs: 55000,
    name: "a B-25 Mitchell bomber (loaded)",
    fact: "16 of these took off from an aircraft carrier to bomb Tokyo in 1942. Doolittle Raid. Bonkers idea. Worked.",
    emoji: "\u{1F4A3}",
  },
  {
    weightLbs: 60000,
    name: "an SR-71 Blackbird (empty)",
    fact: "Mach 3.3 at 85,000 feet. Leaked fuel on the ground because the panels expanded at speed. Still unmatched.",
    emoji: "\u{1F426}\u{200D}\u{2B1B}",
  },
  {
    weightLbs: 68000,
    name: "an F-35 Lightning II at max takeoff weight",
    fact: "Stealth, vertical landing, helmet that sees through the airframe, AI-assisted targeting. And you just moved it.",
    emoji: "\u{26A1}",
  },
  {
    weightLbs: 75000,
    name: "a UH-60 Black Hawk at max gross weight",
    fact: "The workhorse of the US Army. Medevac, assault, special ops. You just moved one fully loaded.",
    emoji: "\u{1F681}",
  },
  {
    weightLbs: 83000,
    name: "an F-15E Strike Eagle (max takeoff weight)",
    fact: "104-0 kill record. Has never been shot down in air combat. The most dominant fighter in history, and you moved it.",
    emoji: "\u{1F985}",
  },
  {
    weightLbs: 91300,
    name: "a Boeing 737-800 (empty)",
    fact: "Southwest has 700 of these. You just lifted one off the ramp with your bare hands.",
    emoji: "\u{2708}\u{FE0F}",
  },
  {
    weightLbs: 110000,
    name: "an SR-71 Blackbird (at max takeoff weight)",
    fact: "140,000 lbs. 80% of that is fuel. Takes off, immediately refuels, then goes Mach 3. You moved the whole thing.",
    emoji: "\u{1F426}\u{200D}\u{2B1B}",
  },
  {
    weightLbs: 125000,
    name: "the Space Shuttle's payload to orbit",
    fact: "50,000 lbs to low Earth orbit. Hubble Telescope, ISS modules, and satellites. All carried in the cargo bay.",
    emoji: "\u{1F680}",
  },
  {
    weightLbs: 140000,
    name: "an Embraer E175 at max takeoff weight",
    fact: "The regional jet you see at every American Eagle gate. 76 passengers. You moved the whole thing.",
    emoji: "\u{1F6EB}",
  },
  {
    weightLbs: 172500,
    name: "a fully loaded 737-800 at max takeoff weight",
    fact: "189 passengers, bags, fuel, and crew. All of it. You moved all of it.",
    emoji: "\u{1F6EB}",
  },
  {
    weightLbs: 185000,
    name: "a B-1B Lancer (empty)",
    fact: "Variable-sweep wings. Mach 1.25 at altitude. Can carry 75,000 lbs of ordnance internally. The Bone.",
    emoji: "\u{1F4A3}",
  },

  // ===== VERY HEAVY AIRCRAFT (200,000-500,000 lbs) =====
  {
    weightLbs: 220000,
    name: "a P-8 Poseidon (max takeoff)",
    fact: "A 737 converted into a submarine hunter. Drops sonobuoys and torpedoes. Business class has been... repurposed.",
    emoji: "\u{1F433}",
  },
  {
    weightLbs: 250000,
    name: "a KC-135 Stratotanker (empty)",
    fact: "The flying gas station. Refuels fighters mid-air through a boom at 300 knots. You just moved the whole tanker.",
    emoji: "\u{26FD}",
  },
  {
    weightLbs: 280000,
    name: "a Boeing 787-8 Dreamliner (empty)",
    fact: "50% composite by weight. The most efficient widebody ever built. You just outmuscled it.",
    emoji: "\u{1F30F}",
  },
  {
    weightLbs: 300000,
    name: "a B-52 Stratofortress (empty)",
    fact: "First flew in 1952. Will fly until 2050+. Your grandparents, you, and your grandkids will all live under the same B-52s.",
    emoji: "\u{1F4A3}",
  },
  {
    weightLbs: 350000,
    name: "a C-130J Super Hercules (max takeoff)",
    fact: "Lands on dirt strips, drops paratroopers, fights fires, refuels helicopters, flies into hurricanes. Does literally everything.",
    emoji: "\u{1F4AA}",
  },
  {
    weightLbs: 404000,
    name: "an F-22 Raptor production run's worth of titanium",
    fact: "Each F-22 uses 39% titanium by structural weight. At 187 aircraft, that's a lot of exotic metal you just moved.",
    emoji: "\u{2699}\u{FE0F}",
  },
  {
    weightLbs: 485300,
    name: "a Boeing 747-400 (empty)",
    fact: "The Queen of the Skies. Six million parts, 171 miles of wiring, and you moved it all.",
    emoji: "\u{1F451}",
  },

  // ===== ULTRA-HEAVY (500,000+ lbs) =====
  {
    weightLbs: 560000,
    name: "a B-52H at max takeoff weight",
    fact: "488,000 lbs. 8 engines. Can carry 70,000 lbs of weapons. Has been in continuous service for 70 years. You moved it.",
    emoji: "\u{1F4A3}",
  },
  {
    weightLbs: 630000,
    name: "a C-17 Globemaster III (max takeoff)",
    fact: "Can airdrop 102 paratroopers or an M1 Abrams tank. Lands on 3,500-foot dirt strips. You just moved it.",
    emoji: "\u{1F6AC}",
  },
  {
    weightLbs: 775000,
    name: "a Boeing 777-300ER at max takeoff weight",
    fact: "The longest-range twin-engine jet in service. LAX to Singapore nonstop. 17 hours. You moved the whole thing.",
    emoji: "\u{1F30F}",
  },
  {
    weightLbs: 840000,
    name: "a C-5M Super Galaxy (max takeoff)",
    fact: "Can carry 6 Apache helicopters inside. The nose opens AND the tail opens. America's biggest plane. You moved it.",
    emoji: "\u{1F6E9}\u{FE0F}",
  },
  {
    weightLbs: 987000,
    name: "a Boeing 747-8 at max takeoff weight",
    fact: "The heaviest commercial aircraft Boeing ever built. Nearly a million pounds. You did that.",
    emoji: "\u{1F680}",
  },
  {
    weightLbs: 1234600,
    name: "an Airbus A380 at max takeoff weight",
    fact: "The largest passenger aircraft ever built. Double-decker. 853 seats max. 4 engines. 1.2 million pounds. You moved it.",
    emoji: "\u{1F6EB}",
  },
  {
    weightLbs: 1411000,
    name: "an Antonov An-225 Mriya (max takeoff)",
    fact: "The largest airplane ever built. Six engines. One of a kind. Destroyed in 2022. Its memory weighs heavy. So did your workout.",
    emoji: "\u{1F1FA}\u{1F1E6}",
  },
  {
    weightLbs: 4400000,
    name: "the Space Shuttle stack at liftoff",
    fact: "Orbiter + external tank + two solid rocket boosters. 4.4 million pounds leaving the ground at 17,500 mph. You matched it.",
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
 * Picks from all viable matches randomly so you get a different fact each time.
 */
export function getAviationComparison(massMovedLbs: number): AviationComparison | null {
  if (massMovedLbs <= 0) return null;

  interface Match {
    fact: AviationFact;
    displayRatio: number;
    type: "exact" | "multiple" | "fraction";
    /** Lower = better priority */
    priority: number;
  }

  const candidates: Match[] = [];

  for (const fact of AVIATION_FACTS) {
    const ratio = massMovedLbs / fact.weightLbs;

    // Exact-ish match (within 80%-120%) — highest priority
    if (ratio >= 0.8 && ratio <= 1.2) {
      candidates.push({ fact, displayRatio: ratio, type: "exact", priority: 1 });
    }

    // Clean multiple (2x to 30x)
    if (ratio >= 1.8 && ratio <= 30) {
      const rounded = Math.round(ratio);
      candidates.push({ fact, displayRatio: rounded, type: "multiple", priority: 2 });
    }

    // Percentage of something big (10% to 79%)
    if (ratio >= 0.1 && ratio < 0.8) {
      const pct = Math.round(ratio * 100);
      if (pct >= 10) {
        candidates.push({ fact, displayRatio: pct, type: "fraction", priority: 3 });
      }
    }
  }

  if (candidates.length === 0) {
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

  // Pick from the best priority tier, randomly
  const bestPriority = Math.min(...candidates.map((c) => c.priority));
  const topTier = candidates.filter((c) => c.priority === bestPriority);
  const pick = topTier[Math.floor(Math.random() * topTier.length)];

  const { fact, displayRatio, type } = pick;

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
      headline: `You moved ${displayRatio}x ${fact.name}`,
      detail: fact.fact,
    };
  }

  // fraction
  return {
    emoji: fact.emoji,
    headline: `You moved ${displayRatio}% of ${fact.name}`,
    detail: fact.fact,
  };
}
