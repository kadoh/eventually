var chai = require('chai'),
    sinonChai = require('sinon-chai'),
    sinon = require('sinon'),
    expect = chai.expect;

var cov = process.env.NODE_COV ? '-cov' : '';

chai.use(sinonChai);

describe('EventEmitter', function() {

  var EventEmitter = require('../index'+cov).EventEmitter,
      ee, spy;

  beforeEach(function() {
    ee = new EventEmitter();
    spy = sinon.spy();
  });

  it('should be defined and be a function', function() {
    expect(EventEmitter).to.be.ok;
    expect(EventEmitter).to.be.a('function');
  });

  describe('when i add a listener', function() {

    describe('and when I fire the associated event with arguments', function() {
      it('should have been called with the right arguments', function() {
        ee.on('foo', spy);
        ee.emit('foo', 'arg1', false);
        expect(spy).to.have.been.calledWith('arg1', false);
      });
    });

    it('should be removable wiht off', function() {
      ee.on('foo', spy);
      ee.off('foo', spy);
      ee.emit('foo');
      expect(spy).to.not.have.been.called;
    });

    describe('when i add other vents', function() {
      var spy2, spy3;

      beforeEach(function() {
        spy2 = sinon.spy();
        spy3 = sinon.spy();

        ee.on('foo', spy);
        ee.on('foo', spy2);
        ee.on('bar', spy3);
      });

      it('should possible to shut all foo', function() {
        ee.offAll('foo');
        ee.emit('foo');
        ee.emit('bar');
        expect(spy).to.not.have.been.called;
        expect(spy2).to.not.have.been.called;
        expect(spy3).to.have.been.called;
      });

      it('should possible to shut all', function() {
        ee.offAll();
        ee.emit('foo');
        ee.emit('bar');
        expect(spy).to.not.have.been.called;
        expect(spy2).to.not.have.been.called;
        expect(spy3).to.not.have.been.called;
      });
    });
  });

  describe('when i add a one time listener and I fire the event 2 times',
    function() {
    it('the listener should have been called only one time', function() {
      ee.once('foo', spy);
      ee.emit('foo').emit('foo');
      expect(spy).to.have.been.calledOnce;
    });
  });

  describe('when i add a listener specifying the context and i fire the event',
    function() {
    var that = {};

    it('should have bee called with the appropriate context', function() {
      ee.once('foo', spy, that);
      ee.emit('foo');
      expect(spy).to.have.been.calledOn(that);
    });
  });

  describe('when i add 2 listeners for one event and fire it', function() {
    var spy2;

    beforeEach(function() {
      spy2 = sinon.spy();
    });

    it('should be called in the order of add', function() {
      ee.on('foo', spy);
      ee.on('foo', spy2);
      ee.emit('foo');

      expect(spy).to.have.been.calledBefore(spy2);
    });

    it('unless I add the secon one with the \'unshift\' option', function() {
      ee.on('foo', spy);
      ee.on('foo', spy2, undefined, {unshift : true});
      ee.emit('foo');

      expect(spy).to.have.been.calledAfter(spy2);

    });
  });

  describe('subscribers', function() {
    
    beforeEach(function() {
      ee.subscribe(spy);
      ee.emit('foo');
      ee.emit('bar', {baz: 'alex'});
    });

    it('should be possible to subscribe', function() {
      expect(spy).to.have.been.calledTwice;
    });

    it('should be possible to unsubscribe', function() {
      ee.unsubscribe(spy);
      ee.emit('empty');
      expect(spy).to.have.been.calledTwice;
    });
  });

  describe('when a handler throws an error', function() {
    var error = new Error();
    var thrower = function() {
      throw error;
    };

    beforeEach(function() {
      ee.on('foo', thrower);
    });

    describe('if no listener on the error channel', function() {
      it('should simply throw', function() {
        expect(function() {
          ee.emit('foo');
        }).throws(error);
      });
    });

    describe('if listeners on the error chanel', function() {
      var spy2;
      beforeEach(function() {
        ee.on('error', spy);
        spy2 = sinon.spy();
        ee.on('foo', spy2);
      });

      it('should not throw', function() {
        expect(function() {
          ee.emit('foo');
        }).not.throws();
      });

      it('but should emit error', function() {
        ee.emit('foo');
        expect(spy).to.have.been.calledWith(error);
      });

      it('should follow the call of next listeners', function() {
        ee.emit('foo');
        expect(spy2).to.have.been.called;
      });
    });
  });

  describe('chain of events', function() {
    
    var that = {};

    it('should be possible to add chain of events', function() {
      var fooSpy = sinon.spy();
      var barSpy = sinon.spy();
      var chain = {
        foo: fooSpy,
        bar: barSpy
      };
      ee.on(chain, that);
      ee.emit('foo');
      expect(fooSpy).to.have.been.calledOnce;
      expect(fooSpy).to.have.been.calledOn(that);
      ee.emit('bar');
      expect(barSpy).to.have.been.calledOnce;
      expect(barSpy).to.have.been.calledOn(that);
    });

  });
});