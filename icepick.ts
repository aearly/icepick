/**
 * This allows you to work with object hierarchies that have been frozen
 * with Object.freeze().  "get" operations can use the normal JS syntax,
 * but operations that modify the data will have to return partial copies of
 * the structure. The portions of the structure that did not change will
 * === their previous values.
 *
 * Inspired by clojure/mori and Immutable.js
 */

/**
 * Objects and arrays that will be frozen
 */
type IObject = Record<string, unknown>
type IArray = unknown[]
type Collection = IObject | IArray
const identity = <T>(coll: T): T => coll

// we only care about objects or arrays for now
const weCareAbout = (val: unknown): val is Collection =>
  val !== null &&
  (Array.isArray(val) ||
    // This will skip objects created with `new Foo()`
    // and objects created with `Object.create(proto)`
    // The benefit is ignoring DOM elements and event emitters,
    // which are often circular.
    isObjectLike(val))

const isObjectLike = (val): val is IObject =>
  typeof val === 'object' &&
  (val.constructor === Object || val.constructor == null) &&
  (Object.getPrototypeOf(val) === Object.prototype ||
    Object.getPrototypeOf(val) === null)

function forKeys(obj: Collection, iter: (key: string | number) => void): void {
  if (Array.isArray(obj)) {
    let idx = obj.length
    while (idx--) {
      iter(idx)
    }
    return
  }
  const keys = Object.keys(obj)
  let idx = keys.length
  while (idx--) {
    iter(keys[idx])
  }
}

const cloneObj = (obj: IObject): IObject => {
  const newObj = obj.constructor == null ? Object.create(null) : {}
  const keys = Object.keys(obj)
  let idx = keys.length
  let key
  while (idx--) {
    key = keys[idx]
    newObj[key] = obj[key]
  }
  return newObj
}

const clone = (coll: Collection): Collection => {
  if (Array.isArray(coll)) {
    return coll.slice()
  } else {
    return cloneObj(coll)
  }
}

const freezeIfNeeded =
  process.env.NODE_ENV === 'production'
    ? identity
    : <T>(coll: T): T => {
        if (weCareAbout(coll) && !Object.isFrozen(coll)) {
          return baseFreeze(coll)
        }
        return coll
      }

const _freeze =
  process.env.NODE_ENV === 'production'
    ? identity
    : (coll) => {
        if (typeof coll === 'object') {
          return Object.freeze(coll)
        } else {
          return coll
        }
      }

const prevNodes = []

const baseFreeze = <T extends Collection>(coll: T): Readonly<T> => {
  if (prevNodes.some((val) => val === coll)) {
    throw new Error('object has a reference cycle')
  }
  prevNodes.push(coll)
  forKeys(coll, (key) => {
    const prop = coll[key]
    if (weCareAbout(prop)) {
      baseFreeze(prop)
    }
  })
  prevNodes.pop()

  Object.freeze(coll)
  return coll
}

/**
 * recrursively freeze an object and all its child objects
 * @param  {Object|Array} coll
 * @return {Object|Array}
 */
export const freeze =
  process.env.NODE_ENV === 'production' ? identity : baseFreeze

/**
 * recursively un-freeze an object, by cloning frozen collections
 * @param  {[type]} coll [description]
 * @return {[type]}      [description]
 */
export function thaw<C extends Collection>(coll: C): C {
  if (!weCareAbout(coll) || !Object.isFrozen(coll)) return coll

  const newColl = Array.isArray(coll) ? new Array(coll.length) : {}

  forKeys(coll, (key) => {
    newColl[key] = thaw(coll[key])
  })
  return newColl as C
}

/**
 * set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {String|Number} key   Key or index
 * @param  {Object}        value
 * @return {Object|Array}        new object hierarchy with modifications
 */
export function assoc(coll, key, value) {
  if (coll[key] === value) {
    return _freeze(coll)
  }

  const newObj = clone(coll)

  newObj[key] = freezeIfNeeded(value)

  return _freeze(newObj)
}
export const set = assoc

/**
 * un-set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {String|Number} key  Key or Index
 * @return {Object|Array}       New object or array
 */
export function dissoc(coll, key) {
  const newObj = clone(coll)

  delete newObj[key]

  return _freeze(newObj)
}
export const unset = dissoc

/**
 * set a value deep in a hierarchical structure
 * @param  {Object|Array} coll
 * @param  {Array}        path    A list of keys to traverse
 * @param  {Object}       value
 * @return {Object|Array}       new object hierarchy with modifications
 */
export function assocIn(coll, path, value) {
  const key0 = path[0]
  if (path.length === 1) {
    // simplest case is a 1-element array.  Just a simple assoc.
    return assoc(coll, key0, value)
  } else {
    // break the problem down.  Assoc this object with the first key
    // and the result of assocIn with the rest of the keys
    return assoc(coll, key0, assocIn(coll[key0] || {}, path.slice(1), value))
  }
}
export const setIn = assocIn

/**
 * un-set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {Array} path  A list of keys to traverse
 * @return {Object|Array}       New object or array
 */
