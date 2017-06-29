/* global describe, it, before, after */
const expect = require('expect.js')
const i = require('./icepick')

describe('icepick', function () {
  'use strict'

  describe('freeze', function () {
    it('should work', function () {
      const a = i.freeze({asdf: 'foo', zxcv: {asdf: 'bar'}})

      expect(a.asdf).to.equal('foo')
      expect(Object.isFrozen(a)).to.equal(true)

      expect(function () {
        a.asdf = 'bar'
      }).to.throwError()

      expect(function () {
        a.zxcv.asdf = 'qux'
      }).to.throwError()

      expect(function () {
        a.qwer = 'bar'
      }).to.throwError()
    })

    it('should not work with cyclical objects', function () {
      let a = {}
      a.a = a

      expect(i.freeze).withArgs(a).to.throwError()

      a = {b: {}}
      a.b.a = a
      expect(i.freeze).withArgs(a).to.throwError()
    })
  })

  describe('thaw', function () {
    function Foo () {}

    it('should thaw objects', function () {
      const o = i.freeze({
        a: {},
        b: 1,
        c: new Foo(),
        d: [{e: 1}]
      })

      const thawed = i.thaw(o)

      expect(thawed).to.eql(o)
      expect(Object.isFrozen(thawed)).to.be(false)
      expect(Object.isFrozen(thawed.a)).to.be(false)
      expect(o.a).to.not.equal(thawed.a)
      expect(o.d).to.not.equal(thawed.d)
      expect(o.d[0]).to.not.equal(thawed.d[0])
      expect(o.c).to.equal(thawed.c)
    })
  })

  describe('assoc', function () {
    it('should work with objects', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      let result = i.assoc(o, 'b', 4)

      expect(result).to.eql({a: 1, b: 4, c: 3})

      result = i.assoc(o, 'd', 4)
      expect(result).to.eql({a: 1, b: 2, c: 3, d: 4})
    })

    it('should freeze objects you assoc', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assoc(o, 'b', {d: 5})

      expect(result).to.eql({a: 1, b: {d: 5}, c: 3})

      expect(Object.isFrozen(result.b)).to.be.ok()
    })

    it('should work with arrays', function () {
      const a = i.freeze([1, 2, 3])
      let result = i.assoc(a, 1, 4)

      expect(result).to.eql([1, 4, 3])

      result = i.assoc(a, '1', 4)
      expect(result).to.eql([1, 4, 3])

      result = i.assoc(a, 3, 4)
      expect(result).to.eql([1, 2, 3, 4])
    })

    it('should freeze arrays you assoc', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assoc(o, 'b', [1, 2])

      expect(result).to.eql({a: 1, b: [1, 2], c: 3})

      expect(Object.isFrozen(result.b)).to.be.ok()
    })

    it('should return a frozen copy', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assoc(o, 'b', 4)

      expect(result).to.not.equal(o)
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('should not modify child objects', function () {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.assoc(o, 'b', 4)

      expect(result.c).to.equal(o.c)
    })

    it('should keep references the same if nothing changes', function () {
      const o = i.freeze({a: 1})
      const result = i.assoc(o, 'a', 1)
      expect(result).to.equal(o)
    })

    it('should be aliased as set', function () {
      expect(i.set).to.equal(i.assoc)
    })
  })

  describe('dissoc', function () {
    it('should work with objecs', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.dissoc(o, 'b')

      expect(result).to.eql({a: 1, c: 3})
    })

    it('should work with arrays (poorly)', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.dissoc(a, 1)

      // expect(result).to.eql([1, , 3])
      expect(Object.keys(result)).to.eql([0, 2])
      expect(result[0]).to.equal(1)
      expect(result[1]).to.equal(undefined)
      expect(result[2]).to.equal(3)
    })

    it('should be aliased as unset', function () {
      expect(i.unset).to.equal(i.dissoc)
    })
  })

  describe('assocIn', function () {
    it('should work recursively', function () {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.assocIn(o, ['c', 'a'], 5)

      expect(result).to.eql({a: 1, b: 2, c: {a: 5}})
    })

    it('should work recursively (deeper)', function () {
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

      expect(result.c[0].a).to.equal(8)
      expect(result).to.not.equal(o)
      expect(result.b).to.equal(o.b)
      expect(result.c).to.not.equal(o.c)
      expect(result.c[0]).to.not.equal(o.c[0])
      expect(result.c[0].b).to.equal(o.c[0].b)
      expect(result.c[1]).to.equal(o.c[1])
    })

    it("should create collections if they don't exist", function () {
      const result = i.assocIn({}, ['a', 'b', 'c'], 1)
      expect(result).to.eql({a: {b: {c: 1}}})
    })

    it('should be aliased as setIn', function () {
      expect(i.setIn).to.equal(i.assocIn)
    })

    it('should keep references the same if nothing changes', function () {
      const o = i.freeze({a: {b: 1}})
      const result = i.assocIn(o, ['a', 'b'], 1)
      expect(result).to.equal(o)
    })
  })

  describe('getIn', function () {
    it('should work', function () {
      const o = i.freeze({
        a: 0,
        b: {a: 2},
        c: [
            {a: 3, b: 4},
            {a: 4}
        ]
      })
      expect(i.getIn(o, ['c', 0, 'b'])).to.equal(4)
      expect(i.getIn(o, ['a'])).to.equal(0)
    })

    it('should work without a path', function () {
      const o = i.freeze({a: {b: 1}})
      expect(i.getIn(o)).to.equal(o)
    })

    it('should return undefined for a non-existant path', function () {
      const o = i.freeze({
        a: 1,
        b: {a: 2},
        c: [
          {a: 3, b: 4},
          {a: 4}
        ]
      })

      expect(i.getIn(o, ['q'])).to.equal(undefined)
      expect(i.getIn(o, ['a', 's', 'd'])).to.equal(undefined)
    })

    it('should return undefined for a non-existant path (null)', function () {
      const o = i.freeze({
        a: null
      })

      expect(i.getIn(o, ['a', 'b'])).to.equal(undefined)
    })
  })

  describe('updateIn', function () {
    it('should work', function () {
      const o = i.freeze({a: 1, b: 2, c: {a: 4}})
      const result = i.updateIn(o, ['c', 'a'], function (num) {
        return num * 2
      })

      expect(result).to.eql({a: 1, b: 2, c: {a: 8}})
    })

    it("should create collections if they don't exist", function () {
      const result = i.updateIn({}, ['a', 1, 'c'], function (val) {
        expect(val).to.be(undefined)
        return 1
      })
      expect(result).to.eql({a: {'1': {c: 1}}})
    })

    it('should keep references the same if nothing changes', function () {
      const o = i.freeze({a: 1})
      const result = i.updateIn(o, ['a', 'b'], function (v) { return v })
      expect(result).to.equal(o)
    })
  })

  describe('Array methods', function () {
    it('push', function () {
      const a = i.freeze([1, 2])
      const result = i.push(a, 3)

      expect(result).to.eql([1, 2, 3])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('push (with object)', function () {
      const a = i.freeze([1, 2])
      const result = i.push(a, {b: 1})

      expect(result).to.eql([1, 2, {b: 1}])
      expect(Object.isFrozen(result)).to.be.ok()
      expect(Object.isFrozen(result[2])).to.be.ok()
    })

    it('unshift', function () {
      const a = i.freeze([1, 2])
      const result = i.unshift(a, 3)

      expect(result).to.eql([3, 1, 2])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('unshift (with object)', function () {
      const a = i.freeze([1, 2])
      const result = i.unshift(a, [0])

      expect(result).to.eql([[0], 1, 2])
      expect(Object.isFrozen(result)).to.be.ok()
      expect(Object.isFrozen(result[0])).to.be.ok()
    })

    it('pop', function () {
      const a = i.freeze([1, 2])
      const result = i.pop(a)

      expect(result).to.eql([1])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('shift', function () {
      const a = i.freeze([1, 2])
      const result = i.shift(a)

      expect(result).to.eql([2])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('reverse', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.reverse(a)

      expect(result).to.eql([3, 2, 1])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('sort', function () {
      const a = i.freeze([4, 1, 2, 3])
      const result = i.sort(a)

      expect(result).to.eql([1, 2, 3, 4])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('splice', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.splice(a, 1, 1, 4)

      expect(result).to.eql([1, 4, 3])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('splice (with object)', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.splice(a, 1, 1, {b: 1}, {b: 2})

      expect(result).to.eql([1, {b: 1}, {b: 2}, 3])
      expect(Object.isFrozen(result)).to.be.ok()
      expect(Object.isFrozen(result[1])).to.be.ok()
      expect(Object.isFrozen(result[2])).to.be.ok()
    })

    it('slice', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.slice(a, 1, 2)

      expect(result).to.eql([2])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('map', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.map(function (v) { return v * 2 }, a)

      expect(result).to.eql([2, 4, 6])
      expect(Object.isFrozen(result)).to.be.ok()
    })

    it('filter', function () {
      const a = i.freeze([1, 2, 3])
      const result = i.filter(function (v) { return v % 2 }, a)

      expect(result).to.eql([1, 3])
      expect(Object.isFrozen(result)).to.be.ok()
    })
  })

  describe('assign', function () {
    it('should work', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      let result = i.assign(o, {'b': 3, 'c': 4})
      expect(result).to.eql({a: 1, b: 3, c: 4})
      expect(result).to.not.equal(o)
      result = i.assign(o, {'d': 4})
      expect(result).to.eql({a: 1, b: 2, c: 3, d: 4})
    })

    it('should work with multiple args', function () {
      const o = i.freeze({a: 1, b: 2, c: 3})
      const result = i.assign(o, {'b': 3, 'c': 4}, {'d': 4})
      expect(result).to.eql({a: 1, b: 3, c: 4, d: 4})
    })

    it('should keep references the same if nothing changes', function () {
      const o = i.freeze({a: 1})
      const result = i.assign(o, {a: 1})
      expect(result).to.equal(o)
    })
  })

  describe('merge', function () {
    it('should merge nested objects', function () {
      const o1 = i.freeze({a: 1, b: {c: 1, d: 1}})
      const o2 = i.freeze({a: 1, b: {c: 2}, e: 2})

      const result = i.merge(o1, o2)
      expect(result).to.eql({a: 1, b: {c: 2, d: 1}, e: 2})
    })

    it('should replace arrays', function () {
      const o1 = i.freeze({a: 1, b: {c: [1, 1]}, d: 1})
      const o2 = i.freeze({a: 2, b: {c: [2]}})

      const result = i.merge(o1, o2)
      expect(result).to.eql({a: 2, b: {c: [2]}, d: 1})
    })

    it('should overwrite with nulls', function () {
      const o1 = i.freeze({a: 1, b: {c: [1, 1]}})
      const o2 = i.freeze({a: 2, b: {c: null}})

      const result = i.merge(o1, o2)
      expect(result).to.eql({a: 2, b: {c: null}})
    })

    it('should overwrite primitives with objects', function () {
      const o1 = i.freeze({a: 1, b: 1})
      const o2 = i.freeze({a: 2, b: {c: 2}})

      const result = i.merge(o1, o2)
      expect(result).to.eql({a: 2, b: {c: 2}})
    })

    it('should overwrite objects with primitives', function () {
      const o1 = i.freeze({a: 1, b: {c: 2}})
      const o2 = i.freeze({a: 1, b: 2})

      const result = i.merge(o1, o2)
      expect(result).to.eql({a: 1, b: 2})
    })

    it('should keep references the same if nothing changes', function () {
      const o1 = i.freeze({a: 1, b: {c: 1, d: 1, e: [1]}})
      const o2 = i.freeze({a: 1, b: {c: 1, d: 1, e: o1.b.e}})
      const result = i.merge(o1, o2)
      expect(result).to.equal(o1)
      expect(result.b).to.equal(o1.b)
    })

    it('should handle undefined parameters', function () {
      expect(i.merge({}, undefined)).to.eql({})
      expect(i.merge(undefined, {})).to.eql(undefined)
    })

    describe('custom associator', function () {
      it('should use the custom associator', function () {
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
        expect(result).to.eql({a: 2, b: {c: [1, 1, 2]}, d: 1})
      })
    })
  })
})

describe('chain', function () {
  it('should wrap and unwrap a value', function () {
    const a = [1, 2, 3]
    const result = i.chain(a).value()
    expect(result).to.eql(a)
  })

  it('should work with a simple operation', function () {
    const a = [1, 2, 3]
    const result = i.chain(a)
      .assoc(1, 4)
      .value()
    expect(result).to.eql([1, 4, 3])
    expect(result).to.not.equal(a)
    expect(Object.isFrozen(result)).to.be.ok()
  })

  it('should work with multiple operations', function () {
    const a = [1, 2, 3]
    const result = i.chain(a)
      .assoc(1, 4)
      .reverse()
      .pop()
      .push(5)
      .value()
    expect(result).to.eql([3, 4, 5])
    expect(result).to.not.equal(a)
    expect(Object.isFrozen(result)).to.be.ok()
  })

  it('should work with multiple operations (more complicated)', function () {
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
    expect(result).to.eql({
      a: [1, 2, 4],
      b: {c: 2, c2: 3},
      e: 2
    })
    expect(result).to.not.equal(o)
    expect(Object.isFrozen(result)).to.be.ok()
  })

  it('should have a thru method', function () {
    const o = [1, 2]
    const result = i.chain(o)
      .push(3)
      .thru(function (val) {
        return [0].concat(val)
      })
      .value()
    expect(Object.isFrozen(result)).to.be.ok()
    expect(result).to.eql([0, 1, 2, 3])
  })
})

describe('production mode', function () {
  let oldEnv
  let i
  before(function () {
    oldEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    delete require.cache[require.resolve('./icepick')]
    i = require('./icepick')
  })

  after(function () {
    process.env.NODE_ENV = oldEnv
  })

  it('should not freeze objects', function () {
    const result = i.freeze({})
    expect(Object.isFrozen(result)).to.be(false)
  })

  it("should not freeze objects that are assoc'd", function () {
    const result = i.assoc({}, 'a', {})
    expect(Object.isFrozen(result)).to.be(false)
    expect(Object.isFrozen(result.a)).to.be(false)
  })

  it('merge should keep references the same if nothing changes', function () {
    const o1 = i.freeze({a: 1, b: {c: 1, d: 1, e: [1]}})
    const o2 = i.freeze({a: 1, b: {c: 1, d: 1, e: o1.b.e}})
    const result = i.merge(o1, o2)
    expect(result).to.equal(o1)
    expect(result.b).to.equal(o1.b)
  })
})

describe('internals', function () {
  describe('_weCareAbout', function () {
    function Foo () {}

    it('should care about objects', function () {
      expect(i._weCareAbout({})).to.equal(true)
    })
    it('should care about arrays', function () {
      expect(i._weCareAbout([])).to.equal(true)
    })
    it('should not care about dates', function () {
      expect(i._weCareAbout(new Date())).to.equal(false)
    })
    it('should not care about null', function () {
      expect(i._weCareAbout(null)).to.equal(false)
    })
    it('should not care about undefined', function () {
      expect(i._weCareAbout(undefined)).to.equal(false)
    })
    it('should not care about class instances', function () {
      expect(i._weCareAbout(new Foo())).to.equal(false)
    })
    it('should not care about objects created with Object.create()',
    function () {
      expect(i._weCareAbout(Object.create(Foo.prototype))).to.equal(false)
    })
    it('should not care about objects created with Object.create({})',
    function () {
      expect(i._weCareAbout(Object.create({
        foo: function () {}
      }))).to.equal(false)
    })
  })
})
