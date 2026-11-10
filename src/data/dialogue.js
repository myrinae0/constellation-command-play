// Short character lines, keyed by moment. Each key maps to a list; the game
// picks one with the seeded rng. `{district}`, `{name}` and similar tokens are
// filled by ui/text.js fill(). Lines marked "(sample)" come from Chris's
// character sheets; the rest are written in the same voice.

/** @type {Record<string, Array<[string, string]>>} [characterId, line] */
export const LINES = {
  intro: [
    ['narrator', 'A bell rings once. The sound carries through the mist and into the city.'],
    ['narrator', 'Those who can stand, stand. The rest remain. When the ship departs, they go with it.'],
    ['narrator', 'You stood, once. Constellation found you at the dock and brought you up to the Stacks.'],
    ['art', "We can't save the world, but we can save the people still in it. That's enough to keep moving."],
    ['janice', "I'll make this simple. Art decides where we go. You decide who goes. My job is to make sure those two lines meet somewhere above zero."],
    ['art', 'One rule. Everyone comes back.'],
  ],
  'brief.push': [
    ['janice', 'Field signal shows stable resonance in {district}. The city is calm for now, which means it is about to get worse. Stay sharp.'],
    ['janice', 'The fog in {district} is thick but slow. Push it back a street at a time. Report in every thirty.'],
    ['janice', '{district}. Art wants it back. I want everyone back. Those two can both happen.'],
  ],
  'brief.rescue': [
    ['janice', 'Horizon lost sight of arrivals walking into {district}. They will not last long out there.'],
    ['janice', 'Someone stood up on the last ship and kept walking. They are in {district}. Bring them up.'],
  ],
  'brief.gear': [
    ['janice', 'Gear left behind by earlier arrivals, scattered through {district}. Brooklyn wants it before the fog does.'],
    ['brooklyn', "There's kit out in {district} that someone carried a long way. Don't leave it for the rust."],
  ],
  'brief.truth': [
    ['janice', 'Someone faded on the dock, and their Truth sank into {district}. The keepers want it. So do I.'],
    ['janice', "A Truth is lying in the street in {district}. Somebody's sealed letter, with no one left to carry it."],
  ],
  'debrief.victory': [
    ['janice', 'You made it back. That is all I need to know for tonight.'],
    ['janice', 'Clean. Logged. Go eat something.'],
    ['art', 'Good. Now do it again tomorrow, and the day after.'],
    ['janice', 'Numbers are good. The people are better.'],
  ],
  'debrief.retreat': [
    ['art', 'Everyone came back. That is the part that matters. The fog will still be there tomorrow.'],
    ['janice', 'I called them back. The margins closed. We go again when they are ready.'],
    ['art', 'Numbers don\'t matter if we lose what they stand for. Let them rest.'],
  ],
  'debrief.thinned': [
    ['chen', '{name} is thin. Not gone. Give them time and something warm.'],
    ['chen', 'The fog pulled at {name}. Rest holds people together. So does being missed.'],
  ],
  'debrief.cleared': [
    ['art', '{district} is ours again. Light the lamps there tonight.'],
    ['art', 'You remind me of someone who used to believe we would see the sky again. {district} is clear.'],
  ],
  bell: [
    ['horizon', 'A bell rings once at the dock. Everyone in the Stacks goes quiet for a moment.'],
    ['janice', 'Bell. Interval logged. I am not hoping for a pattern.'],
    ['horizon', 'The bell. Horizon Sector goes down to meet the ship.'],
  ],
  fade: [
    ['horizon', '{name} faded before anyone could bring them up. Horizon does not speak of it.'],
    ['chen', 'Chen lights a stick of incense for {name}.'],
  ],
  takeIn: [
    ['horizon', '{name} is walked up to the Stacks. Someone finds them a coat.'],
    ['art', 'Welcome to Constellation, {name}. Get some sleep. You are not alone up here.'],
  ],
  remembered: [
    ['chen', 'Out in the fog, {name} remembered the one thing they know. They are holding it like a sealed letter.'],
  ],
  record: [
    ['keeper', 'The keeper writes it twice: once for the Archive, once for the city. The stone hums.'],
    ['keeper', 'Line by line, page by page, until the world steadies again.'],
  ],
  recordHeavy: [
    ['art', 'Some truths cost something. Write it anyway. We will carry what it costs.'],
    ['janice', 'It is in the ledger now. There is no taking it back.'],
  ],
  seal: [
    ['keeper', 'The keeper sets out clean paper and waits. The building knows which truths you have kept.'],
    ['chen', 'A sealed letter holds a person together. The fog has a harder time with them now.'],
  ],
  forge: [
    ['brooklyn', "Steel's easy. Spirit's harder. One bends if you overheat it, the other breaks if you don't listen."],
    ['brooklyn', "Don't thank me for the weapon. Thank the one who'll use it right."],
    ['brooklyn', "Don't worry about what it looks like. Worry about whether it remembers you when it matters."],
  ],
  yue: [
    ['yue', "Don't treat the system like a tool. Treat it like a conversation. The city remembers everything; you just have to ask the right way."],
    ['yue', 'You will get it wrong a few times. That is the method, not the failure.'],
  ],
  chen: [
    ['chen', "You think of magic as power. It's not. It's memory, of what the world was before we forgot how to listen."],
    ['chen', 'Breathe out first. The world answers the ones who let it speak.'],
  ],
  hybrid: [
    ['yue', 'She interfaces.'],
    ['chen', 'He communes. Together, we are the Harmonic Division. Sit down. This will take two of us.'],
  ],
  hub: [
    ['art', "You're not here to fight for glory. You're here because someone has to hold the line until morning."],
    ['janice', 'Everyone who goes out is on my list. Everyone who comes back gets crossed off. I like crossing them off.'],
    ['yue', 'The horizon lights dimmed again. The city holds its breath when a ship is close.'],
    ['brooklyn', 'Forge is hot. Bring me something to work on.'],
    ['chen', 'One stick of incense for every ship that leaves. I have never run out. I wonder who restocks them.'],
  ],
  ending: [
    ['art', 'Look at the map. The streets have stopped moving. The canals have lanterns on them.'],
    ['art', 'You remind me of someone who used to believe we would see the sky again. I am starting to think they were right.'],
    ['janice', 'For the record: everyone came back.'],
    ['art', 'The lighthouse is still dark at the top. Get some sleep. The bell will ring again, and we will be here when it does.'],
  ],
};

/** Lines for the debrief when the squad brings back a Truth or gear. */
export const REWARD_LINES = {
  truthFound: 'A sealed letter, lying in the street. {name} picks it up and carries it home.',
  gearFound: 'Gear left by an earlier arrival: {item}. Brooklyn will want to see it.',
  rescued: '{name} was found in the fog and brought up to the Stacks.',
};
