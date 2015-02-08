describe('ng.cl.prevent-nav', function () {
    'use strict';

    beforeEach(module('ng.cl.prevent-nav'));

    var clPreventNavProvider;
    beforeEach(function () {
        module(function (_clPreventNavProvider_) {
            clPreventNavProvider = _clPreventNavProvider_;
        });
    });

    describe('clPreventNavProvider', function () {

        it('should initialize with known defaults.', inject(function (clPreventNav) {

            var dlgHeader = 'Warning:';
            var msgPrefix = ' - ';
            var defaultMsg = 'All changes not yet saved will be lost.';

            expect(clPreventNav.dlgHeader).toBe(dlgHeader);
            expect(clPreventNav.msgPrefix).toBe(msgPrefix);
            expect(clPreventNav.defaultMsg).toBe(defaultMsg);
        }));

        describe('configure()', function () {

            it('should store the provided configuration.', inject(function (clPreventNav) {

                var dlgHeader = 'foo';
                var msgPrefix = 'bar';
                var defaultMsg = 'baz';

                clPreventNavProvider.configure({
                    dlgHeader: dlgHeader,
                    msgPrefix: msgPrefix,
                    defaultMsg: defaultMsg
                });

                expect(clPreventNav.dlgHeader).toBe(dlgHeader);
                expect(clPreventNav.msgPrefix).toBe(msgPrefix);
                expect(clPreventNav.defaultMsg).toBe(defaultMsg);
            }));
        });
    });

    describe('clPreventNav', function () {

        describe('addInterceptor()', function () {

            it('should throw an error if CheckFn is not provided.', inject(function (clPreventNav)  {

                expect(function () {
                    clPreventNav.addInterceptor();
                }).toThrow('checkFn should be a function.');
            }));

            it('should throw an error if CheckFn is not a function.', inject(function (clPreventNav)  {

                expect(function () {
                    clPreventNav.addInterceptor('foo');
                }).toThrow('checkFn should be a function.');
            }));

            it('should return a deregistration function.', inject(function (clPreventNav)  {

                var fn = clPreventNav.addInterceptor(function () {});

                expect(typeof fn).toBe('function');
                // invoking it just to make sure there's no error
                fn();
            }));

        });

        describe('default state', function () {

            it('should have navigation enabled.', inject(function (clPreventNav)  {

                expect(clPreventNav.prevented).toBe(false);
            }));

            it('should NOT have navigation suspended.', inject(function (clPreventNav)  {

                expect(clPreventNav.suspended).toBe(false);
            }));

            it('should NOT have an empty list of messages.', inject(function (clPreventNav)  {

                expect(typeof clPreventNav.messages).toBe('object');
                expect(clPreventNav.messages.length).toBe(0);
            }));
        });

        describe('when an interceptor has been registered', function () {

            var checkFn;

            beforeEach(inject(function (clPreventNav) {
                checkFn = jasmine.createSpy('checkFn');
                clPreventNav.addInterceptor(checkFn);
            }));

            it('should should invoke it`s "checkFn" on every digest cycle.', inject(function (clPreventNav, $rootScope)  {

                $rootScope.$apply();

                expect(checkFn).toHaveBeenCalled();

                // initial call count is 2 because that's the way $scopes initialize
                // but we don't really care, just need to make sure it's called at least once per digest
                var callCount = checkFn.calls.length;

                $rootScope.$apply();

                expect(checkFn.calls.length).toBeGreaterThan(callCount);
            }));

            it('should NOT disable nagivation if the "checkFn" returns something "truthy".', inject(function (clPreventNav, $rootScope)  {

                checkFn.andReturn(true);

                $rootScope.$apply();

                expect(clPreventNav.prevented).toBe(false);
            }));

            it('should disable nagivation once the "checkFn" returns something "falsy".', inject(function (clPreventNav, $rootScope)  {

                clPreventNav.addInterceptor(function () {});

                $rootScope.$apply();

                expect(clPreventNav.prevented).toBe(true);
            }));

            it('should still disable nagivation even if another "checkFn" returns "truthy".', inject(function (clPreventNav, $rootScope)  {

                checkFn.andReturn(false);

                var checkFn2 = jasmine.createSpy('checkFn2');
                checkFn2.andReturn(true);
                clPreventNav.addInterceptor(checkFn2);

                $rootScope.$apply();

                expect(checkFn2).toHaveBeenCalled();
                expect(clPreventNav.prevented).toBe(true);
            }));

            it('should disable re-enable nagivation when all "checkFn" return "truthy".', inject(function (clPreventNav, $rootScope)  {

                $rootScope.$apply();
                checkFn.andReturn(true);

                $rootScope.$apply();

                expect(clPreventNav.prevented).toBe(false);
            }));
        });

        describe('when an interceptor is deregistered', function () {

            var checkFn;
            var deregister;

            beforeEach(inject(function (clPreventNav) {
                checkFn = jasmine.createSpy('checkFn');
                deregister = clPreventNav.addInterceptor(checkFn);
            }));

            it('should should NOT be invoked again.', inject(function (clPreventNav, $rootScope)  {

                $rootScope.$apply();

                expect(checkFn).toHaveBeenCalled();

                // initial call count is 2 because that's the way $scopes initialize
                // but we don't really care, just need to make sure it's NOT called again
                var callCount = checkFn.calls.length;

                deregister();

                $rootScope.$apply();

                expect(checkFn.calls.length).toBe(callCount);
            }));
        });

        describe('when an unknown interceptor is deregistered', function () {

            var deregister;

            beforeEach(inject(function (clPreventNav) {
                deregister = clPreventNav.addInterceptor(function () {});
            }));

            it('should should NOT throw any errors.', inject(function (clPreventNav, $rootScope)  {

                deregister();
                deregister();
            }));
        });

        describe('messages', function () {

            describe('when not interceptors ARE blocking', function () {

                beforeEach(inject(function (clPreventNav, $rootScope) {
                    clPreventNav.addInterceptor(function () {
                        return true;
                    }, null, 'message');
                    $rootScope.$apply();
                }));

                it('should have no active messages', inject(function (clPreventNav)  {

                    expect(clPreventNav.messages.length).toBe(0);
                }));
            });

            describe('when an interceptor without message is blocking', function () {

                beforeEach(inject(function (clPreventNav, $rootScope) {
                    clPreventNav.addInterceptor(function () {
                        return false;
                    });
                    $rootScope.$apply();
                }));

                it('should have one message, as configured', inject(function (clPreventNav)  {

                    expect(clPreventNav.messages.length).toBe(1);
                    expect(clPreventNav.messages[1]).toBe(clPreventNavProvider.defaultMsg);
                }));
            });

            describe('when an interceptor with an custom message is blocking', function () {

                var message = 'foobar';

                beforeEach(inject(function (clPreventNav, $rootScope) {
                    clPreventNav.addInterceptor(function () {
                        return false;
                    }, null, message);
                    $rootScope.$apply();
                }));

                it('should have one message, as provided with the interceptor', inject(function (clPreventNav)  {

                    expect(clPreventNav.messages.length).toBe(1);
                    expect(clPreventNav.messages[0]).toBe(message);
                }));
            });
        });

        describe('onbeforeunload', function () {

            var $windowMock;

            beforeEach(function () {
                module(function ($provide) {
                    $windowMock = {
                        onbeforeunload: 'foo'
                    };
                    $provide.value('$window', $windowMock);
                });
            });

            describe('when an interceptor without message is blocking', function () {

                beforeEach(inject(function (clPreventNav, $rootScope) {
                    clPreventNav.addInterceptor(function () {
                        return false;
                    });
                    $rootScope.$apply();
                }));

                it('should bind onbeforeunload', inject(function (clPreventNav, $rootScope)  {

                    expect(typeof $windowMock.onbeforeunload).toBe('function');
                }));

                it('should bind onbeforeunload', inject(function (clPreventNav, $rootScope)  {

                    var expected = 'Warning:\n\n - All changes not yet saved will be lost.\n';

                    expect($windowMock.onbeforeunload()).toBe(expected);
                }));
            });

            describe('when an interceptor blocks an unblocks', function () {

                var checkFn;

                beforeEach(inject(function (clPreventNav) {
                    checkFn = jasmine.createSpy('checkFn');
                    checkFn.andReturn(false);
                    clPreventNav.addInterceptor(checkFn);
                }));

                it('should unbind onbeforeunload', inject(function (clPreventNav, $rootScope)  {

                    checkFn.andReturn(false);
                    $rootScope.$apply();

                    expect(typeof $windowMock.onbeforeunload).toBe('function');

                    checkFn.andReturn(true);
                    $rootScope.$apply();

                    expect($windowMock.onbeforeunload).toBeNull();
                }));
            });
        });

        describe('async handlers', function () {

            describe('when an interceptor with a "handleFn" is registered', function () {

                var checkFn;
                var handleFn;

                beforeEach(inject(function (clPreventNav) {
                    checkFn = jasmine.createSpy('checkFn');
                    handleFn = jasmine.createSpy('handleFn');
                    clPreventNav.addInterceptor(checkFn, handleFn);
                }));

                describe('and the "checkFn" is returning true', function () {

                    beforeEach(inject(function ($rootScope, $location) {
                        checkFn.andReturn(true);
                        $rootScope.$apply();
                        $location.path('/foo');
                        $rootScope.$apply();
                    }));

                    it('should NOT invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNav, $rootScope)  {

                        expect(handleFn).not.toHaveBeenCalled();
                    }));
                });

                describe('and the "checkFn" is returning false', function () {

                    beforeEach(inject(function ($rootScope) {
                        checkFn.andReturn(false);
                        $rootScope.$apply();
                    }));

                    it('should invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).toHaveBeenCalled();
                        expect(handleFn.calls.length).toBe(1);
                    }));

                    describe('and the "handleFn" returns nothing', function () {

                        it('should invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNav, $rootScope, $location)  {

                            $location.path('/foo');
                            $rootScope.$apply();

                            expect(handleFn).toHaveBeenCalled();
                            expect(handleFn.calls.length).toBe(1);
                        }));
                    });

                    describe('and the "handleFn" returns a promise', function () {

                        var defer;

                        beforeEach(inject(function ($q) {
                            defer = $q.defer();
                            handleFn.andReturn(defer.promise);
                        }));

                        it('should suspend navigation.', inject(function (clPreventNav, $rootScope, $location)  {

                            $location.path('/foo');
                            $rootScope.$apply();

                            expect(handleFn).toHaveBeenCalled();
                            expect(handleFn.calls.length).toBe(1);
                            expect(clPreventNav.suspended).toBe(true);
                            expect($location.path()).toBe('');
                        }));

                        describe('and the promise is resolved', function () {

                            beforeEach(inject(function ($q, $rootScope, $location) {
                                $location.path('/foo');
                                $rootScope.$apply();
                                defer.resolve();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation and navigate.', inject(function (clPreventNav, $rootScope, $location)  {

                                expect(clPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));
                        });

                        describe('and the promise is rejected', function () {

                            beforeEach(inject(function ($q, $rootScope) {
                                defer.reject();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation an NOT navigate.', inject(function (clPreventNav, $rootScope, $location)  {

                                expect(clPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('');
                            }));
                        });
                    });
                });
            });

            describe('when more than one interceptor is registered, but only one provides a "handleFn" ', function () {

                var handleFn;

                beforeEach(inject(function (clPreventNav, $location, $rootScope) {
                    handleFn = jasmine.createSpy('handleFn');
                    clPreventNav.addInterceptor(function () {
                        return false;
                    });
                    clPreventNav.addInterceptor(function () {
                        return false;
                    }, handleFn);
                    $location.path('/foo');
                    $rootScope.$apply();
                }));

                describe('and the "checkFn" is returning false', function () {

                    it('should NOT invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNav, $rootScope)  {

                        expect(handleFn).not.toHaveBeenCalled();
                    }));

                    it('should NOT suspend navigation NOR navigate.', inject(function (clPreventNav, $rootScope, $location)  {

                        expect(clPreventNav.suspended).toBe(false);
                        expect($location.path()).toBe('');
                    }));
                });
            });

            describe('when more than one interceptor is registered, and ALL provide a "handleFn" ', function () {

                var handleFn;
                var handleFn2;
                var defer;
                var defer2;

                beforeEach(inject(function (clPreventNav, $q) {
                    handleFn = jasmine.createSpy('handleFn');
                    handleFn2 = jasmine.createSpy('handleFn2');
                    defer = $q.defer();
                    defer2 = $q.defer();
                    handleFn.andReturn(defer.promise);
                    handleFn2.andReturn(defer2.promise);
                }));

                describe('and only one of the "checkFn" is returning false', function () {

                    beforeEach(inject(function (clPreventNav, $q) {
                        clPreventNav.addInterceptor(function () {
                            return true;
                        }, handleFn);
                        clPreventNav.addInterceptor(function () {
                            return false;
                        }, handleFn2);
                    }));

                    it('should only invoke the "handleFn" of the blocking check.', inject(function (clPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).not.toHaveBeenCalled();
                        expect(handleFn2).toHaveBeenCalled();
                    }));

                    it('should suspend navigation.', inject(function (clPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(clPreventNav.suspended).toBe(true);
                        expect($location.path()).toBe('');
                    }));

                    it('should unsuspend navigation and navigate after promise is resolved.', inject(function (clPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();
                        defer2.resolve();
                        $rootScope.$apply();

                        expect(clPreventNav.suspended).toBe(false);
                        expect($location.path()).toBe('/foo');
                    }));

                    it('should unsuspend navigation and navigate after promise is rejected.', inject(function (clPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();
                        defer2.reject();
                        $rootScope.$apply();

                        expect(clPreventNav.suspended).toBe(false);
                        expect($location.path()).toBe('');
                    }));
                });

                describe('and ALL the "checkFn" are returning false', function () {

                    beforeEach(inject(function (clPreventNav, $q) {
                        clPreventNav.addInterceptor(function () {
                            return false;
                        }, handleFn);
                        clPreventNav.addInterceptor(function () {
                            return false;
                        }, handleFn2);
                    }));

                    it('should invoke the "handleFn" of the FIRST blocking check.', inject(function (clPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).toHaveBeenCalled();
                        expect(handleFn2).not.toHaveBeenCalled();
                    }));

                    describe('and the promise of the first "handleFn" is rejected', function () {

                        beforeEach(inject(function ($location, $rootScope) {
                            $location.path('/foo');
                            $rootScope.$apply();
                            defer.reject();
                            $rootScope.$apply();
                        }));

                        it('should unsuspend navigation and NOT navigate.', inject(function (clPreventNav, $rootScope, $location)  {

                            expect(clPreventNav.suspended).toBe(false);
                            expect($location.path()).toBe('');
                        }));
                    });

                    describe('and the promise of the first "handleFn" is resolved', function () {

                        beforeEach(inject(function ($location, $rootScope) {
                            $location.path('/foo');
                            $rootScope.$apply();
                            defer.resolve();
                            $rootScope.$apply();
                        }));

                        it('should invoke the "handleFn" of the SECOND blocking check.', inject(function (clPreventNav, $rootScope, $location)  {

                            expect(handleFn2).toHaveBeenCalled();
                        }));

                        describe('and the promise of the second "handleFn" is also resolved', function () {

                            beforeEach(inject(function ($location, $rootScope) {
                                $location.path('/foo');
                                $rootScope.$apply();
                                defer.resolve();
                                $rootScope.$apply();
                                defer2.resolve();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation and navigate.', inject(function (clPreventNav, $rootScope, $location)  {

                                expect(clPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));

                        });

                        describe('and the promise of the second "handleFn" is rejected', function () {

                            beforeEach(inject(function ($location, $rootScope) {
                                $location.path('/foo');
                                $rootScope.$apply();
                                defer.resolve();
                                $rootScope.$apply();
                                defer2.resolve();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation and NOT navigate.', inject(function (clPreventNav, $rootScope, $location)  {

                                expect(clPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));

                        });
                    });
                });
            });
        });
    });
});

