var chai = require('chai'),
    sinonChai = require('sinon-chai'),
    sinon = require('sinon'),
    expect = chai.expect;

chai.use(sinonChai);

describe('Promise', function() {

  var Promise = require('../index').Promise,
      pro, success, failure, progress;

  beforeEach(function() {
    pro = new Promise();
  });

  it('should be a function', function() {
    expect(Promise).to.be.a('function');
    expect(pro).to.be.a('object');
    expect(pro.then).to.be.a('function');
  });

  describe('in a resolve state', function() {

    beforeEach(function() {
      success = sinon.spy();
      failure = sinon.spy();
      pro.addCallback(success);
      expect(pro.isResolved()).to.be.false;
    });

    it('should resolve with the good arguments', function() {
      pro.resolve('foo', 'bar');
      expect(pro.isResolved()).to.be.true;
      expect(success).to.have.been.calledWith('foo', 'bar');
    });

    it('should be possible to get passed arguments', function(){
      pro.resolve('foo', 'bar');
      expect(pro.resolvedArguments()).to.eql(['foo', 'bar']);
    });
    
    it('should not be resolved twice', function() {
      pro.resolve('foo', 'bar').resolve('foo', 'bar');
      expect(success).to.have.been.calledOnce;
    });

    it('should execute callbacks event after being resolved', function() {
      pro.resolve('foo', 'bar');
      pro.addCallback(success);
      expect(success).to.have.been.calledWith('foo', 'bar');
    });

    it('should properly cancel', function() {
      pro.addCallback(success);
      pro.cancel();
      pro.addCallback(failure);
      pro.resolve();
      expect(success).to.not.have.been.called;
      expect(failure).to.not.have.been.called;
    });

  });
  
  describe('in a reject state', function() {
    
    beforeEach(function() {
      failure = sinon.spy();
      pro.addErrback(failure);
      expect(pro.isRejected()).to.be.false;
    });

    it('should reject with the good arguments', function() {
      pro.reject('foo', 'bar');
      expect(pro.isRejected()).to.be.true;
      expect(failure).to.have.been.calledWith('foo', 'bar');
    });

    it('should be possible to get passed arguments', function(){
      pro.reject('foo', 'bar');
      expect(pro.rejectedArguments()).to.eql(['foo', 'bar']);
    });

    it('should not be reject twice', function() {
      pro.reject('foo', 'bar').reject('foo', 'bar');
      expect(failure).to.have.been.calledOnce;
    });

    it('should execute callbacks event after being rejected', function() {
      pro.reject('foo', 'bar');
      pro.addErrback(failure);
      expect(failure).to.have.been.calledWith('foo', 'bar');
    });

    it('should properly cancel', function() {
      pro.addErrback(success);
      pro.cancel();
      pro.addErrback(failure);
      pro.resolve('foo', 'bar');
      expect(success).to.not.have.been.called;
      expect(failure).to.not.have.been.called;
    });

  });

  describe('in progress state', function() {
    describe('#inProgres', function() {
      it('should return true', function() {
        expect(pro.inProgress()).to.be.truthy;
      });
    });
  });

  describe('#always', function() {
    var spy;

    beforeEach(function() {
      spy = sinon.spy();
      pro.always(spy);
    });

    describe('in reject state', function() {
      beforeEach(function() {
        pro.reject(new Error());
      });

      it('should call always', function() {
        expect(spy).to.have.been.called;
      });
    });

    describe('in resolve state', function() {
      beforeEach(function() {
        pro.resolve('hi');
      });

      it('should call always', function() {
        expect(spy).to.have.been.called;
      });
    });
  });

  describe('context of execution', function() {

    var that = {};
    
    beforeEach(function() {
      success = sinon.spy();
      failure = sinon.spy();
      progress = sinon.spy();
    });

    it('should resolve in the good context', function() {
      pro.then(success, failure, that);
      pro.resolve();
      expect(success).to.have.been.calledOn(that);
    });

    it('should reject in the good context', function() {
      pro.then(success, failure, that);
      pro.reject();
      expect(failure).to.have.been.calledOn(that);
    });

    it('should progress in the good context', function() {
      pro.then(success, failure, progress, that);
      pro.progress();
      expect(progress).to.have.been.calledOn(that);
    });

  });

  describe('pipe', function() {
    
    it('should pipe deferred', function() {
      success = sinon.spy();
      var pipe1 = new Promise();
      var pipe2 = new Promise();
      pro.pipe(function(value) {
        pipe1.resolve(value + 1);
        return pipe1;
      }).pipe(function(value) {
        pipe2.resolve(value + 1);
        return pipe2;
      });
      pipe2.addCallback(success);
      pro.resolve(10);
      expect(success).to.have.been.calledWith(12);
    });

    it('should fall back to resolved chain', function(done) {
      var pro = new Promise();
      pro.pipe(function() {}, function(error) {
        return 1;
      }).then(function(value) {
        expect(value).to.equal(1);
        done();
      });
      pro.reject(new Error());
    });

    it('should stay in the rejected chain', function(done) {
      var pro = new Promise();
      var exception = new Error();
      pro.pipe(function() {}, function(error) {
        return error;
      }).then(function() {}, function(error) {
        expect(error).to.eql(exception);
        done();
      });
      pro.reject(exception);
    });

    it('should implicitely pipe arguments when no err/call-back', function() {
      var implicit = sinon.spy();
      var noop = function() {};
      pro.pipe(noop)
         .addErrback(implicit);
      pro.reject(12);
      expect(implicit).to.have.been.calledWith(12);
    });
  });

  describe('when', function() {
    
    var promises;

    beforeEach(function() {
      promises = [
        new Promise(),
        new Promise(),
        new Promise()
      ];
      success = sinon.spy();
      failure = sinon.spy();
    });

    it('should test if it is a value or a promise', function() {
      expect(Promise.isPromise('value')).to.be.false;
      expect(Promise.isPromise(pro)).to.be.true;
    });

    it('should return a promise', function() {
      var promise  = Promise.when('foo');
      var deferred = Promise.when(pro);
      expect(promise.then).to.be.a('function');
      expect(promise.isResolved()).to.be.true;
      expect(deferred).to.equal(pro);
    });

    describe('whenAll', function() {
      
      it('should be resolved when all are resolved', function() {
        var all = Promise.whenAll(promises).then(success, failure);
        expect(all.isResolved()).to.be.false;
        promises[0].resolve('foo');
        expect(success).to.not.have.been.called;
        promises[1].resolve('bar');
        expect(success).to.not.have.been.called;
        promises[2].resolve('baz');
        expect(success).to.have.been.calledWith([promises[0], promises[1], promises[2]], []);
        expect(all.isResolved()).to.be.true;
      });

      it('sould be rejected as soon as a promise is rejected', function() {
        var all = Promise.whenAll(promises).then(success, failure);
        promises[1].resolve('foo');
        expect(failure).to.not.have.been.called;
        promises[0].reject('bar');
        expect(failure).to.have.been.calledWith([promises[1]], [promises[0]]);
        expect(all.isRejected()).to.be.true;
      });

    });

    describe('whenSome', function() {
      
      it('should be resolved when some are resolved', function() {
        var some = Promise.whenSome(promises, 2).then(success, failure);
        expect(some.isResolved()).to.be.false;
        promises[0].resolve('foo');
        expect(success).to.not.have.been.called;
        promises[2].resolve('baz');
        expect(some.isResolved()).to.be.true;
        expect(success).to.have.been.calledWith([promises[0], promises[2]], []);
      });

      it('should be rejected as soon as too many promise have rejected', function() {
        var some = Promise.whenSome(promises, 2).then(success, failure);
        promises[0].reject('foo');
        promises[2].resolve('bar');
        expect(some.isCompleted()).to.be.false;
        promises[1].reject('quz');
        expect(failure).to.have.been.calledWith([promises[2]], [promises[0], promises[1]]);
        expect(some.isRejected()).to.be.true;
      });

    });

    describe('whenAtLeast', function() {
      
      var atl;

      beforeEach(function() {
        atl = Promise.whenAtLeast(promises).then(success, failure);
        expect(atl.isResolved()).to.be.false;
      });

      it('should resolve if at least one has resolved when they are all completed', function() {
        promises[0].reject();
        expect(success).to.not.have.been.called;
        promises[2].resolve('bar');
        expect(success).to.not.have.been.called;
        promises[1].reject();
        expect(success).to.have.been.calledWith([promises[2]], [promises[0], promises[1]]);
        expect(atl.isResolved()).to.be.true;
      });

      it('should reject when all have rejected', function() {
        promises[0].reject();
        promises[1].reject();
        promises[2].reject();
        expect(failure).to.have.been.called;
        expect(success).to.not.have.been.called;
        expect(atl.isRejected()).to.be.true;
      });

    });

    describe('whenMap', function() {
      
      var map;

      beforeEach(function() {
        map = Promise.whenMap(promises, function(value) {
          return value + '_bar';
        }).then(success);
      });

      it('should', function() {
        promises[0].resolve('foo1');
        promises[1].resolve('foo2');
        promises[2].resolve('foo3');
        expect(success).to.have.been.calledWith(['foo1_bar', 'foo2_bar', 'foo3_bar']);
      });
    });

  });

});