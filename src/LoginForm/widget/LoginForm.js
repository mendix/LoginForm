/*global mx, mxui, mendix, dojo, require, console, define, module, logger, window, setTimeout */
/**

	LoginForm
	========================

	@file      : LoginForm.js
	@version   : 3.2.0
	@author    : Richard Edens, Roeland Salij, J.W. Lagendijk
	@date      : 22-08-2014
	@copyright : Mendix Technology BV
	@license   : Apache License, Version 2.0, January 2004

	Documentation
    ========================
	A custom login form which can be used as an alternative to the default Mendix login page.

*/

(function() {
    'use strict';

    require([

        'mxui/widget/_WidgetBase', 'dijit/_Widget', 'dijit/_TemplatedMixin',
        'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/on', 'dojo/_base/lang', 'dojo/_base/declare', 'dojo/text', 'dojo/dom-attr', 'dojo/request/xhr', 'dojo/_base/json',
        'dojo/_base/event', 'dojo/_base/window'

    ], function (_WidgetBase, _Widget, _Templated, domMx, dom, domQuery, domProp, domGeom, domClass, domConstruct, domStyle, on, lang, declare, text, attr, xhr, dojoJSON, event, win) {

        // Provide widget.
        dojo.provide('LoginForm.widget.LoginForm');

        // Declare widget.
        return declare('LoginForm.widget.LoginForm', [ _WidgetBase, _Widget, _Templated ], {

            /**
             * Internal variables.
             * ======================
             */
            _handle: null,

            // Extra variables
            _userInput : null,
            _passInput : null,
            _captionShow : null,
            _captionHide : null,

            _indicator : null,
            _i18nmap : null,

            // Template path
            templatePath: require.toUrl('LoginForm/widget/templates/LoginForm.html'),

            /**
             * Mendix Widget methods.
             * ======================
             */

            // DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
            postCreate: function () {

                // Setup widgets
                this._setupWidget();

                // Setup events
                this._setupEvents();

            },

            // DOJO.WidgetBase -> Startup is fired after the properties of the widget are set.
            startup: function () {

            },

            /**
             * What to do when data is loaded?
             */

            update: function (obj, callback) {

                // Execute callback.
                if (typeof callback !== 'undefined') {
                    callback();
                }
            },

            unintialize: function () {

            },


            /**
             * Extra setup widget methods.
             * ======================
             */
            _setupWidget: function () {
                var templateWithView = null,
                    templateWithoutView = null;

                if (this.showImage){
                    this._captionShow = '<img src="' + this.showImage + '" id="' + this.id + '_image" />';
                } else {
                    this._captionShow = '';
                }
                if (this.hideImage){
                    this._captionHide = '<img src="' + this.hideImage + '" id="' + this.id + '_image" />';
                } else {
                    this._captionHide = '';
                }

                if (this.showButtonCaption != '') {
                    if (this.showImage) {
                        this._captionShow += '&nbsp;';
                    }
                    this._captionShow += this.showButtonCaption;
                }

                if (this.hideButtonCaption != '') {
                    if (this.hideImage) {
                        this._captionHide += '&nbsp;';
                    }
                    this._captionHide += this.hideButtonCaption;
                }

                templateWithView =      '<div class="input-group">' +
                                            '    <input type="password" class="form-control password" id="' + this.id + '_password" />' +
                                            '    <div class="input-group-addon" id="' + this.id + '_view">' + this._captionShow + '</div>' +
                                            '</div>';
                templateWithoutView =   '<input type="password" class="form-control password" id="' + this.id + '_password" />';

                //Setup controls
                this._userInput = this.usernameInput;
                attr.set(this._userInput, 'placeholder', this.userexample);

                if(this.showPasswordView === false){
                    this.passwordContainer.innerHTML = templateWithoutView;
                } else {
                    this.passwordContainer.innerHTML = templateWithView;
                    this.connect(dom.byId(this.id + '_view'), 'click', dojo.hitch(this, function(){
                        if (attr.get(this._passInput, 'type') === 'password') {
                            attr.set(this._passInput, 'type', 'text');
                            dom.byId(this.id + '_view').innerHTML = this._captionHide;
                        } else {
                            attr.set(this._passInput, 'type', 'password');
                            dom.byId(this.id + '_view').innerHTML = this._captionShow;
                        }
                    }));
                }
                this._passInput = dom.byId(this.id + '_password');

                attr.set(this._passInput, 'placeholder', this.passexample);

                if(this.autoCorrect){
                    attr.set(this._userInput, 'autocorrect', 'on');
                }
                if(this.autoCapitalize){
                    attr.set(this._userInput, 'autocapitalize', 'on');
                }

                if (this.convertCase === "toLowerCase"){
                	attr.set(this._userInput, 'onChange', 'javascript:this.value = this.value.toLowerCase();');
                } else if(this.convertCase === "toUpperCase"){
                  attr.set(this._userInput, 'onChange', 'javascript:this.value = this.value.toUpperCase();');
                }


                // Setup text input elements
                this.submitButton.value = this.logintext;

                if (this.forgotmf) {
                    this.forgotLink.innerHTML = this.forgottext;
                } else {
                    domStyle.set(this.forgotPane, 'display', 'none');
                }

                domStyle.set(this.messageNode, 'display', 'none');

                this._getI18NMap();

                if (this.showprogress) {
                    this._indicator = mx.ui.getProgress(this.progresstext);
                }

                if (typeof this.dofocus !== 'undefined' && this.dofocus) {
                    this._focusNode();
                }

            },


            // Attach events to newly created nodes.
            _setupEvents: function () {

                on(this.submitButton, 'click', lang.hitch(this, function(e) {

                    var user = null,
                        pass = null,
                        promise = null;

                    domStyle.set(this.messageNode, 'display', 'none');

                    if (attr.get(this._passInput, 'type') === 'text') {
                        attr.set(this._passInput, 'type', 'password');
                        dom.byId(this.id + '_view').innerHTML = this._captionShow;
                    }

                    logger.debug(this.id + '.submitForm');

                    user = this._userInput.value;
                    pass = this._passInput.value;

                    if(user && pass) {
                        if (typeof this._indicator !== 'undefined' && this._indicator){
                            this._indicator.start();
                        }

                        dojo.rawXhrPost({
                            url			: mx.baseUrl,
                            mimetype	: 'application/json',
                            contentType	: 'application/json',
                            handleAs	: 'json',
                            headers     : {
                                'csrfToken' : mx.session.getCSRFToken()
                            },
                            postData	: dojoJSON.toJson({
                                action		: "login",
                                params		: {
                                    username	: user,
                                    password	: pass,
                                    locale		: ""
                                }
                            }),
                            handle		: lang.hitch(this, this._validate)
                        });

                    } else {
                        domStyle.set(this.messageNode, 'display', 'block');
                        this.messageNode.innerHTML = this.emptytext;
                    }

                    event.stop(e);

                    return false;

                }));

                if(this.forgotmf)
                {
                    on(this.forgotLink, 'click', lang.hitch(this, function(e) {
                        logger.debug(this.id + '.forgotPwd');

                        var action = this.forgotmf;

                        if(action) {
                            mx.data.action({
                                params       : {
                                    actionname : action
                                },
                                callback	: function() {
                                    // ok
                                },
                                error		: function() {
                                    logger.error(this.id + '.forgotPwd: Error while calling microflow');
                                }
                            });
                        }

                        event.stop(e);
                    }));
                }
            },


            /**
             * Interaction widget methods.
             * ======================
             */
            _loadData: function () {
                // TODO, get aditional data from mendix.
            },

            _validate : function(response, ioArgs) {
                var i18nmap = null,
                    span = null,
                    message = ' ';

                logger.debug(this.id + '.validate');

                if (typeof this._indicator !== 'undefined' && this._indicator) {
                    this._indicator.stop();
                }

                i18nmap = this._i18nmap;

                switch(ioArgs.xhr.status) {
                    case 200 :
                        mx.login();
                        return;
                    case 400 :
                    case 401 :
                        message += i18nmap.http401;
                        break;
                    case 402 :
                    case 403 :
                        message += i18nmap.http401;
                        break;
                    case 404 :
                        message += i18nmap.http404;
                        break;
                    case 500 :
                        message += i18nmap.http500;
                        break;
                    case 503 :
                        message += i18nmap.http503;
                        break;
                    default :
                        message += i18nmap.httpdefault;
                        break;
                }

                this.messageNode.innerHTML = message; // is only reached when xhrstatus !== 200
                domStyle.set(this.messageNode, 'display', 'block');
            },

            _getI18NMap : function() {
                logger.debug(this.id + '.injectI18NMap');

                if (!window.i18n) {
                    dojo.xhrGet({
                        url			: mx.appUrl + 'js/login_i18n.js',
                        handleAs	: 'javascript',
                        sync		: true
                    });
                }

                this._i18nmap = window.i18nMap;
            },

            _focusNode : function() {
                logger.debug(this.id + '.focusNode');

                setTimeout(lang.hitch(this, function() {
                    this.usernameInput.focus();
                }), 0);
            }

        });
    });

}());
