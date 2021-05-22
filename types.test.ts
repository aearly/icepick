import { setIn } from './icepick'

const a = {
  a: 1,
  b: [{ c: 2 }, { c: 3 }],
}

setIn(a, ['b', 1, 'c'], 4)
setIn(a, ['b', 'asdef', 'c'], 4)
