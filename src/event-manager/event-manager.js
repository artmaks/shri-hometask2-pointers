ym.modules.define('shri2017.imageViewer.EventManager', [
], function (provide) {

    var EVENTS = {
        mousedown: 'start',
        mousemove: 'move',
        mouseup: 'end',
        touchstart: 'start',
        touchmove: 'move',
        touchend: 'end',
        touchcancel: 'end',
        pointerdown: 'start',
        pointermove: 'move',
        pointerup: 'end',
        pointercancel: 'end'
    };

    var SUPPORT = {
        PointerEvent: false,
        TouchEvent: false,
        MouseEvent: false,
        isChecked: false,
        primary: undefined,
        priority: ["TouchEvent", "PointerEvent", "MouseEvent"]
    };

    function EventManager(elem, callback) {
        this._elem = elem;
        this._callback = callback;
        this._setupListeners();
    }

    Object.assign(EventManager.prototype, {
        destroy: function () {
            this._teardownListeners();
        },

        _setupListeners: function () {
            this._mouseListener = this._mouseEventHandler.bind(this);
            this._touchListener = this._touchEventHandler.bind(this);
            this._pointerListener = this._pointerEventHandler.bind(this);

            this._supportChecker = this._supportEventHandler.bind(this);
            this._addEventListeners('mousedown pointerdown touchstart', this._elem, this._supportChecker);

            this._addEventListeners('mousedown', this._elem, this._mouseListener);
            this._addEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            this._addEventListeners('pointerdown', this._elem, this._pointerListener);
        },

        _teardownListeners: function () {
            this._teardownMouse();
            this._teardownTouch();
            this._teardownPointer();
        },

        // --- Teardown different types of listener ---

        _teardownByType: function (type) {
            switch(type) {
                case 'PointerEvent':
                    this._teardownPointer();
                    break;
                case 'MouseEvent':
                    this._teardownMouse();
                    break;
                case 'TouchEvent':
                    this._teardownTouch();
                    break;
                default:
                    console.log("This type of listener doesn't found: " + type);
            }
        },

        _teardownTouch: function () {
            console.log("Teardown touch");
            this._removeEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
        },

        _teardownPointer: function () {
            console.log("Teardown pointer");
            this._removeEventListeners('pointerdown', this._elem, this._pointerListener);
            this._removeEventListeners('pointermove pointerup', document.documentElement, this._pointerListener);
        },

        _teardownMouse: function () {
            console.log("Teardown mouse");
            this._removeEventListeners('mousedown', this._elem, this._mouseListener);
            this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
        },

        // --- Event listeners managment ---

        _addEventListeners: function (types, elem, callback) {
            types.split(' ').forEach(function (type) {
                elem.addEventListener(type, callback);
            }, this);
        },

        _removeEventListeners: function (types, elem, callback) {
            types.split(' ').forEach(function (type) {
                elem.removeEventListener(type, callback);
            }, this);
        },

        // --- Handlers for different types ---

        _mouseEventHandler: function (event) {
            event.preventDefault();

            if (event.type === 'mousedown') {
                this._addEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            } else if (event.type === 'mouseup') {
                this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            }

            var elemOffset = this._calculateElementPreset(this._elem);

            this._callback({
                type: EVENTS[event.type],
                targetPoint: {
                    x: event.pageX - elemOffset.x,
                    y: event.pageY - elemOffset.y
                }
            });
        },

        _touchEventHandler: function (event) {
            // Отменяем стандартное поведение (последующие события мышки)
            event.preventDefault();

            var touches = event.touches;
            // touchend/touchcancel
            if (touches.length === 0) {
                touches = event.changedTouches;
            }

            var elemOffset = this._calculateElementPreset(this._elem);

            var targetPoint = {
                x: touches[0].pageX - elemOffset.x,
                y: touches[0].pageY - elemOffset.y
            };

            this._callback({
                type: EVENTS[event.type],
                targetPoint: targetPoint
            });
        },

        _pointerEventHandler: function (event) {
            event.preventDefault();

            if (event.type === 'pointerdown') {
                this._addEventListeners('pointermove pointerup', document.documentElement, this._pointerListener);
            } else if (event.type === 'pointerup') {
                this._removeEventListeners('pointermove pointerup', document.documentElement, this._pointerListener);
            }

            var elemOffset = this._calculateElementPreset(this._elem);

            var targetPoint = {
                x: event.pageX - elemOffset.x,
                y: event.pageY - elemOffset.y
            };

            this._callback({
                type: EVENTS[event.type],
                targetPoint: targetPoint
            });
        },

        // --- Determining supported technologies ---

        _supportEventHandler: function (event) {
            var eventName = event.constructor.name;
            if(SUPPORT[eventName] === false) {
                SUPPORT[eventName] = true;

                if (!SUPPORT.isChecked) {
                    setTimeout(this._checkSupport.bind(this), 1000);
                    SUPPORT.isChecked = true;
                }
            }
        },

        _checkSupport: function () {
            SUPPORT.priority.forEach(function (type) {
                if(SUPPORT[type] && SUPPORT.primary === undefined) {
                    SUPPORT.primary = type;
                    console.log('Setting up "' + type + '" like primary type of input data');
                } else {
                    this._teardownByType(type);
                }
            }.bind(this));
        },

        // --- Calculate offset ---

        _calculateElementPreset: function (elem) {
            // !
            var result = {
                x: 0,
                y: 0
            };
            while (elem) {
                result.x += elem.offsetLeft;
                result.y += elem.offsetTop;
                elem = elem.offsetParent;
            }
            return result;
        }
    });

    provide(EventManager);
});
