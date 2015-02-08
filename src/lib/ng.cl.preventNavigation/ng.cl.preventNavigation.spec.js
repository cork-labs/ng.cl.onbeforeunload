describe('ng.cl.preventNavigation', function () {
    'use strict';

    beforeEach(module('ng.cl.preventNavigation'));

    var clPreventNavigationProvider;
    beforeEach(function () {
        module(function (_clPreventNavigationProvider_) {
            clPreventNavigationProvider = _clPreventNavigationProvider_;
        });
    });

    describe('clPreventNavigationProvider', function () {

        it('should initialize with known defaults.', inject(function (clPreventNavigation) {

            var dlgHeader = 'Warning:';
            var msgPrefix = ' - ';
            var defaultMsg = 'All changes not yet saved will be lost.';

            expect(clPreventNavigation.dlgHeader).toBe(dlgHeader);
            expect(clPreventNavigation.msgPrefix).toBe(msgPrefix);
            expect(clPreventNavigation.defaultMsg).toBe(defaultMsg);
        }));

        describe('configure()', function () {

            it('should store the provided configuration.', inject(function (clPreventNavigation) {

                var dlgHeader = 'foo';
                var msgPrefix = 'bar';
                var defaultMsg = 'baz';

                clPreventNavigationProvider.configure({
                    dlgHeader: dlgHeader,
                    msgPrefix: msgPrefix,
                    defaultMsg: defaultMsg
                });

                expect(clPreventNavigation.dlgHeader).toBe(dlgHeader);
                expect(clPreventNavigation.msgPrefix).toBe(msgPrefix);
                expect(clPreventNavigation.defaultMsg).toBe(defaultMsg);
            }));
        });
    });

    describe('clPreventNavigation', function () {

        describe('addInterceptor()', function () {

            it('should throw an error if CheckFn is not provided.', inject(function (clPreventNavigation)  {

                expect(function () {
                    clPreventNavigation.addInterceptor();
                }).toThrow('checkFn should be a function.');
            }));

            it('should throw an error if CheckFn is not a function.', inject(function (clPreventNavigation)  {

                expect(function () {
                    clPreventNavigation.addInterceptor('foo');
                }).toThrow('checkFn should be a function.');
            }));

            it('should return a deregistration function.', inject(function (clPreventNavigation)  {

                var fn = clPreventNavigation.addInterceptor(function () {});

                expect(typeof fn).toBe('function');
                // invoking it just to make sure there's no error
                fn();
            }));

        });

        describe('default state', function () {

            it('should have navigation enabled.', inject(function (clPreventNavigation)  {

                expect(clPreventNavigation.navigationEnabled).toBe(true);
            }));

            it('should NOT have navigation suspended.', inject(function (clPreventNavigation)  {

                expect(clPreventNavigation.navigationSuspended).toBe(false);
            }));

            it('should NOT have an empty list of messages.', inject(function (clPreventNavigation)  {

                expect(typeof clPreventNavigation.messages).toBe('object');
                expect(clPreventNavigation.messages.length).toBe(0);
            }));
        });

        describe('when an interceptor has been registered', function () {

            var checkFn;

            beforeEach(inject(function (clPreventNavigation) {
                checkFn = jasmine.createSpy('checkFn');
                clPreventNavigation.addInterceptor(checkFn);
            }));

            it('should should invoke it`s "checkFn" on every digest cycle.', inject(function (clPreventNavigation, $rootScope)  {

                $rootScope.$apply();

                expect(checkFn).toHaveBeenCalled();

                // initial call count is 2 because that's the way $scopes initialize
                // but we don't really care, just need to make sure it's called at least once per digest
                var callCount = checkFn.calls.length;

                $rootScope.$apply();

                expect(checkFn.calls.length).toBeGreaterThan(callCount);
            }));

            it('should NOT disable nagivation if the "checkFn" returns something "truthy".', inject(function (clPreventNavigation, $rootScope)  {

                checkFn.andReturn(true);

                $rootScope.$apply();

                expect(clPreventNavigation.navigationEnabled).toBe(true);
            }));

            it('should disable nagivation once the "checkFn" returns something "falsy".', inject(function (clPreventNavigation, $rootScope)  {

                clPreventNavigation.addInterceptor(function () {});

                $rootScope.$apply();

                expect(clPreventNavigation.navigationEnabled).toBe(false);
            }));

            it('should still disable nagivation even if another "checkFn" returns "truthy".', inject(function (clPreventNavigation, $rootScope)  {

                checkFn.andReturn(false);

                var checkFn2 = jasmine.createSpy('checkFn2');
                checkFn2.andReturn(true);
                clPreventNavigation.addInterceptor(checkFn2);

                $rootScope.$apply();

                expect(checkFn2).toHaveBeenCalled();
                expect(clPreventNavigation.navigationEnabled).toBe(false);
            }));

            it('should disable re-enable nagivation when all "checkFn" return "truthy".', inject(function (clPreventNavigation, $rootScope)  {

                $rootScope.$apply();
                checkFn.andReturn(true);

                $rootScope.$apply();

                expect(clPreventNavigation.navigationEnabled).toBe(true);
            }));
        });

        describe('when an interceptor is deregistered', function () {

            var checkFn;
            var deregister;

            beforeEach(inject(function (clPreventNavigation) {
                checkFn = jasmine.createSpy('checkFn');
                deregister = clPreventNavigation.addInterceptor(checkFn);
            }));

            it('should should NOT be invoked again.', inject(function (clPreventNavigation, $rootScope)  {

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

            beforeEach(inject(function (clPreventNavigation) {
                deregister = clPreventNavigation.addInterceptor(function () {});
            }));

            it('should should NOT throw any errors.', inject(function (clPreventNavigation, $rootScope)  {

                deregister();
                deregister();
            }));
        });

        describe('messages', function () {

            describe('when not interceptors ARE blocking', function () {

                beforeEach(inject(function (clPreventNavigation, $rootScope) {
                    clPreventNavigation.addInterceptor(function () {
                        return true;
                    }, null, 'message');
                    $rootScope.$apply();
                }));

                it('should have no active messages', inject(function (clPreventNavigation)  {

                    expect(clPreventNavigation.messages.length).toBe(0);
                }));
            });

            describe('when an interceptor without message is blocking', function () {

                beforeEach(inject(function (clPreventNavigation, $rootScope) {
                    clPreventNavigation.addInterceptor(function () {
                        return false;
                    });
                    $rootScope.$apply();
                }));

                it('should have one message, as configured', inject(function (clPreventNavigation)  {

                    expect(clPreventNavigation.messages.length).toBe(1);
                    expect(clPreventNavigation.messages[1]).toBe(clPreventNavigationProvider.defaultMsg);
                }));
            });

            describe('when an interceptor with an custom message is blocking', function () {

                var message = 'foobar';

                beforeEach(inject(function (clPreventNavigation, $rootScope) {
                    clPreventNavigation.addInterceptor(function () {
                        return false;
                    }, null, message);
                    $rootScope.$apply();
                }));

                it('should have one message, as provided with the interceptor', inject(function (clPreventNavigation)  {

                    expect(clPreventNavigation.messages.length).toBe(1);
                    expect(clPreventNavigation.messages[0]).toBe(message);
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

                beforeEach(inject(function (clPreventNavigation, $rootScope) {
                    clPreventNavigation.addInterceptor(function () {
                        return false;
                    });
                    $rootScope.$apply();
                }));

                it('should bind onbeforeunload', inject(function (clPreventNavigation, $rootScope)  {

                    expect(typeof $windowMock.onbeforeunload).toBe('function');
                }));

                it('should bind onbeforeunload', inject(function (clPreventNavigation, $rootScope)  {

                    var expected = 'Warning:\n\n - All changes not yet saved will be lost.\n';

                    expect($windowMock.onbeforeunload()).toBe(expected);
                }));
            });

            describe('when an interceptor blocks an unblocks', function () {

                var checkFn;

                beforeEach(inject(function (clPreventNavigation) {
                    checkFn = jasmine.createSpy('checkFn');
                    checkFn.andReturn(false);
                    clPreventNavigation.addInterceptor(checkFn);
                }));

                it('should unbind onbeforeunload', inject(function (clPreventNavigation, $rootScope)  {

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

                beforeEach(inject(function (clPreventNavigation) {
                    checkFn = jasmine.createSpy('checkFn');
                    handleFn = jasmine.createSpy('handleFn');
                    clPreventNavigation.addInterceptor(checkFn, handleFn);
                }));

                describe('and the "checkFn" is returning true', function () {

                    beforeEach(inject(function ($rootScope, $location) {
                        checkFn.andReturn(true);
                        $rootScope.$apply();
                        $location.path('/foo');
                        $rootScope.$apply();
                    }));

                    it('should NOT invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNavigation, $rootScope)  {

                        expect(handleFn).not.toHaveBeenCalled();
                    }));
                });

                describe('and the "checkFn" is returning false', function () {

                    beforeEach(inject(function ($rootScope) {
                        checkFn.andReturn(false);
                        $rootScope.$apply();
                    }));

                    it('should invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNavigation, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).toHaveBeenCalled();
                        expect(handleFn.calls.length).toBe(1);
                    }));

                    describe('and the "handleFn" returns nothing', function () {

                        it('should invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNavigation, $rootScope, $location)  {

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

                        it('should suspend navigation.', inject(function (clPreventNavigation, $rootScope, $location)  {

                            $location.path('/foo');
                            $rootScope.$apply();

                            expect(handleFn).toHaveBeenCalled();
                            expect(handleFn.calls.length).toBe(1);
                            expect(clPreventNavigation.navigationSuspended).toBe(true);
                            expect($location.path()).toBe('');
                        }));

                        describe('and the promise is resolved', function () {

                            beforeEach(inject(function ($q, $rootScope, $location) {
                                $location.path('/foo');
                                $rootScope.$apply();
                                defer.resolve();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation and navigate.', inject(function (clPreventNavigation, $rootScope, $location)  {

                                expect(clPreventNavigation.navigationSuspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));
                        });

                        describe('and the promise is rejected', function () {

                            beforeEach(inject(function ($q, $rootScope) {
                                defer.reject();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation an NOT navigate.', inject(function (clPreventNavigation, $rootScope, $location)  {

                                expect(clPreventNavigation.navigationSuspended).toBe(false);
                                expect($location.path()).toBe('');
                            }));
                        });
                    });
                });
            });

            describe('when more than one interceptor is registered, but only one provides a "handleFn" ', function () {

                var handleFn;

                beforeEach(inject(function (clPreventNavigation, $location, $rootScope) {
                    handleFn = jasmine.createSpy('handleFn');
                    clPreventNavigation.addInterceptor(function () {
                        return false;
                    });
                    clPreventNavigation.addInterceptor(function () {
                        return false;
                    }, handleFn);
                    $location.path('/foo');
                    $rootScope.$apply();
                }));

                describe('and the "checkFn" is returning false', function () {

                    it('should NOT invoke the "handleFn" after a $locationChanteStart event.', inject(function (clPreventNavigation, $rootScope)  {

                        expect(handleFn).not.toHaveBeenCalled();
                    }));

                    it('should NOT suspend navigation NOR navigate.', inject(function (clPreventNavigation, $rootScope, $location)  {

                        expect(clPreventNavigation.navigationSuspended).toBe(false);
                        expect($location.path()).toBe('');
                    }));
                });
            });

            describe('when more than one interceptor is registered, and ALL provide a "handleFn" ', function () {

                var handleFn;
                var handleFn2;
                var defer;
                var defer2;

                beforeEach(inject(function (clPreventNavigation, $q) {
                    handleFn = jasmine.createSpy('handleFn');
                    handleFn2 = jasmine.createSpy('handleFn2');
                    defer = $q.defer();
                    defer2 = $q.defer();
                    handleFn.andReturn(defer.promise);
                    handleFn2.andReturn(defer2.promise);
                }));

                describe('and only one of the "checkFn" is returning false', function () {

                    beforeEach(inject(function (clPreventNavigation, $q) {
                        clPreventNavigation.addInterceptor(function () {
                            return true;
                        }, handleFn);
                        clPreventNavigation.addInterceptor(function () {
                            return false;
                        }, handleFn2);
                    }));

                    it('should only invoke the "handleFn" of the blocking check.', inject(function (clPreventNavigation, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).not.toHaveBeenCalled();
                        expect(handleFn2).toHaveBeenCalled();
                    }));

                    it('should suspend navigation.', inject(function (clPreventNavigation, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(clPreventNavigation.navigationSuspended).toBe(true);
                        expect($location.path()).toBe('');
                    }));

                    it('should unsuspend navigation and navigate after promise is resolved.', inject(function (clPreventNavigation, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();
                        defer2.resolve();
                        $rootScope.$apply();

                        expect(clPreventNavigation.navigationSuspended).toBe(false);
                        expect($location.path()).toBe('/foo');
                    }));

                    it('should unsuspend navigation and navigate after promise is rejected.', inject(function (clPreventNavigation, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();
                        defer2.reject();
                        $rootScope.$apply();

                        expect(clPreventNavigation.navigationSuspended).toBe(false);
                        expect($location.path()).toBe('');
                    }));
                });

                describe('and ALL the "checkFn" are returning false', function () {

                    beforeEach(inject(function (clPreventNavigation, $q) {
                        clPreventNavigation.addInterceptor(function () {
                            return false;
                        }, handleFn);
                        clPreventNavigation.addInterceptor(function () {
                            return false;
                        }, handleFn2);
                    }));

                    it('should invoke the "handleFn" of the FIRST blocking check.', inject(function (clPreventNavigation, $rootScope, $location)  {

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

                        it('should unsuspend navigation and NOT navigate.', inject(function (clPreventNavigation, $rootScope, $location)  {

                            expect(clPreventNavigation.navigationSuspended).toBe(false);
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

                        it('should invoke the "handleFn" of the SECOND blocking check.', inject(function (clPreventNavigation, $rootScope, $location)  {

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

                            it('should unsuspend navigation and navigate.', inject(function (clPreventNavigation, $rootScope, $location)  {

                                expect(clPreventNavigation.navigationSuspended).toBe(false);
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

                            it('should unsuspend navigation and NOT navigate.', inject(function (clPreventNavigation, $rootScope, $location)  {

                                expect(clPreventNavigation.navigationSuspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));

                        });
                    });
                });
            });
        });
    });
});

