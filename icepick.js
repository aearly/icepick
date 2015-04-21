/**
 * This allows you to work with object hierarchies that have been frozen
 * with Object.freeze().  "get" operations can use the normal JS syntax,
 * but operations that modify the data will have to return partial copies of
 * the structure. The portions of the structure that did not change will
 * === their previous values.
 *
 * Inspired by clojure/mori and Immutable.js
 */

"use strict";

var i = exports,
  slice = [].slice;

// we only care about objects or arrays for now
function weCareAbout(val) {
  return null !== val &&
    (Array.isArray(val) ||
      // This will skip objects created with `new Foo()`
      // but not objects created with `Object.create(proto)`
      // The benefit is ignoring DOM elements, which are often
      // circular.
      (typeof val === "object" && val.constructor === Object));
}
// for testing
exports._weCareAbout = weCareAbout;

function arrayClone(arr) {
  var index = 0,
    length = arr.length,
    result = Array(length);

  for (; index < length; index += 1) {
    result[index] = arr[index];
  }
  return result;
}

function objClone(obj) {
  var index = 0,
    keys = Object.keys(obj),
    length = keys.length,
    key,
    result = {};

  for (; index < length; index += 1) {
    key = keys[index];
    result[key] = obj[key];
  }
  return result;
}

function clone(coll) {
  if (Array.isArray(coll)) {
    return arrayClone(coll);
  } else {
    return objClone(coll);
  }
}

function freezeIfNeeded(coll) {
  if (weCareAbout(coll) && !Object.isFrozen(coll)) {
    return baseFreeze(coll, []);
  }
  return coll;
}

function baseFreeze(coll, prevNodes) {
  if (prevNodes.some(function (node) { return node === coll; })) {
    throw new Error("object has a reference cycle");
  }

  Object.freeze(coll);
  prevNodes.push(coll);
  Object.keys(coll).forEach(function (key) {
    var prop = coll[key];
    if (weCareAbout(prop)) {
      baseFreeze(prop, prevNodes);
    }
  });
  prevNodes.pop();

  return coll;
}

/**
 * recrursively freeze an object and all its child objects
 * @param  {Object|Array} coll
 * @return {Object|Array}
 */
exports.freeze = function freeze(coll) {
  return baseFreeze(coll, []);
};

/**
 * set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {String|Number} key   Key or index
 * @param  {Object}        value
 * @return {Object|Array}        new object hierarchy with modifications
 */
exports.assoc = function assoc(coll, key, value) {
  var newObj = clone(coll);

  newObj[key] = freezeIfNeeded(value);

  return Object.freeze(newObj);

};

/**
 * un-set a value on an object or array
 * @param  {Object|Array}  coll
 * @param  {String|Number} key  Key or Index
 * @return {Object|Array}       New object or array
 */
exports.dissoc = function dissoc(coll, key) {
  var newObj = clone(coll);

  delete newObj[key];

  return Object.freeze(newObj);
};

/**
 * set a value deep in a hierarchical structure
 * @param  {Object|Array} coll
 * @param  {Array}        path    A list of keys to traverse
 * @param  {Object}       value
 * @return {Object|Array}       new object hierarchy with modifications
 */
exports.assocIn = function assocIn(coll, path, value) {
  var key0 = path[0];
  if (path.length === 1) {
    // simplest case is a 1-element array.  Just a simple assoc.
    return i.assoc(coll, key0, value);
  } else {
    // break the problem down.  Assoc this object with the first key
    // and the result of assocIn with the rest of the keys
    return i.assoc(coll, key0, assocIn(coll[key0], path.slice(1), value));
  }
};

/**
 * get an object from a hierachy based on an array of keys
 * @param  {Object|Array} coll
 * @param  {Array}        path    list of keys
 * @return {Object}       value, or undefined
 */
function baseGet(coll, path) {
  return (path || []).reduce(function (val, key) {
    return val[key];
  }, coll);
}

exports.getIn = baseGet;

/**
 * Update a value in a hierarchy
 * @param  {Object|Array}   coll
 * @param  {Array}          path     list of keys
 * @param  {Function} callback The existing value with be passed to this.
 *                             Return the new value to set
 * @return {Object|Array}      new object hierarchy with modifications
 */
exports.updateIn = function updateIn(coll, path, callback) {
  var existingVal = baseGet(coll, path);
  return i.assocIn(coll, path, callback(existingVal));
};


// generate wrappers for the mutative array methods
["push", "unshift", "pop", "shift", "reverse", "sort"]
.forEach(function (methodName) {
  exports[methodName] = function (arr, val) {
    var newArr = arrayClone(arr);

    newArr[methodName](val);

    return Object.freeze(newArr);
  };

  exports[methodName].displayName = "icepick." + methodName;
});

// splice is special because it is variadic
exports.splice = function splice(arr/*, args*/) {
  var newArr = arrayClone(arr),
    args = rest(arguments);

  newArr.splice.apply(newArr, args);

  return Object.freeze(newArr);
};

// slice is non-mutative
exports.slice = function slice(arr, arg1, arg2) {
  var newArr = arr.slice(arg1, arg2);

  return Object.freeze(newArr);
};

["map", "filter"].forEach(function (methodName) {
  exports[methodName] = function (fn, arr) {
    var newArr = arr[methodName](fn);

    return Object.freeze(newArr);
  };

  exports[methodName].displayName = "icepick." + methodName;
});

exports.extend =
exports.assign = function assign(/*...objs*/) {
  var newObj = slice.call(arguments).reduce(singleAssign, {});

  return Object.freeze(newObj);
};

function singleAssign(obj1, obj2) {
  return Object.keys(obj2).reduce(function (obj, key) {
    obj[key] = freezeIfNeeded(obj2[key]);
    return obj;
  }, obj1);
}

function rest(args) {
  return slice.call(args, 1);
}
