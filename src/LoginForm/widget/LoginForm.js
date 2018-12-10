/*jslint browser: true, devel:true, nomen:true, unparam:true, plusplus: true, regexp: true*/
/*global logger, mendix, define, mx, dojo, require*/
/**
 LoginForm
 ========================
 @file      : LoginForm.js
 @version   : 3.5.0
 @author    : Mendix
 @date      : 7/26/2016
 @copyright : Mendix B.V.
 @license   : Apache 2.0
 Documentation
 ========================
 A custom login form which can be used as an alternative to the default Mendix login page.
 */
// polyfill for trim functionality
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
}
define([

    "mxui/widget/_WidgetBase", "dijit/_TemplatedMixin", "mxui/dom",
    "dojo/dom", "dojo/query", "dojo/dom-class",
    "dojo/dom-construct", "dojo/dom-style", "dojo/on",
    "dojo/_base/lang", "dojo/_base/declare", "dojo/text",
    "dojo/dom-attr", "dojo/request/xhr", "dojo/json",
    "dojo/_base/event", "dojo/html", "dojo/has",
    "dojo/text!LoginForm/widget/templates/LoginForm.html",
    "dojo/text!LoginForm/widget/templates/LoginFormWithoutShowPassword.html", "dojo/sniff"

], function (_WidgetBase, _TemplatedMixin, dom,
             dojoDom, dojoQuery, domClass,
             domConstruct, domStyle, dojoOn,
             dojoLang, declare, text,
             domAttr, dojoXhr, dojoJSON,
             dojoEvent, dojoHtml, dojoHas,
             template, templateWithoutShowPassword) {
    "use strict";
    // Declare widget.
    return declare("LoginForm.widget.LoginForm", [ _WidgetBase, _TemplatedMixin ], {

        // Template path, set in the postMixInProperties function
        templateString: "",

        // DOM Elements
        loginFormNode: null,
        alertMessageNode: null,
        usernameInputNode: null,
        passwordContainerNode: null,
        passwordInputNode: null,
        passwordVisibilityToggleButtonNode: null,
        submitButtonNode: null,
        forgotPasswordNode: null,
        forgotPasswordLinkNode: null,
        usernameLabelNode: null,
        passwordLabelNode: null,

        // Parameters configured in the Modeler.
        /**
         * Display
         */
        userexample: "Username",
        passexample: "Password",
        logintext: "Login",
        progresstext: "",
        emptytext: "No username or password given",
        forgottext: "Forgot your password?",
        showLabels: false,
        usernameLabel: "User name",
        passwordLabel: "Password",
        /**
         * Behaviour
         */
        showprogress: false,
        clearPw: false,
        clearUn: false,
        forgotmf: "",
        dofocus: false,
        showLoginFailureWarning: false,
        loginFailureText: "Your account will be blocked for 5 minutes if login with the same username fails thrice!",
		autoComplete: false,
        /**
         * Password
         */
        showPasswordView: true,
        showButtonCaption: "Show",
        hideButtonCaption: "Mask",
        showImage: "",
        hideImage: "",
        /**
         * Mobile
         */
        autoCorrect: false,
        autoCapitalize: false,
        keyboardType: "text",
        /**
         * Case Handling
         */
        convertCase: "none",
        /**
         * Whitespace handing
         */
        trimPassword: false,
        trimUsername: false,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handle: null,
        _userInput : null,
        _passInput : null,
        _captionShow : "",
        _captionHide : "",
        _indicator : null,
        _i18nmap : null,
        _setup: false,
        _loginForm_FailedAttempts: 0,
        // dijit._WidgetBase.postMixInProperties is called before rendering occurs, and before any dom nodes are created.
        postMixInProperties: function () {
            logger.debug(this.id + ".postMixInProperties");
            if (this.showPasswordView === true) {
                this.templateString = template;
            } else {
                this.templateString = templateWithoutShowPassword;
            }
        },
        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this._getI18NMap();
            this._updateRendering();
            this._setupEvents();
        },
        // Rerender the interface.
        _updateRendering: function () {
            logger.debug(this.id + "._updateRendering");
            domClass.add(this.alertMessageNode, "hidden");
            this._addMobileOptions();
            this._showLabels();
            // Check if user wants to display the show-password toggle
            if (this.showPasswordView === true) {
                this._styleMaskPasswordButton();
                this._styleShowPasswordButton();
                domConstruct.place(this._captionShow, this.passwordVisibilityToggleButtonNode, "only");
            }

            this._setUsernameInputAttributes();
            this._forgotPasswordLink();

            // Captures focus for the input node. (Already automatically set, so can only if not done automatically)
            if (this.dofocus) {
                this._focusNode();
            }
        },
        /**
         * Conditionally sets the icon and caption of the show-password button
         * @private
         */
        _styleShowPasswordButton: function () {
            if (this.showImage) {
                this._captionShow = "<img src=\"" + this.showImage + "\" />";
            }

            if (this.showButtonCaption.trim() !== "") {
                this._captionShow += "<span>" + this.showButtonCaption + "</span>";
            }
        },
        /**
         * Conditionally sets the icon and caption of the mask-password button
         * @private
         */
        _styleMaskPasswordButton: function () {
            if (this.hideImage) {
                this._captionHide = "<img src=\"" + this.hideImage + "\" />";
            }

            if (this.hideButtonCaption.trim() !== "") {
                this._captionHide += "<span>" + this.hideButtonCaption + "</span>";
            }
        },
        /**
         * Conditionally sets the Username node input attributes
         * e.g autocorrect, autocapitalize, text-transform
         * @private
         */
        _setUsernameInputAttributes: function () {
            if (this.autoCorrect) {
                domAttr.set(this.usernameInputNode, "autocorrect", "on");
            }
            if (this.autoCapitalize && this.convertCase !== "none") {
                domAttr.set(this.usernameInputNode, "autocapitalize", "on");
            }
            if (this.autoComplete) {
                domAttr.set(this.usernameInputNode, "autocomplete", "on");
                domAttr.set(this.passwordInputNode, "autocomplete", "on");
            }

            if (this.convertCase === "toLowerCase") {
                domStyle.set(this.usernameInputNode, "text-transform", "lowercase");
            } else if (this.convertCase === "toUpperCase") {
                domStyle.set(this.usernameInputNode, "text-transform", "uppercase");
            }// Else this.convertCase === "None", in which case, do nothing
        },
        /**
         * Shows or hides the forgot-password link
         * @private
         */
        _forgotPasswordLink: function () {
            if (this.forgotmf) {
                dojoHtml.set(this.forgotPasswordLinkNode, this.forgottext);
            } else {
                domClass.add(this.forgotPasswordNode, "hidden");
            }
        },
        /**
         * Controls what happens when Login Fails based on the passed in response code
         * @param code
         * @private
         */
        _loginFailed : function (code) {
            logger.debug(this.id + "._loginFailed");

            if (this._indicator) {
                mx.ui.hideProgress(this._indicator);
            }

            var message = this.getStatusMessage(code);
            logger.warn("Login has failed with Code: " + code + " and Message: " + message);

            if (this.showLoginFailureWarning) {
                if (this._loginForm_FailedAttempts === 1) {
                    message += "</br>" + this.loginFailureText;
                }
                this._loginForm_FailedAttempts = this._loginForm_FailedAttempts + 1;
            }

            dojoHtml.set(this.alertMessageNode, message);
            domClass.remove(this.alertMessageNode, "hidden");
            if (this.clearPw) {
                domAttr.set(this.passwordInputNode, "value", "");
            }
            if (this.clearUn) {
                domAttr.set(this.usernameInputNode, "value", "");
            }
        },
        /**
         * Retrieves the matching value from the internationalization object
         * @param str
         * @returns {*}
         */
        translate: function (str) {
            return window.i18nMap[str];
        },
        /**
         * Gets Status message based on the login response code
         * @param code
         * @returns {*}
         */
        getStatusMessage: function (code) {
            return this.translate("http" + code) || this.translate("httpdefault");
        },
        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");
            this.own(dojoOn(this.loginFormNode, "submit", dojoLang.hitch(this, this._loginUser)));

            if (this.forgotmf) {
                this.own(dojoOn(this.forgotPasswordLinkNode, "click", dojoLang.hitch(this, this._forgotPassword)));
            }

            if (this.passwordVisibilityToggleButtonNode) {
                this.own(dojoOn(this.passwordVisibilityToggleButtonNode, "click", dojoLang.hitch(this, this.togglePasswordVisibility)));
            }
        },

        /**
        * Widget Interaction Methods.
        * ======================
        */

        /**
         * Attempts to login the user. Takes in an Event Parameter
         * @param e
         * @private
         */
        _loginUser: function (e) {
            logger.debug(this.id + "._loginUser");

            domClass.add(this.alertMessageNode, "hidden");

            if (domAttr.get(this.passwordInputNode, "type") === "text") {
                this.togglePasswordVisibility();
            }

            var username = this._trimUsername(this._changeCase(this.usernameInputNode.value)),
                password = this._trimPassword(this.passwordInputNode.value);

            if (username && password) {
                if (this.showprogress) {
                    logger.debug("Showing Progress!!");
                    this._indicator = mx.ui.showProgress();
                }

                mx.login(username, password, dojoLang.hitch(this, function (response) {
                    // Login Successful
                    if (this._indicator) {
                        mx.ui.hideProgress(this._indicator);
                    }
                }), dojoLang.hitch(this, this._loginFailed));

            } else {
                domClass.remove(this.alertMessageNode, "hidden");
                this.alertMessageNode.innerHTML = this.emptytext;
            }

            dojoEvent.stop(e);
        },
        /**
         * Triggers Forgot-Password Microflow. Takes in an event parameter
         * @param e
         * @private
         */
        _forgotPassword: function (e) {
            logger.debug(this.id + "._forgotPassword");
            mx.data.action({
                params: {
                    actionname : this.forgotmf
                },
                callback: dojoLang.hitch(this, function () {
                    logger.debug(this.id, "Forgot Password Microflow Triggered Successfully!");
                }),
                error: dojoLang.hitch(this, function (error) {
                    logger.error(this.id + "._forgotPassword: Error while calling microflow " + this.forgotmf, error);
                })
            });

            dojoEvent.stop(e);
        },
        /**
         * Show/hide the Password
         */
        togglePasswordVisibility : function () {
            if (domAttr.get(this.passwordInputNode, "type") === "password") {
                domAttr.set(this.passwordInputNode, "type", "text");
                dojoHtml.set(this.passwordVisibilityToggleButtonNode, this._captionHide);
            } else {
                domAttr.set(this.passwordInputNode, "type", "password");
                dojoHtml.set(this.passwordVisibilityToggleButtonNode, this._captionShow);
            }
        },
        /**
         * Retrieves internalization mapping
         * @private
         */
        _getI18NMap : function () {
            logger.debug(this.id + "._getI18NMap");
            if (!window.i18n) {
                dojoXhr(mx.appUrl + "js/login_i18n.js", {
                    handleAs: "javascript"
                }).then(dojoLang.hitch(this, function (data) {
                    this._i18nmap = window.i18nMap;
                }), dojoLang.hitch(this, function (err) {
                    logger.debug(this.id + "._getI18Map: Failed to get i18NMap!", err);
                }));
            }
        },
        /**
         * Changes the Case of the passed in username to either uppercase or lowercase
         * @param username
         * @private
         */
        _changeCase: function (username) {
            if (this.convertCase === "toUpperCase") {
                return username.toUpperCase();
            }
            if (this.convertCase === "toLowerCase") {
                return username.toLowerCase();
            }
            return username;
        },
        /**
         * Trim leading and trailing whitespace from the username if option selected.
         */
        _trimUsername: function(username) {
            if (this.trimUsername) {
                return username.trim();
            } else {
                return username;
            }
        },
        /**
         * Trim leading and trailing whitespace from the password if option selected.
         */
        _trimPassword: function(password) {
            if (this.trimPassword) {
                return password.trim();
            } else {
                return password;
            }
        },
        /**
         * Sets focus to the username input node if not the default
         * @private
         */
        _focusNode : function () {
            logger.debug(this.id + "._focusNode");
            //Even with timeout set to 0, function code is made asynchronous
            setTimeout(dojoLang.hitch(this, function () {
                this.usernameInputNode.focus();
            }), 100);
        },
        /**
         * Detects if widget is running on mobile device and sets the available options e.g Keyboard Type
         * @private
         */
        _addMobileOptions: function () {
            if (dojoHas("ios") || dojoHas("android") || dojoHas("bb")) {
                domAttr.set(this.usernameInputNode, "type", this.keyboardType);
            }
        },
        /**
         * Handles whether to show/hide the Username and Password Labels
         * @private
         */
        _showLabels: function () {
            if (this.showLabels) {
                domClass.remove(this.usernameLabelNode, "hidden");
                domClass.remove(this.passwordLabelNode, "hidden");
            }
        }
    });
});

require(["LoginForm/widget/LoginForm"]);
