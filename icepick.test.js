const i = require('./icepick')
const tap = require('tap')

function test (what, how) {
  tap.test(what, assert => {
    how(assert)
    assert.end()
  })
}

test('icepick', assert => {
  'use strict'

  test('freeze', assert => {
    test('should work', assert => {
      const a = i.freeze({asdf: 'foo', zxcv: {asdf: 'bar'}})

      assert.equal(a.asdf, 'foo')
      assert.equal(Object.isFrozen(a), true)

      assert.throws(function () {
        a.asdf = 'bar'
      })

      assert.throws(function () {
        a.zxcv.asdf = 'qux'
      })

      assert.throws(function () {
        a.qwer = 'bar'
      })
    })

    test('should not work with cyclical objects', assert => {
      let a = {}
      a.a = a

      assert.throws(() => i.freeze(a))

      a = {b: {}}
      a.b.a = a
      assert.throws(() => i.freeze(a))
    })
  })

  test('thaw', assert => {
    function Foo () {}

    test('should thaw objects', assert => {
      const o = i.freeze({
        a: {},
        b: 1,
        c: new Foo(),
        d: [{e: 1}]
      })

      const thawed = i.thaw(o)

      assert.same(thawed, o)
      assert.equal(Object.isFrozen(thawed), false)
      assert.equal(Object.isFrozen(thawed.a), false)
      assert.notEqual(o.a, thawed.a)
      assert.notEqual(o.d, thawed.d)
      assert.notEqual(o.d[0], thawed.d[0])
      assert.equal(o.c, thawed.c)
    })
  })

  test('assoc', assert => {
    test('should work with objects', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      let result = i.assoc(o, 'b', 4)

      assert.same(result, {a: 1, b: 4, c: 3})

      result = i.assoc(o, 'd', 4)
      assert.same(result, {a: 1, b: 2, c: 3, d: 4})
    })

    test('should freeze objects you assoc', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assoc(o, 'b', {d: 5})

      assert.same(result, {a: 1, b: {d: 5}, c: 3})

      assert.ok(Object.isFrozen(result.b))
    })

    test('should work with arrays', assert => {
      const a = i.freeze([1, 2, 3])
      let result = i.assoc(a, 1, 4)

      assert.same(result, [1, 4, 3])

      result = i.assoc(a, '1', 4)
      assert.same(result, [1, 4, 3])

      result = i.assoc(a, 3, 4)
      assert.same(result, [1, 2, 3, 4])
    })

    test('should freeze arrays you assoc', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assoc(o, 'b', [1, 2])

      assert.same(result, {a: 1, b: [1, 2], c: 3})

      assert.ok(Object.isFrozen(result.b))
    })

    test('should return a frozen copy', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assoc(o, 'b', 4)

      assert.notEqual(result, o)
      assert.ok(Object.isFrozen(result))
    })

    test('should not modify child objects', assert => {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.assoc(o, 'b', 4)

      assert.equal(result.c, o.c)
    })

    test('should keep references the same if nothing changes', assert => {
      const o = i.freeze({a: 1})
      const result = i.assoc(o, 'a', 1)
      assert.equal(result, o)
    })

    test('should be aliased as set', assert => {
      assert.equal(i.set, i.assoc)
    })
  })

  test('dissoc', assert => {
    test('should work with objecs', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.dissoc(o, 'b')

      assert.same(result, {a: 1, c: 3})
    })

    test('should work with arrays (poorly)', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.dissoc(a, 1)

      // assert.same(result, [1, , 3])
      assert.same(Object.keys(result), [0, 2])
      assert.equal(result[0], 1)
      assert.equal(result[1], undefined)
      assert.equal(result[2], 3)
    })

    test('should be aliased as unset', assert => {
      assert.equal(i.unset, i.dissoc)
    })
  })

  test('assocIn', assert => {
    test('should work recursively', assert => {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.assocIn(o, ['c', 'a'], 5)

      assert.same(result, {a: 1, b: 2, c: {a: 5}})
    })

    test('should work recursively (deeper)', assert => {
      const o = i.freeze({
        a: 1,
        b: {a: 2},
        c: [
          {
            a: 3,
            b: 4
          },
          {a: 4}
        ]
      })
      const result = i.assocIn(o, ['c', 0, 'a'], 8)

      assert.equal(result.c[0].a, 8)
      assert.notEqual(result, o)
      assert.equal(result.b, o.b)
      assert.notEqual(result.c, o.c)
      assert.notEqual(result.c[0], o.c[0])
      assert.equal(result.c[0].b, o.c[0].b)
      assert.equal(result.c[1], o.c[1])
    })

    test("should create collections if they don't exist", assert => {
      const result = i.assocIn({}, ['a', 'b', 'c'], 1)
      assert.same(result, {a: {b: {c: 1}}})
    })

    test('should be aliased as setIn', assert => {
      assert.equal(i.setIn, i.assocIn)
    })

    test('should keep references the same if nothing changes', assert => {
      const o = i.freeze({a: {b: 1}})
      const result = i.assocIn(o, ['a', 'b'], 1)
      assert.equal(result, o)
    })
  })

  test('dissocIn', assert => {
    test('should work recursively', assert => {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.dissocIn(o, ['c', 'a'])

      assert.same(result, {a: 1, b: 2, c: {}})
    })

    test('should work recursively (deeper)', assert => {
      const o = i.freeze({
        a: 1,
        b: {a: 2},
        c: [
          {
            a: 3,
            b: 4
          },
          {a: 4}
        ]
      })
      const result = i.dissocIn(o, ['c', 0, 'a'])

      assert.equal(result.c[0].a, undefined)
      assert.notEqual(result, o)
      assert.equal(result.b, o.b)
      assert.notEqual(result.c, o.c)
      assert.notEqual(result.c[0], o.c[0])
      assert.equal(result.c[0].b, o.c[0].b)
      assert.equal(result.c[1], o.c[1])
    })

    test("should not create collections if they don't exist", assert => {
      const result = i.dissocIn({}, ['a', 'b', 'c'])
      assert.same(result, {})
    })

    test('should be aliased as unsetIn', assert => {
      assert.equal(i.unsetIn, i.dissocIn)
    })

    test('should keep references the same if nothing changes', assert => {
      const o = i.freeze({a: {b: 1}})
      const result = i.dissocIn(o, ['a', 'b', 'c'])
      assert.equal(result, o)
    })
  })

  test('getIn', assert => {
    test('should work', assert => {
      const o = i.freeze({
        a: 0,
        b: {a: 2},
        c: [
            {a: 3, b: 4},
            {a: 4}
        ]
      })
      assert.equal(i.getIn(o, ['c', 0, 'b']), 4)
      assert.equal(i.getIn(o, ['a']), 0)
    })

    test('should work without a path', assert => {
      const o = i.freeze({a: {b: 1}})
      assert.equal(i.getIn(o), o)
    })

    test('should return undefined for a non-existant path', assert => {
      const o = i.freeze({
        a: 1,
        b: {a: 2},
        c: [
          {a: 3, b: 4},
          {a: 4}
        ]
      })

      assert.equal(i.getIn(o, ['q']), undefined)
      assert.equal(i.getIn(o, ['a', 's', 'd']), undefined)
    })

    test('should return undefined for a non-existant path (null)', assert => {
      const o = i.freeze({
        a: null
      })

      assert.equal(i.getIn(o, ['a', 'b']), undefined)
    })
  })

  test('updateIn', assert => {
    test('should work', assert => {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.updateIn(o, ['c', 'a'], function (num) {
        return num * 2
      })

      assert.same(result, {a: 1, b: 2, c: {a: 8}})
    })

    test("should create collections if they don't exist", assert => {
      const result = i.updateIn({}, ['a', 1, 'c'], function (val) {
        assert.equal(val, undefined)
        return 1
      })
      assert.same(result, {a: {'1': {c: 1}}})
    })

    test('should keep references the same if nothing changes', assert => {
      const o = i.freeze({a: 1})
      const result = i.updateIn(o, ['a', 'b'], function (v) { return v })
      assert.equal(result, o)
    })
  })

  test('Array methods', assert => {
    test('push', assert => {
      const a = i.freeze([1, 2])
      const result = i.push(a, 3)

      assert.same(result, [1, 2, 3])
      assert.ok(Object.isFrozen(result))
    })

    test('push (with object)', assert => {
      const a = i.freeze([1, 2])
      const result = i.push(a, {b: 1})

      assert.same(result, [1, 2, {b: 1}])
      assert.ok(Object.isFrozen(result))
      assert.ok(Object.isFrozen(result[2]))
    })

    test('unshift', assert => {
      const a = i.freeze([1, 2])
      const result = i.unshift(a, 3)

      assert.same(result, [3, 1, 2])
      assert.ok(Object.isFrozen(result))
    })

    test('unshift (with object)', assert => {
      const a = i.freeze([1, 2])
      const result = i.unshift(a, [0])

      assert.same(result, [[0], 1, 2])
      assert.ok(Object.isFrozen(result))
      assert.ok(Object.isFrozen(result[0]))
    })

    test('pop', assert => {
      const a = i.freeze([1, 2])
      const result = i.pop(a)

      assert.same(result, [1])
      assert.ok(Object.isFrozen(result))
    })

    test('shift', assert => {
      const a = i.freeze([1, 2])
      const result = i.shift(a)

      assert.same(result, [2])
      assert.ok(Object.isFrozen(result))
    })

    test('reverse', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.reverse(a)

      assert.same(result, [3, 2, 1])
      assert.ok(Object.isFrozen(result))
    })

    test('sort', assert => {
      const a = i.freeze([4, 1, 2, 3])
      const result = i.sort(a)

      assert.same(result, [1, 2, 3, 4])
      assert.ok(Object.isFrozen(result))
    })

    test('splice', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.splice(a, 1, 1, 4)

      assert.same(result, [1, 4, 3])
      assert.ok(Object.isFrozen(result))
    })

    test('splice (with object)', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.splice(a, 1, 1, {b: 1}, {b: 2})

      assert.same(result, [1, {b: 1}, {b: 2}, 3])
      assert.ok(Object.isFrozen(result))
      assert.ok(Object.isFrozen(result[1]))
      assert.ok(Object.isFrozen(result[2]))
    })

    test('slice', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.slice(a, 1, 2)

      assert.same(result, [2])
      assert.ok(Object.isFrozen(result))
    })

    test('map', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.map(function (v) { return v * 2 }, a)

      assert.same(result, [2, 4, 6])
      assert.ok(Object.isFrozen(result))
    })

    test('filter', assert => {
      const a = i.freeze([1, 2, 3])
      const result = i.filter(function (v) { return v % 2 }, a)

      assert.same(result, [1, 3])
      assert.ok(Object.isFrozen(result))
    })
  })

  test('assign', assert => {
    test('should work', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      let result = i.assign(o, {'b': 3, 'c': 4})
      assert.same(result, {a: 1, b: 3, c: 4})
      assert.notEqual(result, o)
      result = i.assign(o, {'d': 4})
      assert.same(result, {a: 1, b: 2, c: 3, d: 4})
    })

    test('should work with multiple args', assert => {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assign(o, {'b': 3, 'c': 4}, {'d': 4})
      assert.same(result, {a: 1, b: 3, c: 4, d: 4})
    })

    test('should keep references the same if nothing changes', assert => {
      const o = i.freeze({a: 1})
      const result = i.assign(o, {a: 1})
      assert.equal(result, o)
    })
  })

  test('merge', assert => {
    test('should merge nested objects', assert => {
      const o1 = i.freeze({a: 1, b: {c: 1, d: 1}})
      const o2 = i.freeze({a: 1, b: {c: 2}, e: 2})

      const result = i.merge(o1, o2)
      assert.same(result, {a: 1, b: {c: 2, d: 1}, e: 2})
    })

    test('should replace arrays', assert => {
      const o1 = i.freeze({a: 1, b: {c: [1, 1]}, d: 1})
      const o2 = i.freeze({a: 2, b: {c: [2]}})

      const result = i.merge(o1, o2)
      assert.same(result, {a: 2, b: {c: [2]}, d: 1})
    })

    test('should overwrite with nulls', assert => {
      const o1 = i.freeze({a: 1, b: {c: [1, 1]}})
      const o2 = i.freeze({a: 2, b: {c: null}})

      const result = i.merge(o1, o2)
      assert.same(result, {a: 2, b: {c: null}})
    })

    test('should overwrite primitives with objects', assert => {
      const o1 = i.freeze({a: 1, b: 1})
      const o2 = i.freeze({a: 2, b: {c: 2}})

      const result = i.merge(o1, o2)
      assert.same(result, {a: 2, b: {c: 2}})
    })

    test('should overwrite objects with primitives', assert => {
      const o1 = i.freeze({a: 1, b: {c: 2}})
      const o2 = i.freeze({a: 1, b: 2})

      const result = i.merge(o1, o2)
      assert.same(result, {a: 1, b: 2})
    })

    test('should keep references the same if nothing changes', assert => {
      const o1 = i.freeze({a: 1, b: {c: 1, d: 1, e: [1]}})
      const o2 = i.freeze({a: 1, b: {c: 1, d: 1, e: o1.b.e}})
      const result = i.merge(o1, o2)
      assert.equal(result, o1)
      assert.equal(result.b, o1.b)
    })

    test('should handle undefined parameters', assert => {
      assert.same(i.merge({}, undefined), {})
      assert.same(i.merge(undefined, {}), undefined)
    })

    test('custom associator', assert => {
      test('should use the custom associator', assert => {
        const o1 = i.freeze({a: 1, b: {c: [1, 1]}, d: 1})
        const o2 = i.freeze({a: 2, b: {c: [2]}})

        function resolver (targetVal, sourceVal) {
          if (Array.isArray(targetVal) && sourceVal) {
            return targetVal.concat(sourceVal)
          } else {
            return sourceVal
          }
        }

        const result = i.merge(o1, o2, resolver)
        assert.same(result, {a: 2, b: {c: [1, 1, 2]}, d: 1})
      })
    })
  })
})

