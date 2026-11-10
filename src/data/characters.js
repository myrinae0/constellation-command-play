// The cast of Constellation (02-characters.md). `glyph` and `color` draw the
// small portrait badges; there are no image files.

export const CHARACTERS = {
  art: { name: 'Art', title: 'Guild Leader', glyph: '✶', color: '#e8d6a8' },
  janice: { name: 'Janice', title: 'Operations Director', glyph: '◐', color: '#9fc3e8' },
  yue: { name: 'Yue 月', title: 'Systems Engineer', glyph: '月', color: '#a9d8f0' },
  chen: { name: 'Chen 晨', title: 'Spiritual Mentor', glyph: '晨', color: '#f0be82' },
  brooklyn: { name: 'Brooklyn', title: 'Armorer', glyph: '⌒', color: '#e09a6c' },
  keeper: { name: 'A keeper', title: 'Archive Sector', glyph: '¶', color: '#d8d2c4' },
  horizon: { name: 'Horizon', title: 'Horizon Sector', glyph: '≋', color: '#b8c6d6' },
};

/**
 * Arrivals wake with no names. In this game they name themselves after the
 * first thing they remember noticing (an open design choice, see README).
 * @type {Array<[string, string]>} [name, what they noticed]
 */
export const ARRIVAL_NAMES = [
  ['Salt', 'the salt on the dock rail'], ['Wick', 'a candle someone left burning'], ['Harbor', 'a painted sign'],
  ['Vesper', 'the evening light'], ['Lantern', 'the lighthouse beam'], ['Moth', 'a moth on the red carpet'],
  ['Cinder', 'a cold stove on the ship'], ['Thistle', 'a dried flower in a book'], ['Quay', 'the word on a crate'],
  ['Folio', 'a page left open'], ['Rain', 'rain on the porthole'], ['Ferry', 'a ticket in a pocket'],
  ['Juniper', 'a smell they could not place'], ['Tallow', 'wax on their fingers'], ['Brine', 'the taste of the air'],
  ['Sable', 'a black coat on a hook'], ['Pewter', 'a cup on a table'], ['Linden', 'a tree on a postcard'],
  ['Halyard', 'a rope slapping a mast'], ['Sorrel', 'the color of a door'], ['Gull', 'a bird over the dock'],
  ['Ash', 'grey on the windowsill'], ['Flint', 'a spark from the bell'], ['Reed', 'grass growing through the pier'],
  ['Wren', 'a small bird that did not fly away'], ['Mica', 'something glittering in the stone'], ['Ivory', 'piano keys in the lounge'],
  ['Cobalt', 'a blue bottle'], ['Sparrow', 'feathers on the stairs'], ['Kettle', 'a kettle still warm'],
  ['Anchor', 'a tattoo on their own wrist'], ['Clove', 'a jar in the galley'], ['Indigo', 'ink on their hands'],
  ['Lark', 'a song from somewhere below deck'], ['Oriel', 'a bay window'], ['Pike', 'a hook on the wall'],
  ['Tamsin', 'a name stitched in a scarf'], ['Bramble', 'a scratch on their arm'], ['Rook', 'a black feather'],
  ['Hollis', 'a name on a door'], ['Velvet', 'the seat they woke in'], ['Marlowe', 'a book left face down'],
  ['Teal', 'paint on the railing'], ['Calloway', 'a word they kept repeating'], ['Ember', 'the last coal in a grate'],
  ['Morrow', 'the word "tomorrow" in a letter'], ['Shale', 'a stone in their shoe'], ['Iris', 'their own eyes in the mirror'],
];
