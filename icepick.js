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

var i = exports;

// we only care about objects or arrays for now
function weCareAbout(val) {
  return Array.isArray(val) || (typeof val === "object");
}

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

function clone(obj) {
  if (Array.isArray(obj)) {
    return arrayClone(obj);
  } else {
    return objClone(obj);
  }
}

function baseFreeze(obj, prevNodes) {
  if (prevNodes.filter(function (node) { return node === obj; }).length > 0) {
    throw new Error("object has a reference cycle");
  }

  Object.freeze(obj);
  prevNodes.push(obj);
  Object.keys(obj).forEach(function (key) {
    var prop = obj[key];
    if (weCareAbout(prop)) {
      baseFreeze(prop, prevNodes);
    }
  });
  prevNodes.pop();

  return obj;
}

/**
 * recrursively freeze an object and all its child objects
 * @param  {Object|Array} obj
 * @return {Object|Array}
 */
exports.freeze = function freeze(obj) {
  return baseFreeze(obj, []);
};

/**
 * set a value on an object or array
 * @param  {Object|Array}  obj
 * @param  {String|Number} key   Key or index
 * @param  {Object}        value
 * @return {Object|Array}        new object hierarchy with modifications
 */
exports.assoc = function assoc(obj, key, value) {
  var newObj = clone(obj);

  if (weCareAbout(value) && !Object.isFrozen(value)) {
    value = baseFreeze(value, []);
  }
  newObj[key] = value;

  return Object.freeze(newObj);

};

/**
 * set a value deep in a hierarchical structure
 * @param  {Object|Array} obj
 * @param  {Array}        path    A list of keys to traverse
 * @param  {Object}       value
 * @return {Object|Array}       new object hierarchy with modifications
 */
exports.assocIn = function assocIn(obj, path, value) {
  var key0 = path[0];
  if (path.length === 1) {
    // simplest case is a 1-element array.  Just a simple assoc.
    return i.assoc(obj, key0, value);
  } else {
    // break the problem down.  Assoc this object with the first key
    // and the result of assocIn with the rest of the keys
    return i.assoc(obj, key0, assocIn(obj[key0], path.slice(1), value));
  }
};

/**
 * get an object from a hierachy based on an array of keys
 * @param  {Object|Array} obj
 * @param  {Array}        path    list of keys
 * @return {Object}       value, or undefined
 */
function baseGet(obj, path) {
  return (path || []).reduce(function (val, key) {
    return val[key];
  }, obj);
}

exports.getIn = baseGet;

/**
 * Update a value in a hierarchy
 * @param  {Object|Array}   obj
 * @param  {Array}          path     list of keys
 * @param  {Function} callback The existing value with be passed to this.
 *                             Return the new value to set
 * @return {Object|Array}      new object hierarchy with modifications
 */
exports.updateIn = function updateIn(obj, path, callback) {
  var existingVal = baseGet(obj, path);
  return i.assocIn(obj, path, callback(existingVal));
};
