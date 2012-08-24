var chai = require('chai'),
    sinonChai = require('sinon-chai'),
    sinon = require('sinon'),
    expect = chai.expect;

chai.use(sinonChai);

describe('With StateEventEmitter', function() {

  var StateEventEmitter = require('../index').StateEventEmitter,
      see, spy;

  beforeEach(function() {
    see = new StateEventEmitter();
  });

  it('should be defined and be a function', function() {
    expect(StateEventEmitter).to.be.ok;
    expect(StateEventEmitter).to.be.a('function');
  });

  describe('when i set state', function() {
    var state = 'state';
    beforeEach(function() {
      see.setState(state);
    });

    it('should be set', function() {
      expect(see.getState()).to.equal(state);
    });

    it('should respond to stateis', function() {
      expect(see.stateIs(state)).to.be.truthy;
    });

    it('should respond to stateisnot', function() {
      expect(see.stateIsNot('bah')).to.be.falsy;
    });
  });

  describe('when i add statechange listener', function() {
    beforeEach(function() {
      spy= new sinon.spy();
      see.onStateChange(spy);
    });

    describe('and set state', function() {
      beforeEach(function() {
        see.setState('foo');
      });

      it('should call the listener', function() {
        expect(spy).to.have.been.called;
      });
    });

    describe('and set state silently', function() {
      beforeEach(function() {
        see.setStateSilently('foo');
      });

      it('should not call the listener', function() {
        expect(spy).to.not.have.been.called;
      });
    });

    describe('and set state twice', function() {
      beforeEach(function() {
        see.setState('foo');
        see.setState('foo');
      });

      it('should call the listener only once', function() {
        expect(spy).to.have.been.calledOnce;
      });
    });
  });

  describe('when i add a `foo` event listener', function() {
    var arg = 'argeu';

    beforeEach(function() {
      spy = new sinon.spy();
      see.on('foo', spy);
    });

    describe('and set state', function() {
      beforeEach(function() {
        see.setState('foo', arg);
      });

      it('should call the listener', function() {
        expect(spy).to.have.been.called;
      });

      it('should call the listener with good arguments', function() {
        expect(spy).to.have.been.calledWith(arg);
      });
    });

    describe('and set state silently', function() {
      beforeEach(function() {
        see.setStateSilently('foo');
      });

      it('should not call the listener', function() {
        expect(spy).to.not.have.been.called;
      });
    });

    describe('and set state twice', function() {
      beforeEach(function() {
        see.setState('foo');
        see.setState('foo');
      });

      it('should call the listener only once', function() {
        expect(spy).to.have.been.calledOnce;
      });
    });
  });
});