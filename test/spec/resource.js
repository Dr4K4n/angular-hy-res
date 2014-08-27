'use strict';

function unresolvedResourceBehavior(context) {
  describe('(shared)', function() {
    beforeEach(function() {
      this.resource = context.resource;
    });

    it('should not be $resolved', function() {
      expect(this.resource.$resolved).toBe(false);
    });
  
    it('should have a $promise', function() {
      expect(this.resource.$promise).not.toBe(null);
    });

    it('should not have an $error', function() {
      expect(this.resource.$error).toBeNull();
    });
  });
}

function resolvedResourceBehavior(context) {
  describe('(shared)', function() {
    beforeEach(function() {
      this.resource = context.resource;
      this.rootScope = context.rootScope;
    });

    it('should be $resolved', function() {
      expect(this.resource.$resolved).toBe(true);
    });
  
    it('should not have an $error', function() {
      expect(this.resource.$error).toBe(null);
    });

    it('should have a completed promise', function(done) {
      var res = this.resource;
      this.resource.$promise.then(function(r) {
        expect(res).toBe(r);
        done();
      });

      this.rootScope.$digest();
    });
  });
}

describe('Module: angular-hyper-resource', function () {
  var hrResource, httpBackend, rootScope;

  // load the controller's module
  beforeEach(module('angular-hyper-resource'));
  beforeEach(module('angular-hyper-resource-hal'));

  beforeEach(inject(function(_hrResource_, $httpBackend, $rootScope) {
    hrResource = _hrResource_;
    httpBackend = $httpBackend;
    rootScope = $rootScope;
  }));

  describe('an unresolved root resource', function() {
    var context = {};
    var resource;

    beforeEach(function() {
      var raw = {
        type:'promo',
        _links:{
          self: { href: '/orders/123'},
          customer: { href: '/customers/321' },
          'customer-search': { href: '/customers/{id}', templated: true }
        },
        _embedded: {
          payment: {
            amount: '$10.50',
            _links: {
              self: { href: '/orders/123/payment' }
            }
          }
        }
      };

      httpBackend
        .expectGET('/orders/123')
        .respond(raw,{'Content-Type': 'application/hal+json'});
      resource = hrResource('/orders/123').get();
      context.resource = resource;
      context.rootScope = rootScope;
    });

    unresolvedResourceBehavior(context);

    describe('a resolved resource', function() {
      beforeEach(function() {
        httpBackend.flush();
      });

      resolvedResourceBehavior(context);

      it('should contain the parsed properties', function() {
        expect(resource.type).toBe('promo');
      });

      it('should have the self link', function() {
        expect(resource.$link('self')).toEqual({ href: '/orders/123' });
      });

      it('should have other link be null', function() {
        expect(resource.$link('blah')).toBe(null);
      });

      describe('embedded resources', function() {
        var payment;
        beforeEach(function() {
          payment = resource.$embedded('payment');
          context.resource = payment;
        });

        resolvedResourceBehavior(context);

        it('should not be null', function() {
          expect(payment).not.toBeNull();
        });

        it('should have the basic properties', function() {
          expect(payment.amount).toBe('$10.50');
        });
      });

      describe('following a link relation', function() {
        var raw = {
          _links: {
            self: { href: '/customers/321' }
          },
          name: 'John Wayne'
        };

        var customerResource;

        beforeEach(function() {
          httpBackend
            .expectGET('/customers/321')
            .respond(raw,{'Content-Type': 'application/hal+json'});
          customerResource = resource.$follow('customer');
          context.resource = customerResource;
        });

        unresolvedResourceBehavior(context);
        
        describe('and then resolved', function() {
          beforeEach(function() {
            httpBackend.flush();
          });
        
          resolvedResourceBehavior(context);
        
          it('should have the raw properties', function() {
            expect(customerResource.name).toBe('John Wayne');
          });
        });
      });

      describe('following a link object', function() {
        var raw = {
          _links: {
            self: { href: '/customers/321' }
          },
          name: 'John Wayne'
        };

        var customerResource;

        beforeEach(function() {
          httpBackend
            .expectGET('/customers/321')
            .respond(raw,{'Content-Type': 'application/hal+json'});
          var link = resource.$link('customer');
          customerResource = resource.$followLink(link);
          context.resource = customerResource;
        });

        unresolvedResourceBehavior(context);
        
        describe('and then resolved', function() {
          beforeEach(function() {
            httpBackend.flush();
          });
        
          resolvedResourceBehavior(context);
        
          it('should have the raw properties', function() {
            expect(customerResource.name).toBe('John Wayne');
          });
        });
      });

      describe('following a templated link relation', function() {
        var raw = {
          _links: {
            self: { href: '/customers/666' }
          },
          name: 'Bruce Lee'
        };

        var customerResource;

        beforeEach(function() {
          httpBackend
            .expectGET('/customers/666')
            .respond(raw,{'Content-Type': 'application/hal+json'});
          customerResource = resource.$follow('customer-search', { data: { id: '666' } });
          context.resource = customerResource;
        });

        unresolvedResourceBehavior(context);
        
        describe('and then resolved', function() {
          beforeEach(function() {
            httpBackend.flush();
          });
        
          resolvedResourceBehavior(context);
        
          it('should have the raw properties', function() {
            expect(customerResource.name).toBe('Bruce Lee');
          });
        });
      });
    });
  });
});