test('chain', assert => {
  test('should wrap and unwrap a value', assert => {
    const a = [1, 2, 3]
    const result = i.chain(a).value()
    assert.same(result, a)
  })

  test('should work with a simple operation', assert => {
    const a = [1, 2, 3]
    const result = i.chain(a)
      .assoc(1, 4)
      .value()
    assert.same(result, [1, 4, 3])
    assert.notEqual(result, a)
    assert.ok(Object.isFrozen(result))
  })

  test('should work with multiple operations', assert => {
    const a = [1, 2, 3]
    const result = i.chain(a)
      .assoc(1, 4)
      .reverse()
      .pop()
      .push(5)
      .value()
    assert.same(result, [3, 4, 5])
    assert.notEqual(result, a)
    assert.ok(Object.isFrozen(result))
  })

  test('should work with multiple operations (more complicated)', assert => {
    const o = {
      a: [1, 2, 3],
      b: {c: 1},
      d: 4
    }
    const result = i.chain(o)
      .assocIn(['a', 2], 4)
      .merge({b: {c: 2, c2: 3}})
      .assoc('e', 2)
      .dissoc('d')
      .value()
    assert.same(result, {
      a: [1, 2, 4],
      b: {c: 2, c2: 3},
      e: 2
    })
    assert.notEqual(result, o)
    assert.ok(Object.isFrozen(result))
  })

  test('should have a thru method', assert => {
    const o = [1, 2]
    const result = i.chain(o)
      .push(3)
      .thru(function (val) {
        return [0].concat(val)
      })
      .value()
    assert.ok(Object.isFrozen(result))
    assert.same(result, [0, 1, 2, 3])
  })

  test('should work with map and filter', assert => {
    const o = [1, 2, 3]
    const result = i.chain(o)
      .map(val => val * 2)
      .filter(val => val > 2)
      .value()
    assert.ok(Object.isFrozen(result))
    assert.same(result, [4, 6])
  })
})

