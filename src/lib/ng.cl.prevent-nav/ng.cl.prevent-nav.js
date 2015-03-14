(function (angular) {
    'use strict';

    var module = angular.module('ng.cl.prevent-nav', []);

    /**
     * @param {array} Array the array to modify
     * @param {*} value The value to remove
     */
    function arrayRemove(array, value) {
        var index = array.indexOf(value);
        if (index >= 0) {
            array.splice(index, 1);
        }
        return value;
    }

    /**
     * accepts a list of functions and returns a promise
     * executes the functions one by one, expecting all to return a promise
     * only moves to the next function if the the previous promise is resolved
     *
     * @param {object}
     * @returns {Promise} rejected if at least one promise is rejected, resolved if list empty OR all promises are resolved
     */
    function executeSeries($q, series) {
        var deferred = $q.defer();

        // copy, prevents further modification of the list
        var calls = series.slice();
        var executeNext = function (index) {
            $q.all([calls[index]()]).then(function () {
                var nextIndex = index + 1;
                if (nextIndex < calls.length) {
                    executeNext(nextIndex);
                } else {
                    deferred.resolve();
                }
            }, function () {
                deferred.reject();
            });

        };
        executeNext(0);

        return deferred.promise;
    }

    /**
     * @ngdoc object
     * @name ng.cl.prevent-nav.clPreventNavProvider
     *
     * @description
     * Allows the {@link ng.cl.prevent-nav.clPreventNav clPreventNav} service to be configured.
     */
    module.provider('clPreventNav', [

        function clPreventNavProvider() {

            /**
             * @type {Object} provider configuration.
             */
            var serviceConfig = {
                dlgHeader: 'Warning:',
                msgPrefix: ' - ',
                defaultMsg: 'All changes not yet saved will be lost.'
            };

            /**
             * @ngdoc function
             * @name configure
             * @methodOf ng.cl.prevent-nav.clPreventNavProvider
             *
             * @description
             * Configures the {@link ng.cl.prevent-nav.clPreventNav clPreventNav} service.
             *
             * @param {Object} config Object with configuration options, extends base configuration.
             * ```
             *    {
             *        // window.onbeforeunload header. Default: "Warning:"
             *        dlgHeader: <STRING>,
             *        // window.onbeforeunload msg prefix. Default: " - "
             *        msgPrefix: <STRING>,
             *        // displayed when navigation is disabled but no
             *        // interceptors have set a message.
             *        // Default: "All changes not yet saved will be lost."
             *        defaultMsg: <STRING>
             *    }
             * ```
             */
            this.configure = function (config) {
                angular.extend(serviceConfig, config);
            };

            /**
             * @ngdoc object
             * @name ng.cl.prevent-nav.clPreventNav
             *
             * @description
             * Provides a `addInterceptor()` method to register check functions to enable/disable navigation, allowing
             * decoupled components to delegate this responsibility to this service.
             *
             * The interceptors can also register a `handleFn` function to to act upon a cancelled navigation. These
             * functions should return a promise and resolve/reject if it is ok to resume navigation to the cancelled `path`.
             *
             * **Note:** mutiple
             *
             * If the client decides to resume navigation it can do so via `resumeNavigation()` without having to worry
             * about which `path` was cancelled in the first place.
             *
             * Finally, whenever at least one of these checks is returning `false` the service binds the
             * `window.onbeforeunload` event too, giving the user the chance to cancel accidental navigation (ex: when
             * refreshing the page, using the back button or modifying the URL directly in the browser address bar).
             *
             * @property {boolean} prevented  **Boolean** *Read-only* Whether navigation is enabled or being prevented by an interceptor.
             * @property {boolean} suspended  **Boolean** *Read-only* Whether a navigation event was prevented and the existing `handleFn` series did not reject/resolve.
             * @property {array}   messages   **Array**   *Read-only* The list of messages (reasons) why navigation is disabled, if any.
             * @property {string}  dlgHeader  **String**  *Read-only* The configured dialog header.
             * @property {string}  msgPrefix  **String**  *Read-only* The configured message prefix.
             * @property {string}  defaultMsg **String**  *Read-only* The configured default message.
             */
            this.$get = [
                '$rootScope',
                '$q',
                '$window',
                '$location',
                function clPreventNav($rootScope, $q, $window, $location) {

                    /**
                     * @var {array} stores the current active interceptors
                     */
                    var interceptors = [];

                    /**
                     * @var {function} stores watch deregistration function
                     */
                    var unwatch = null;

                    /**
                     * @var {boolean} becomes true if at least one interceptor checkFn returns false
                     */
                    var prevented = false;

                    /**
                     * @var {boolean} becomes true when a cancelled $locationChangeStart event is prevented by at least
                     *                  one checkFn AND at least one handleFn has been registered
                     *                resets back to null when the handleFn series is rejected/resolved
                     */
                    var suspended = false;

                    /**
                     * @var {string} becomes set with the target path of a cancelled $locationChangeStart event when it
                     *                 was prevented by at least one checkFn AND at least one handleFn has been registered
                     *               resets back to null when the handleFn series is rejected OR the handleFn series is
                     *                 resolved and navigation proceeds to suspendedPath (on the next digest cycle)
                     */
                    var suspendedPath;

                    /**
                     * @var {boolean} becomes true when all handleFn resolve their promises and resets back to false
                     *                  after the $location.path() is set to suspendedPath (on the next digst cycle)
                     */
                    var navigationResumed = false;

                    /**
                     * @var {array} stores the active interceptors messages
                     */
                    var messages = [];

                    /**
                     * executed on digest cycle (when at least one interceptor is set)
                     * - disables navigation if at least one of the registered interceptors returns falsy
                     * - updates the list of messages for the active interceptors
                     */
                    function updateNavigationEnabled() {
                        var ix;
                        var interceptor;
                        // reset
                        prevented = false;
                        messages.length = 0;
                        // check all interceptors
                        for (ix = 0; ix < interceptors.length; ix++) {
                            interceptor = interceptors[ix];
                            // computer says no
                            if (!interceptor.checkFn()) {
                                prevented = true;
                                if (interceptor.message) {
                                    messages.push(interceptor.message);
                                }
                            }
                        }
                        if (prevented && !messages.length) {
                            messages = [serviceConfig.defaultMsg];
                        }
                        return prevented;
                    }

                    function onbeforeunload() {
                        var body = '';
                        for (var ix = 0; ix < messages.length; ix++) {
                            body += serviceConfig.msgPrefix + messages[ix] + '\n';
                        }
                        return (serviceConfig.dlgHeader ? serviceConfig.dlgHeader + '\n\n' : '') + body;
                    }

                    /**
                     * if navigation is disabled, setup onbeforeunload
                     */
                    function updateOnbeforeunload() {
                        $window.onbeforeunload = prevented ? onbeforeunload : null;
                    }

                    var serviceApi = {

                        /**
                         * @ngdoc method
                         * @name addInterceptor
                         * @methodOf ng.cl.prevent-nav.clPreventNav
                         *
                         * @description
                         * Registers an interceptor to be executed before route changes. Interceptors can accept or reject the
                         * route change synchronously by returning a boolean.
                         *
                         * Optionally, they can also provide a handler function to handle a suspended `$locationChangeStart`
                         * event asynchronously. This handler should return a promise and accept or reject it depending
                         * on whether it is ok to resume navigation to the cancelled `path`.
                         *
                         * Optionally, they can also provide a message to decorate the return value of the
                         * `window.onbeforeunload` event handler.
                         *
                         * @param {Function} checkFn  The check function.
                         * @param {Function} handleFn A handler function, invoked when '$locationChangeStart' is cancelled.
                         * @param {string=}  message  An optional message to show on window close event.
                         * @returns {Function} A deregistration function for this interceptor.
                         */
                        addInterceptor: function (checkFn, handleFn, message) {
                            if (!angular.isFunction(checkFn)) {
                                throw new Error('checkFn should be a function.');
                            }
                            var interceptor = {
                                checkFn: checkFn,
                                handleFn: handleFn,
                                message: message
                            };
                            interceptors.push(interceptor);
                            if (interceptors.length && unwatch === null) {
                                // enable digest
                                unwatch = $rootScope.$watch(updateNavigationEnabled, updateOnbeforeunload);
                            }
                            return function () {
                                arrayRemove(interceptors, interceptor);
                                if (!interceptors.length && unwatch) {
                                    // disabled digest
                                    unwatch();
                                    unwatch = null;
                                }
                            };
                        }
                    };

                    /**
                     * see https://github.com/angular/angular.js/issues/5094 for "interesting" limitations of $location and synchronous events
                     */
                    $rootScope.$on('$locationChangeStart', function (event, current, next) {
                        var path = $location.path();

                        // ignoring initialization with ''
                        if (path === '') {
                            return;
                        }
                        // if a previous navigation has been suspended and not resolved/rejected yet, cancel it again
                        if (suspended) {
                            event.preventDefault();
                        }
                        // if navigation is currently disabled, cancel the location change
                        else if (prevented && suspendedPath !== path) {

                            // prevent navigation
                            // will set path back to original an smash history :-(
                            event.preventDefault();

                            // get all the handleFn registered with the interceptors
                            var allHandled = true;
                            var series = interceptors.filter(function (interceptor) {
                                return !interceptor.checkFn();
                            }).map(function (interceptor) {
                                allHandled = allHandled && angular.isFunction(interceptor.handleFn);
                                return interceptor.handleFn;
                            });
                            // if all the blocking interceptors have handler functions
                            if (allHandled && series.length) {
                                suspendedPath = path;
                                suspended = true;
                                executeSeries($q, series).then(function () {
                                    // if all resolve their promises, resume the location
                                    $location.path(suspendedPath);
                                    navigationResumed = true;
                                    suspended = false;
                                }, function () {
                                    suspendedPath = null;
                                    suspended = false;
                                });
                            }
                        }
                        // allow navigating to the suspended path
                        else if (suspendedPath && navigationResumed) {
                            $location.path(suspendedPath);
                            navigationResumed = false;
                            suspendedPath = null;
                        }
                    });

                    // -- read-only properties

                    /**
                     * minimizes slightly better than invoking directly
                     * @param {name} name of the property
                     * @param {fn} the accessor function
                     */
                    function addReadOnlyProperty(name, fn) {
                        Object.defineProperty(serviceApi, name, {
                            get: fn
                        });
                    }

                    addReadOnlyProperty('prevented', function () {
                        return prevented;
                    });
                    addReadOnlyProperty('suspended', function () {
                        return suspended;
                    });
                    addReadOnlyProperty('messages', function () {
                        return messages;
                    });
                    addReadOnlyProperty('dlgHeader', function () {
                        return serviceConfig.dlgHeader;
                    });
                    addReadOnlyProperty('msgPrefix', function () {
                        return serviceConfig.msgPrefix;
                    });
                    addReadOnlyProperty('defaultMsg', function () {
                        return serviceConfig.defaultMsg;
                    });

                    return serviceApi;
                }
            ];

        }
    ]);

})(angular);
