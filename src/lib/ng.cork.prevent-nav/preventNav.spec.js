describe('ng.cork.prevent-nav', function () {
    'use strict';

    beforeEach(module('ng.cork.prevent-nav'));

    var corkPreventNavProvider;
    beforeEach(function () {
        module(function (_corkPreventNavProvider_) {
            corkPreventNavProvider = _corkPreventNavProvider_;
        });
    });

    describe('corkPreventNavProvider', function () {

        it('should initialize with known defaults.', inject(function (corkPreventNav) {

            var dlgHeader = 'Warning:';
            var msgPrefix = ' - ';
            var defaultMsg = 'All changes not yet saved will be lost.';

            expect(corkPreventNav.dlgHeader).toBe(dlgHeader);
            expect(corkPreventNav.msgPrefix).toBe(msgPrefix);
            expect(corkPreventNav.defaultMsg).toBe(defaultMsg);
        }));

        describe('configure()', function () {

            it('should store the provided configuration.', inject(function (corkPreventNav) {

                var dlgHeader = 'foo';
                var msgPrefix = 'bar';
                var defaultMsg = 'baz';

                corkPreventNavProvider.configure({
                    dlgHeader: dlgHeader,
                    msgPrefix: msgPrefix,
                    defaultMsg: defaultMsg
                });

                expect(corkPreventNav.dlgHeader).toBe(dlgHeader);
                expect(corkPreventNav.msgPrefix).toBe(msgPrefix);
                expect(corkPreventNav.defaultMsg).toBe(defaultMsg);
            }));
        });
    });

    describe('corkPreventNav', function () {

        describe('addInterceptor()', function () {

            it('should throw an error if CheckFn is not provided.', inject(function (corkPreventNav)  {

                expect(function () {
                    corkPreventNav.addInterceptor();
                }).toThrow(new Error('checkFn should be a function.'));
            }));

            it('should throw an error if CheckFn is not a function.', inject(function (corkPreventNav)  {

                expect(function () {
                    corkPreventNav.addInterceptor('foo');
                }).toThrow(new Error('checkFn should be a function.'));
            }));

            it('should return a deregistration function.', inject(function (corkPreventNav)  {

                var fn = corkPreventNav.addInterceptor(function () {});

                expect(typeof fn).toBe('function');
                // invoking it just to make sure there's no error
                fn();
            }));

        });

        describe('default state', function () {

            it('should have navigation enabled.', inject(function (corkPreventNav)  {

                expect(corkPreventNav.prevented).toBe(false);
            }));

            it('should NOT have navigation suspended.', inject(function (corkPreventNav)  {

                expect(corkPreventNav.suspended).toBe(false);
            }));

            it('should NOT have an empty list of messages.', inject(function (corkPreventNav)  {

                expect(typeof corkPreventNav.messages).toBe('object');
                expect(corkPreventNav.messages.length).toBe(0);
            }));
        });

        describe('when an interceptor has been registered', function () {

            var checkFn;

            beforeEach(inject(function (corkPreventNav) {
                checkFn = jasmine.createSpy('checkFn');
                corkPreventNav.addInterceptor(checkFn);
            }));

            it('should should invoke it`s "checkFn" on every digest cycle.', inject(function (corkPreventNav, $rootScope)  {

                $rootScope.$apply();

                expect(checkFn).toHaveBeenCalled();

                // initial call count is 2 because that's the way $scopes initialize
                // but we don't really care, just need to make sure it's called at least once per digest
                var callCount = checkFn.calls.count();

                $rootScope.$apply();

                expect(checkFn.calls.count()).toBeGreaterThan(callCount);
            }));

            it('should NOT disable nagivation if the "checkFn" returns something "truthy".', inject(function (corkPreventNav, $rootScope)  {

                checkFn.and.returnValue(true);

                $rootScope.$apply();

                expect(corkPreventNav.prevented).toBe(false);
            }));

            it('should disable nagivation once the "checkFn" returns something "falsy".', inject(function (corkPreventNav, $rootScope)  {

                corkPreventNav.addInterceptor(function () {});

                $rootScope.$apply();

                expect(corkPreventNav.prevented).toBe(true);
            }));

            it('should still disable nagivation even if another "checkFn" returns "truthy".', inject(function (corkPreventNav, $rootScope)  {

                checkFn.and.returnValue(false);

                var checkFn2 = jasmine.createSpy('checkFn2');
                checkFn2.and.returnValue(true);
                corkPreventNav.addInterceptor(checkFn2);

                $rootScope.$apply();

                expect(checkFn2).toHaveBeenCalled();
                expect(corkPreventNav.prevented).toBe(true);
            }));

            it('should disable re-enable nagivation when all "checkFn" return "truthy".', inject(function (corkPreventNav, $rootScope)  {

                $rootScope.$apply();
                checkFn.and.returnValue(true);

                $rootScope.$apply();

                expect(corkPreventNav.prevented).toBe(false);
            }));
        });

        describe('when an interceptor is deregistered', function () {

            var checkFn;
            var deregister;

            beforeEach(inject(function (corkPreventNav) {
                checkFn = jasmine.createSpy('checkFn');
                deregister = corkPreventNav.addInterceptor(checkFn);
            }));

            it('should should NOT be invoked again.', inject(function (corkPreventNav, $rootScope)  {

                $rootScope.$apply();

                expect(checkFn).toHaveBeenCalled();

                // initial call count is 2 because that's the way $scopes initialize
                // but we don't really care, just need to make sure it's NOT called again
                var callCount = checkFn.calls.count();

                deregister();

                $rootScope.$apply();

                expect(checkFn.calls.count()).toBe(callCount);
            }));
        });

        describe('when an unknown interceptor is deregistered', function () {

            var deregister;

            beforeEach(inject(function (corkPreventNav) {
                deregister = corkPreventNav.addInterceptor(function () {});
            }));

            it('should should NOT throw any errors.', inject(function (corkPreventNav, $rootScope)  {

                deregister();
                deregister();
            }));
        });

        describe('messages', function () {

            describe('when not interceptors ARE blocking', function () {

                beforeEach(inject(function (corkPreventNav, $rootScope) {
                    corkPreventNav.addInterceptor(function () {
                        return true;
                    }, null, 'message');
                    $rootScope.$apply();
                }));

                it('should have no active messages', inject(function (corkPreventNav)  {

                    expect(corkPreventNav.messages.length).toBe(0);
                }));
            });

            describe('when an interceptor without message is blocking', function () {

                beforeEach(inject(function (corkPreventNav, $rootScope) {
                    corkPreventNav.addInterceptor(function () {
                        return false;
                    });
                    $rootScope.$apply();
                }));

                it('should have one message, as configured', inject(function (corkPreventNav)  {

                    expect(corkPreventNav.messages.length).toBe(1);
                    expect(corkPreventNav.messages[1]).toBe(corkPreventNavProvider.defaultMsg);
                }));
            });

            describe('when an interceptor with an custom message is blocking', function () {

                var message = 'foobar';

                beforeEach(inject(function (corkPreventNav, $rootScope) {
                    corkPreventNav.addInterceptor(function () {
                        return false;
                    }, null, message);
                    $rootScope.$apply();
                }));

                it('should have one message, as provided with the interceptor', inject(function (corkPreventNav)  {

                    expect(corkPreventNav.messages.length).toBe(1);
                    expect(corkPreventNav.messages[0]).toBe(message);
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

                beforeEach(inject(function (corkPreventNav, $rootScope) {
                    corkPreventNav.addInterceptor(function () {
                        return false;
                    });
                    $rootScope.$apply();
                }));

                it('should bind onbeforeunload', inject(function (corkPreventNav, $rootScope)  {

                    expect(typeof $windowMock.onbeforeunload).toBe('function');
                }));

                it('should bind onbeforeunload', inject(function (corkPreventNav, $rootScope)  {

                    var expected = 'Warning:\n\n - All changes not yet saved will be lost.\n';

                    expect($windowMock.onbeforeunload()).toBe(expected);
                }));
            });

            describe('when an interceptor blocks an unblocks', function () {

                var checkFn;

                beforeEach(inject(function (corkPreventNav) {
                    checkFn = jasmine.createSpy('checkFn');
                    checkFn.and.returnValue(false);
                    corkPreventNav.addInterceptor(checkFn);
                }));

                it('should unbind onbeforeunload', inject(function (corkPreventNav, $rootScope)  {

                    checkFn.and.returnValue(false);
                    $rootScope.$apply();

                    expect(typeof $windowMock.onbeforeunload).toBe('function');

                    checkFn.and.returnValue(true);
                    $rootScope.$apply();

                    expect($windowMock.onbeforeunload).toBeNull();
                }));
            });
        });

        describe('async handlers', function () {

            describe('when an interceptor with a "handleFn" is registered', function () {

                var checkFn;
                var handleFn;

                beforeEach(inject(function (corkPreventNav) {
                    checkFn = jasmine.createSpy('checkFn');
                    handleFn = jasmine.createSpy('handleFn');
                    corkPreventNav.addInterceptor(checkFn, handleFn);
                }));

                describe('and the "checkFn" is returning true', function () {

                    beforeEach(inject(function ($rootScope, $location) {
                        checkFn.and.returnValue(true);
                        $rootScope.$apply();
                        $location.path('/foo');
                        $rootScope.$apply();
                    }));

                    it('should NOT invoke the "handleFn" after a $locationChanteStart event.', inject(function (corkPreventNav, $rootScope)  {

                        expect(handleFn).not.toHaveBeenCalled();
                    }));
                });

                describe('and the "checkFn" is returning false', function () {

                    beforeEach(inject(function ($rootScope) {
                        checkFn.and.returnValue(false);
                        $rootScope.$apply();
                    }));

                    it('should invoke the "handleFn" after a $locationChanteStart event.', inject(function (corkPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).toHaveBeenCalled();
                        expect(handleFn.calls.count()).toBe(1);
                    }));

                    describe('and the "handleFn" returns nothing', function () {

                        it('should invoke the "handleFn" after a $locationChanteStart event.', inject(function (corkPreventNav, $rootScope, $location)  {

                            $location.path('/foo');
                            $rootScope.$apply();

                            expect(handleFn).toHaveBeenCalled();
                            expect(handleFn.calls.count()).toBe(1);
                        }));
                    });

                    describe('and the "handleFn" returns a promise', function () {

                        var defer;

                        beforeEach(inject(function ($q) {
                            defer = $q.defer();
                            handleFn.and.returnValue(defer.promise);
                        }));

                        it('should suspend navigation.', inject(function (corkPreventNav, $rootScope, $location)  {

                            $location.path('/foo');
                            $rootScope.$apply();

                            expect(handleFn).toHaveBeenCalled();
                            expect(handleFn.calls.count()).toBe(1);
                            expect(corkPreventNav.suspended).toBe(true);
                            expect($location.path()).toBe('');
                        }));

                        describe('and the promise is resolved', function () {

                            beforeEach(inject(function ($q, $rootScope, $location) {
                                $location.path('/foo');
                                $rootScope.$apply();
                                defer.resolve();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation and navigate.', inject(function (corkPreventNav, $rootScope, $location)  {

                                expect(corkPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));
                        });

                        describe('and the promise is rejected', function () {

                            beforeEach(inject(function ($q, $rootScope) {
                                defer.reject();
                                $rootScope.$apply();
                            }));

                            it('should unsuspend navigation an NOT navigate.', inject(function (corkPreventNav, $rootScope, $location)  {

                                expect(corkPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('');
                            }));
                        });
                    });
                });
            });

            describe('when more than one interceptor is registered, but only one provides a "handleFn" ', function () {

                var handleFn;

                beforeEach(inject(function (corkPreventNav, $location, $rootScope) {
                    handleFn = jasmine.createSpy('handleFn');
                    corkPreventNav.addInterceptor(function () {
                        return false;
                    });
                    corkPreventNav.addInterceptor(function () {
                        return false;
                    }, handleFn);
                    $location.path('/foo');
                    $rootScope.$apply();
                }));

                describe('and the "checkFn" is returning false', function () {

                    it('should NOT invoke the "handleFn" after a $locationChanteStart event.', inject(function (corkPreventNav, $rootScope)  {

                        expect(handleFn).not.toHaveBeenCalled();
                    }));

                    it('should NOT suspend navigation NOR navigate.', inject(function (corkPreventNav, $rootScope, $location)  {

                        expect(corkPreventNav.suspended).toBe(false);
                        expect($location.path()).toBe('');
                    }));
                });
            });

            describe('when more than one interceptor is registered, and ALL provide a "handleFn" ', function () {

                var handleFn;
                var handleFn2;
                var defer;
                var defer2;

                beforeEach(inject(function (corkPreventNav, $q) {
                    handleFn = jasmine.createSpy('handleFn');
                    handleFn2 = jasmine.createSpy('handleFn2');
                    defer = $q.defer();
                    defer2 = $q.defer();
                    handleFn.and.returnValue(defer.promise);
                    handleFn2.and.returnValue(defer2.promise);
                }));

                describe('and only one of the "checkFn" is returning false', function () {

                    beforeEach(inject(function (corkPreventNav, $q) {
                        corkPreventNav.addInterceptor(function () {
                            return true;
                        }, handleFn);
                        corkPreventNav.addInterceptor(function () {
                            return false;
                        }, handleFn2);
                    }));

                    it('should only invoke the "handleFn" of the blocking check.', inject(function (corkPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(handleFn).not.toHaveBeenCalled();
                        expect(handleFn2).toHaveBeenCalled();
                    }));

                    it('should suspend navigation.', inject(function (corkPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();

                        expect(corkPreventNav.suspended).toBe(true);
                        expect($location.path()).toBe('');
                    }));

                    it('should unsuspend navigation and navigate after promise is resolved.', inject(function (corkPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();
                        defer2.resolve();
                        $rootScope.$apply();

                        expect(corkPreventNav.suspended).toBe(false);
                        expect($location.path()).toBe('/foo');
                    }));

                    it('should unsuspend navigation and navigate after promise is rejected.', inject(function (corkPreventNav, $rootScope, $location)  {

                        $location.path('/foo');
                        $rootScope.$apply();
                        defer2.reject();
                        $rootScope.$apply();

                        expect(corkPreventNav.suspended).toBe(false);
                        expect($location.path()).toBe('');
                    }));
                });

                describe('and ALL the "checkFn" are returning false', function () {

                    beforeEach(inject(function (corkPreventNav, $q) {
                        corkPreventNav.addInterceptor(function () {
                            return false;
                        }, handleFn);
                        corkPreventNav.addInterceptor(function () {
                            return false;
                        }, handleFn2);
                    }));

                    it('should invoke the "handleFn" of the FIRST blocking check.', inject(function (corkPreventNav, $rootScope, $location)  {

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

                        it('should unsuspend navigation and NOT navigate.', inject(function (corkPreventNav, $rootScope, $location)  {

                            expect(corkPreventNav.suspended).toBe(false);
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

                        it('should invoke the "handleFn" of the SECOND blocking check.', inject(function (corkPreventNav, $rootScope, $location)  {

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

                            it('should unsuspend navigation and navigate.', inject(function (corkPreventNav, $rootScope, $location)  {

                                expect(corkPreventNav.suspended).toBe(false);
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

                            it('should unsuspend navigation and NOT navigate.', inject(function (corkPreventNav, $rootScope, $location)  {

                                expect(corkPreventNav.suspended).toBe(false);
                                expect($location.path()).toBe('/foo');
                            }));

                        });
                    });
                });
            });
        });
    });
});
