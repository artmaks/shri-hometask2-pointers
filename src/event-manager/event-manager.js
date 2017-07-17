ym.modules.define('shri2017.imageViewer.EventManager', [
    'util.extend'
], function (provide, extend) {

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
        PointerEventPrevent: "pointerdown pointerup",
        TouchEvent: false,
        TouchEventPrevent: "touchstart touchend",
        MouseEvent: false,
        MouseEventPrevent: "mousedown mouseup",
        primary: undefined,
        priorityDesktop: ["PointerEvent", "TouchEvent", "MouseEvent"],
        priorityMobile: ["TouchEvent", "PointerEvent", "MouseEvent"]
    };

    function EventManager(elem, callback) {
        this._elem = elem;
        this._callback = callback;
        this._pointers = {};
        this._setupListeners();
    }

    extend(EventManager.prototype, {
        destroy: function () {
            this._teardownListeners();
        },

        _setupListeners: function () {
            this._checkSupport();
            this._setupWheel();
        },

        _teardownListeners: function () {
            this._teardownMouse();
            this._teardownTouch();
            this._teardownPointer();
        },

        _checkSupport: function () {
            this._getSupportPriority().forEach(function (type) {
                if(this._hasConstructor(type)) {
                    this._enableSupport(type);
                    if(!this._getPrimary()) {
                        this._setPrimary(type);
                        this._setupByType(type);
                        console.log("Setting up " + type + " like primary type")
                    } else {
                        this._addEventListeners(this._getPreventActions(type), this._elem, function (event) {
                            event.preventDefault();
                        });
                    }
                }
            }.bind(this));
        },

        _getSupportPriority: function () {
            var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            return isMobile ? SUPPORT.priorityMobile : SUPPORT.priorityDesktop;
        },

        _hasConstructor: function (type) {
            return typeof window[type] === 'function';
        },

        _setPrimary: function (type) {
            SUPPORT.primary = type;
        },

        _getPrimary: function () {
            return SUPPORT.primary;
        },

        _enableSupport: function (type) {
            SUPPORT[type] = true;
        },

        _getPreventActions: function (type) {
            return SUPPORT[type + "Prevent"];
        },

        // --- Setting up different types of listener ---

        _setupByType: function (type) {
            switch(type) {
                case 'PointerEvent':
                    this._setupPointer();
                    break;
                case 'MouseEvent':
                    this._setupMouse();
                    break;
                case 'TouchEvent':
                    this._setupTouch();
                    break;
                default:
                    console.log("This type of listener doesn't found: " + type);
            }
        },

        // --- WHEEL ---

        _setupWheel: function () {
            if('onwheel' in document) {
                this._wheelListener = this._wheelEventHandler.bind(this);
                this._addEventListeners('wheel', this._elem, this._wheelListener);
            }
        },

        // --- TOUCH ---

        _setupTouch: function () {
            this._touchListener = this._touchEventHandler.bind(this);
            this._addEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
        },

        _teardownTouch: function () {
            this._removeEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
        },

        // --- POINTER ---

        _setupPointer: function () {
            this._pointerListener = this._pointerEventHandler.bind(this);
            this._addEventListeners('pointerdown', this._elem, this._pointerListener);
        },

        _teardownPointer: function () {
            this._removeEventListeners('pointerdown', this._elem, this._pointerListener);
            this._removeEventListeners('pointermove pointerup pointercancel', document.documentElement, this._pointerListener);
        },

        // --- MOUSE ---

        _setupMouse: function () {
            this._mouseListener = this._mouseEventHandler.bind(this);
            this._addEventListeners('mousedown', this._elem, this._mouseListener);
        },

        _teardownMouse: function () {
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

        // --- Handlers for different types of events ---

        _wheelEventHandler: function (event) {
            event.preventDefault();

            this._callback({
                type: "zoom",
                targetPoint: this._getPointByEvent(event),
                delta: event.deltaY
            });
        },

        _mouseEventHandler: function (event) {
            event.preventDefault();

            if (event.type === 'mousedown') {
                this._addEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            } else if (event.type === 'mouseup') {
                this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            }

            this._callback({
                type: EVENTS[event.type],
                targetPoint: this._getPointByEvent(event),
                distance: 1,
                pointerType: "mouse"
            });
        },

        _touchEventHandler: function (event) {
            // Отменяем стандартное поведение (последующие события мышки)
            event.preventDefault();

            var targetPoint;
            var distance = 1;
            var touches = this._getActualTouches(event);

            if (touches.length === 1) {
                targetPoint = {
                    x: touches[0].clientX,
                    y: touches[0].clientY
                };
            } else {
                var firstTouch = touches[0];
                var secondTouch = touches[1];
                targetPoint = this._calculateTargetPoint(firstTouch, secondTouch);
                distance = this._calculateDistance(firstTouch, secondTouch);
            }

            this._callback({
                type: EVENTS[event.type],
                targetPoint: this._calculatePointWithOffset(targetPoint),
                distance: distance,
                pointerType: "touch"
            });
        },

        _getActualTouches: function (event) {
            return event.touches.length === 0 ? event.changedTouches : event.touches;
        },

        _pointerEventHandler: function (event) {
            // Пока закоментить, так как мешает событию mouse down для эмуляции multitouch
            // event.preventDefault();

            var targetPoint;
            var distance = 1;

            if (event.type === 'pointerdown') {
                this._addPointer(event);
            } else if (event.type === 'pointerup') {
                this._removePointer(event);
            }

            this._updatePointer(event);

            //TODO только для эмуляции нажатия
            delete this._pointers[1];

            if (this._pointersCount() <= 1) {
                targetPoint = {
                    x: event.clientX,
                    y: event.clientY
                };
            } else {
                var firstPointers = this._getFirstPointers(2);
                var firstTouch = firstPointers[0];
                var secondTouch = firstPointers[1];
                targetPoint = this._calculateTargetPoint(firstTouch, secondTouch);
                distance = this._calculateDistance(firstTouch, secondTouch);
            }

            this._callback({
                type: EVENTS[event.type],
                targetPoint: this._calculatePointWithOffset(targetPoint),
                distance: distance,
                pointerType: event.pointerType
            });
        },

        _addPointer: function () {
            this._addEventListeners('pointermove pointerup pointercancel', document.documentElement, this._pointerListener);
            this._pointers[event.pointerId] = event;
        },

        _removePointer: function (event) {
            delete this._pointers[event.pointerId];
            if(this._pointersCount() === 0)
                this._removeEventListeners('pointermove pointerup pointercancel', document.documentElement, this._pointerListener);
        },

        _getPointer: function(pointerId) {
            return this._pointers[pointerId];
        },

        _updatePointer: function (event) {
            if(this._getPointer(event.pointerId))
                this._pointers[event.pointerId] = event;
        },

        _pointersCount: function () {
            return Object.keys(this._pointers).length;
        },

        _getFirstPointers: function (count) {
            var keys = Object.keys(this._pointers);
            var pointers = [];
            for(var i = 0; i < count; i++) {
                pointers.push(this._pointers[keys[i]])
            }
            return pointers;
        },

        // --- Calculate offset and other values ---

        _calculateTargetPoint: function (firstTouch, secondTouch) {
            return {
                x: (secondTouch.clientX + firstTouch.clientX) / 2,
                y: (secondTouch.clientY + firstTouch.clientY) / 2
            };
        },

        _calculateDistance: function (firstTouch, secondTouch) {
            return Math.sqrt(
                Math.pow(secondTouch.clientX - firstTouch.clientX, 2) +
                Math.pow(secondTouch.clientY - firstTouch.clientY, 2)
            );
        },

        _calculateElementOffset: function (elem) {
            var bounds = elem.getBoundingClientRect();
            return {
                x: bounds.left,
                y: bounds.top
            };
        },
        
        _getPointByEvent: function (event) {
            var elemOffset = this._calculateElementOffset(this._elem);
            return {
                x: event.clientX - elemOffset.x,
                y: event.clientY - elemOffset.y
            }
        },

        _calculatePointWithOffset: function (point) {
            var elemOffset = this._calculateElementOffset(this._elem);
            return {
                x: point.x - elemOffset.x,
                y: point.y - elemOffset.y
            }
        }
    });

    provide(EventManager);
});
