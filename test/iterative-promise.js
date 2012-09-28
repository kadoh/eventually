var chai = require('chai'),
    sinonChai = require('sinon-chai'),
    sinon = require('sinon'),
    expect = chai.expect;

var cov = process.env.NODE_COV ? '-cov' : '';

chai.use(sinonChai);

describe('IterativePromise', function() {
  var Promise = require('../index'+cov).Promise;
  var IterativePromise = require('../index'+cov).IterativePromise;
  var map;

  beforeEach(function() {
    map = [new Promise(), new Promise(), new Promise()];
  });

  it('should be a function', function() {
    expect(IterativePromise).to.be.a('function');
  });

  describe('instance', function() {
    var itPro, redspy, endspy, remap, false_remap, map_res;
    beforeEach(function() {
      remap = false;
      false_remap = false;
      map_res = null;
      itPro = new IterativePromise();

      var reduce = function(prev, res, map, key) {
        if(remap)
          map(2);
        if(false_remap)
          map_res = map(0);

        return prev+res;
      };

      endspy = sinon.spy();
      redspy = sinon.spy(reduce);

      itPro
      .map(function(key) {
        return map[key];
      })
      .reduce(redspy, 'init')
      .end(endspy)
      .start([0,1]);
    });

    describe('when resolving the first promise', function() {
      beforeEach(function() {
        map[0].resolve('hi');
      });

      it('should call the reduce', function() {
        expect(redspy).to.have.been.called;
      });
      
      it('should call the reduce with the prev argument', function() {
        var args = redspy.lastCall.args;
        expect(args[0]).to.be.equal('init');
      });

      it('should call the reduce with the result argument', function() {
        var args = redspy.lastCall.args;
        expect(args[1]).to.be.equal('hi');
      });

      it('should call the reduce with the key argument', function() {
        var args = redspy.lastCall.args;
        expect(args[3]).to.be.equal(0);
      });
      
      it('should call the reduce with the resolved argument', function() {
        var args = redspy.lastCall.args;
        expect(args[4]).to.include(0);
      });

      it('should not have called end function', function() {
          expect(endspy).to.not.have.been.called;
      });

      it('should not have completed the process', function() {
          expect(itPro.isCompleted()).to.be.falsy;
      });

      describe('and resolving the second promise', function() {
        beforeEach(function() {
          map[1].resolve('ho');
        });

        it('should call the reduce with the prev argument', function() {
          var args = redspy.lastCall.args;
          expect(args[0]).to.be.equal('init'+'hi');
        });

        it('should call twice the reduce', function() {
          expect(redspy).to.have.been.calledTwice;
        });
        
        it('should call the reduce with the result argument', function() {
          var args = redspy.lastCall.args;
          expect(args[1]).to.be.equal('ho');
        });

        it('should call the reduce with the key argument', function() {
          var args = redspy.lastCall.args;
          expect(args[3]).to.be.equal(1);
        });
        
        it('should call the reduce with the resolved argument', function() {
          var args = redspy.lastCall.args;
          expect(args[4]).to.include(0,1);
        });

        it('should have called end function because no more things to map',
          function() {
            expect(endspy).to.have.been.called;
            var args = endspy.lastCall.args;
            expect(args[0]).to.equal('init'+'hi'+'ho');
            expect(args[2]).to.include(0,1);
            expect(args[3]).to.be.empty;
        });

        it('should have completed the process', function() {
            expect(itPro.isCompleted()).to.be.truthy;
        });
      });

      describe('and rejecteing the second promise', function() {
        beforeEach(function() {
          map[1].reject(new Error());
        });

        it('should call the end function', function() {
          expect(endspy).to.have.been.called;
          var args = endspy.lastCall.args;
          expect(args[0]).to.equal('init'+'hi');
          expect(args[2]).to.include(0);
          expect(args[3]).to.include(1);
        });
      });

      describe('and resolving the 2nd and maping a 3rd prmomise', function() {
        beforeEach(function() {
          remap = true;
          map[1].resolve('ho');
        });

        it('should not call the end function', function() {
          expect(endspy).to.not.have.been.called;
        });

        describe('and resolving the third', function() {
          beforeEach(function() {
            map[2].resolve('ha');
          });

          it('should have called the reduce function thrice', function() {
            expect(redspy).to.have.been.calleddThrice
          });

          it('should have been called the end function', function() {
            expect(endspy).to.have.been.called;
            var args = endspy.lastCall.args;
            expect(args[0]).to.equal('init'+'hi'+'ho'+'ha');
            expect(args[2]).to.include(0,1,2);
            expect(args[3]).to.be.empty;

          });
        });
      });

      describe('and resolving the 2nd and maping a 3rd in end', function() {
        beforeEach(function() {
          var end = function(res, map) {
            if(res.length<9)
              map(2);
          };
          endspy = sinon.spy(end);
          itPro.end(endspy);
          map[1].resolve('ho');
        });

        it('should have called the reduce function thrice', function() {
          expect(redspy).to.have.been.calleddThrice
        });

        it('should have called the end function once', function() {
          expect(endspy).to.have.been.calledOnce;
        });

        describe('and resolving the third', function() {
          beforeEach(function() {
            map[2].resolve('foo');
          });

          it('should have called the end function twice', function() {
            expect(endspy).to.have.been.calledTwice;
          });

          it('should have called the reduce function', function() {
            var arg = redspy.thirdCall.args;
            expect(arg[1]).to.be.equal('foo');
            expect(arg[3]).to.be.equal(2);
          });
        });
      });

      describe('and resolving the 2nd and map already mapped key', function() {
        beforeEach(function() {
          false_remap = true;
          map[1].resolve('hi');
        });

        it('map should have returned false', function() {
          expect(map_res).to.be.falsy;
        });

        it('should have called reduce only twice', function() {
          expect(redspy).to.have.been.calledTwice;
        });
      });
    });
  });

  describe('adding a map function', function() {
    var itPro;
    beforeEach(function() {
      itPro = new IterativePromise([0,1])
      .map(function(key) {
        return map[key];
      });
      map[0].resolve('hi');
      map[1].resolve('ho');
    });

    it('should not be completed', function() {
      expect(itPro.isCompleted()).to.be.falsy;
    });

    describe('adding the reduce function', function() {
      var endspy;
      beforeEach(function() {
        endspy = sinon.spy();
        itPro
        .reduce(function(prev, res) {
          return prev+res;
        },'i')
        .end(endspy);
      });

      it('should be completed', function() {
        expect(endspy).to.have.been.called;
        expect(endspy.lastCall.args[0]).to.be.equal('i'+'hi'+'ho');
      });
    });
  });
});
