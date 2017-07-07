/**
 * This allows you to work with object hierarchies that have been frozen
 * with Object.freeze().  "get" operations can use the normal JS syntax,
 * but operations that modify the data will have to return partial copies of
 * the structure. The portions of the structure that did not change will
 * === their previous values.
 *
 * Inspired by clojure/mori and Immutable.js
 */

'use strict'

const i = exports

const isProduction = process.env.NODE_ENV === 'production'
const identity = coll => coll

// we only care about objects or arrays for now
const weCareAbout = val => val !== null &&
    (Array.isArray(val) ||
      // This will skip objects created with `new Foo()`
      // and objects created with `Object.create(proto)`
      // The benefit is ignoring DOM elements and event emitters,
      // which are often circular.
      isObjectLike(val))

const isObjectLike = val => typeof val === 'object' &&
    val.constructor === Object &&
    Object.getPrototypeOf(val) === Object.prototype

const forKeys = (obj, iter) => {
  let idx, keys
  if (Array.isArray(obj)) {
    idx = obj.length
    while (idx--) {
      iter(idx)
    }
    return
  }
  keys = Object.keys(obj)
  idx = keys.length
  while (idx--) {
    iter(keys[idx])
  }
}

const cloneObj = obj => {
  const newObj = {}
  const keys = Object.keys(obj)
  let idx = keys.length
  let key
  while (idx--) {
    key = keys[idx]
    newObj[key] = obj[key]
  }
  return newObj
}

const clone = (coll) => {
  if (Array.isArray(coll)) {
    return coll.slice()
  } else {
    return cloneObj(coll)
  }
}

const freezeIfNeeded = isProduction
? identity
: coll => {
  if (weCareAbout(coll) && !Object.isFrozen(coll)) {
    return baseFreeze(coll)
  }
  return coll
}

const _freeze = isProduction
? identity
: coll => {
  if (typeof coll === 'object') {
    return Object.freeze(coll)
  } else {
    return coll
  }
}

const prevNodes = []