export function dissocIn(coll: Collection, path) {
  const key0 = path[0]
  // eslint-disable-next-line
  if (!coll.hasOwnProperty(key0)) {
    return coll
  }
  if (path.length === 1) {
    // simplest case is a 1-element array.  Just a simple dissoc.
    return dissoc(coll, key0)
  } else {
    // break the problem down.  Assoc this object with the first key
    // and the result of dissocIn with the rest of the keys
    return assoc(coll, key0, dissocIn(coll[key0], path.slice(1)))
  }
}
export const unsetIn = dissocIn

/**
 * get an object from a hierachy based on an array of keys
 * @param  {Object|Array} coll
 * @param  {Array}        path    list of keys
 * @return {Object}       value, or undefined
 */
export function getIn(coll, path) {
  return (path || []).reduce((curr, key) => {
    if (!curr) {
      return
    }
    return curr[key]
  }, coll)
}

/**
 * Update a value in a hierarchy
 * @param  {Object|Array}   coll
 * @param  {Array}          path     list of keys
 * @param  {Function} callback The existing value with be passed to this.
 *                             Return the new value to set
 * @return {Object|Array}      new object hierarchy with modifications
 */
export function updateIn(coll, path, callback) {
  const existingVal = getIn(coll, path)
  return assocIn(coll, path, callback(existingVal))
}

// generate wrappers for the mutative array methods
;['push', 'unshift', 'pop', 'shift', 'reverse', 'sort'].forEach(
  (methodName) => {
    exports[methodName] = function (arr, val) {
      const newArr = [...arr]

      newArr[methodName](freezeIfNeeded(val))

      return _freeze(newArr)
    }

    exports[methodName].displayName = 'icepick.' + methodName
  }
)

// splice is special because it is variadic
export function splice(arr, start, ..._args) {
  const newArr = [...arr]
  const args = _args.map(freezeIfNeeded)

  newArr.splice(start, ...args)

  return _freeze(newArr)
}

// slice is non-mutative
export function slice(arr, arg1, arg2) {
  const newArr = arr.slice(arg1, arg2)

  return _freeze(newArr)
}
;['map', 'filter'].forEach((methodName) => {
  exports[methodName] = function (fn, arr) {
    const newArr = arr[methodName](fn)

    return _freeze(newArr)
  }

  exports[methodName].displayName = 'icepick.' + methodName
})

export function assign(obj, ...objs) {
  const newObj = objs.reduce(singleAssign, obj)

  return _freeze(newObj)
}

function singleAssign(obj1, obj2) {
  return Object.keys(obj2).reduce((obj, key) => {
    return assoc(obj, key, obj2[key])
  }, obj1)
}
export const extend = assign

export function merge(target, source, resolver) {
  if (target == null || source == null) {
    return target
  }
  return Object.keys(source).reduce((obj, key) => {
    const sourceVal = source[key]
    const targetVal = obj[key]

    const resolvedSourceVal = resolver
      ? resolver(targetVal, sourceVal, key)
      : sourceVal

    if (weCareAbout(sourceVal) && weCareAbout(targetVal)) {
      // if they are both frozen and reference equal, assume they are deep equal
      if (
        resolvedSourceVal === targetVal &&
        (process.env.NODE_ENV === 'production' ||
          (Object.isFrozen(resolvedSourceVal) && Object.isFrozen(targetVal)))
      ) {
        return obj
      }
      if (Array.isArray(sourceVal)) {
        return assoc(obj, key, resolvedSourceVal)
      }
      // recursively merge pairs of objects
      return assocIfDifferent(
        obj,
        key,
        merge(targetVal, resolvedSourceVal, resolver)
      )
    }

    // primitive values, stuff with prototypes
    return assocIfDifferent(obj, key, resolvedSourceVal)
  }, target)
}

function assocIfDifferent(target, key, value) {
  if (target[key] === value) {
    return target
  }
  return assoc(target, key, value)
}

const chainProto = {
  value: function value() {
    return this.val
  },
  thru: function thru(fn) {
    this.val = freezeIfNeeded(fn(this.val))
    return this
  },
}

const icepick = {
  freeze,
  thaw,
  assoc,
  set,
  dissoc,
  unset,
  assocIn,
  setIn,
  dissocIn,
  unsetIn,
  updateIn,
  getIn,
  splice,
  slice,
  assign,
  extend,
  merge,
  chain,
}

Object.keys(icepick).forEach((methodName) => {
  if (methodName.match(/^(map|filter)$/)) {
    chainProto[methodName] = function (fn) {
      this.val = exports[methodName](fn, this.val)
      return this
    }
    return
  }
  chainProto[methodName] = function (...args) {
    this.val = exports[methodName](this.val, ...args)
    return this
  }
})

export function chain(val) {
  const wrapped = Object.create(chainProto)
  wrapped.val = val
  return wrapped
}

export default icepick

// for testing
if (
  process.env.NODE_ENV !== 'development' &&
  process.env.NODE_ENV !== 'production'
) {
  exports._weCareAbout = weCareAbout
}
