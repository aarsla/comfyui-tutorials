// Which graph nodes each "Try this" item points at, per lesson, in the order the items appear in the notes.
// An item without an entry points at the node its note is attached to. The site build warns when a
// lesson's item count and this list disagree (an item was added or removed in tutorials.py).
export const TRY_NODES: Record<string, string[][]> = {
  '00': [['5'], ['2'], ['4'], ['4']],
  '02': [['10', '13', '16'], ['10', '13'], ['10', '13', '16'], ['10', '13', '16']],
  '08': [['4', '2']],
  '10': [['1'], ['7']],
  '11': [['9'], ['7'], ['2']],
  '12': [['5'], ['5'], ['6'], ['2']],
  '13': [['14', '16'], ['5', '9'], ['4', '9'], ['9']],
  '14': [['10', '13', '16', '19', '22', '25', '28']],
  '15': [['19', '10']],
};