test('production mode', assert => {
  let oldEnv
  oldEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  delete require.cache[require.resolve('./icepick')]
  const i = require('./icepick')

  assert.tearDown(function () {
    process.env.NODE_ENV = oldEnv
  })

  test('should not freeze objects', assert => {
    const result = i.freeze({})
    assert.equal(Object.isFrozen(result), false)
  })

  test("should not freeze objects that are assoc'd", assert => {
    const result = i.assoc({}, 'a', {})
    assert.equal(Object.isFrozen(result), false)
    assert.equal(Object.isFrozen(result.a), false)
  })

  test('merge should keep references the same if nothing changes', assert => {
    const o1 = i.freeze({a: 1, b: {c: 1, d: 1, e: [1]}})
    const o2 = i.freeze({a: 1, b: {c: 1, d: 1, e: o1.b.e}})
    const result = i.merge(o1, o2)
    assert.equal(result, o1)
    assert.equal(result.b, o1.b)
  })
})

test('internals', assert => {
  test('_weCareAbout', assert => {
    function Foo () {}
    class Bar {}

    test('should care about objects', assert => {
      assert.equal(i._weCareAbout({}), true)
    })
    test('should care about arrays', assert => {
      assert.equal(i._weCareAbout([]), true)
    })
    test('should not care about dates', assert => {
      assert.equal(i._weCareAbout(new Date()), false)
    })
    test('should not care about null', assert => {
      assert.equal(i._weCareAbout(null), false)
    })
    test('should not care about undefined', assert => {
      assert.equal(i._weCareAbout(undefined), false)
    })
    test('should not care about class instances', assert => {
      assert.equal(i._weCareAbout(new Foo()), false)
    })
    test('should not care about class instances (2)', assert => {
      assert.equal(i._weCareAbout(new Bar()), false)
    })
    test('should not care about objects created with Object.create()', assert => {
      assert.equal(i._weCareAbout(Object.create(Foo.prototype)), false)
    })
    test('should not care about objects created with Object.create({})', assert => {
      assert.equal(i._weCareAbout(Object.create({
        foo: function () {}
      })), false)
    })
  })
})