const baseFreeze = (coll) => {
  if (prevNodes.some(val => val === coll)) {
    throw new Error('object has a reference cycle')
  }
  prevNodes.push(coll)
  forKeys(coll, key => {
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
exports.freeze = isProduction
? identity
: baseFreeze

/**
 * recursively un-freeze an object, by cloning frozen collections
 * @param  {[type]} coll [description]
 * @return {[type]}      [description]
 */
exports.thaw = function thaw (coll) {
  if (!weCareAbout(coll) || !Object.isFrozen(coll)) return coll

  const newColl = Array.isArray(coll)
    ? new Array(coll.length)
    : {}

  forKeys(coll, key => {
    newColl[key] = thaw(coll[key])
  })
  return newColl
}

/**
 * set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {String|Number} key   Key or index
 * @param  {Object}        value
 * @return {Object|Array}        new object hierarchy with modifications
 */
exports.assoc = function assoc (coll, key, value) {
  if (coll[key] === value) {
    return _freeze(coll)
  }

  const newObj = clone(coll)

  newObj[key] = freezeIfNeeded(value)

  return _freeze(newObj)
}
exports.set = exports.assoc

/**
 * un-set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {String|Number} key  Key or Index
 * @return {Object|Array}       New object or array
 */
exports.dissoc = function dissoc (coll, key) {
  const newObj = clone(coll)

  delete newObj[key]

  return _freeze(newObj)
}
exports.unset = exports.dissoc

/**
 * set a value deep in a hierarchical structure
 * @param  {Object|Array} coll
 * @param  {Array}        path    A list of keys to traverse
 * @param  {Object}       value
 * @return {Object|Array}       new object hierarchy with modifications
 */
exports.assocIn = function assocIn (coll, path, value) {
  const key0 = path[0]
  if (path.length === 1) {
    // simplest case is a 1-element array.  Just a simple assoc.
    return i.assoc(coll, key0, value)
  } else {
    // break the problem down.  Assoc this object with the first key
    // and the result of assocIn with the rest of the keys
    return i.assoc(coll, key0, assocIn(coll[key0] || {}, path.slice(1), value))
  }
}
exports.setIn = exports.assocIn

/**
 * get an object from a hierachy based on an array of keys
 * @param  {Object|Array} coll
 * @param  {Array}        path    list of keys
 * @return {Object}       value, or undefined
 */
function baseGet (coll, path) {
  return (path || []).reduce((curr, key) => {
    if (!curr) { return }
    return curr[key]
  }, coll)
}

exports.getIn = baseGet

/**
 * Update a value in a hierarchy
 * @param  {Object|Array}   coll
 * @param  {Array}          path     list of keys
 * @param  {Function} callback The existing value with be passed to this.
 *                             Return the new value to set
 * @return {Object|Array}      new object hierarchy with modifications
 */
exports.updateIn = function updateIn (coll, path, callback) {
  const existingVal = baseGet(coll, path)
  return i.assocIn(coll, path, callback(existingVal))
};

// generate wrappers for the mutative array methods
['push', 'unshift', 'pop', 'shift', 'reverse', 'sort']
.forEach((methodName) => {
  exports[methodName] = function (arr, val) {
    const newArr = [...arr]

    newArr[methodName](freezeIfNeeded(val))

    return _freeze(newArr)
  }

  exports[methodName].displayName = 'icepick.' + methodName
})

// splice is special because it is variadic
exports.splice = function splice (arr, ..._args) {
  const newArr = [...arr]
  const args = _args.map(freezeIfNeeded)

  newArr.splice.apply(newArr, args)

  return _freeze(newArr)
}

// slice is non-mutative
exports.slice = function slice (arr, arg1, arg2) {
  const newArr = arr.slice(arg1, arg2)

  return _freeze(newArr)
};

['map', 'filter'].forEach((methodName) => {
  exports[methodName] = function (fn, arr) {
    const newArr = arr[methodName](fn)

    return _freeze(newArr)
  }

  exports[methodName].displayName = 'icepick.' + methodName
})

exports.extend =
exports.assign = function assign (obj, ...objs) {
  const newObj = objs.reduce(singleAssign, obj)

  return _freeze(newObj)
}

function singleAssign (obj1, obj2) {
  return Object.keys(obj2).reduce((obj, key) => {
    return i.assoc(obj, key, obj2[key])
  }, obj1)
}

exports.merge = merge
function merge (target, source, resolver) {
  if (target == null || source == null) {
    return target
  }
  return Object.keys(source).reduce((obj, key) => {
    const sourceVal = source[key]
    const targetVal = obj[key]

    const resolvedSourceVal =
      resolver ? resolver(targetVal, sourceVal, key) : sourceVal

    if (weCareAbout(sourceVal) && weCareAbout(targetVal)) {
      // if they are both frozen and reference equal, assume they are deep equal
      if (
        resolvedSourceVal === targetVal &&
        (
          isProduction ||
          (
            Object.isFrozen(resolvedSourceVal) &&
            Object.isFrozen(targetVal)
          )
        )
      ) {
        return obj
      }
      if (Array.isArray(sourceVal)) {
        return i.assoc(obj, key, resolvedSourceVal)
      }
      // recursively merge pairs of objects
      return assocIfDifferent(obj, key,
        merge(targetVal, resolvedSourceVal, resolver))
    }

    // primitive values, stuff with prototypes
    return assocIfDifferent(obj, key, resolvedSourceVal)
  }, target)
}

function assocIfDifferent (target, key, value) {
  if (target[key] === value) {
    return target
  }
  return i.assoc(target, key, value)
}

const chainProto = {
  value: function value () {
    return this.val
  },
  thru: function thru (fn) {
    this.val = freezeIfNeeded(fn(this.val))
    return this
  }
}

Object.keys(exports).forEach((methodName) => {
  chainProto[methodName] = function (...args) {
    args.unshift(this.val)
    this.val = exports[methodName].apply(null, args)
    return this
  }
})

exports.chain = function chain (val) {
  const wrapped = Object.create(chainProto)
  wrapped.val = val
  return wrapped
}

// for testing
exports._weCareAbout = weCareAbout
