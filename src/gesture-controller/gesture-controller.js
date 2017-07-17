ym.modules.define('shri2017.imageViewer.GestureController', [
    'shri2017.imageViewer.EventManager',
    'util.extend'
], function (provide, EventManager, extend) {

    var DBL_TAB_STEP = 0.2;
    var ZOOM_DELTA_COEF = 0.001;
    var ONE_TOUCH_ZOOM_DELTA_COEF = 0.01;
    var DBL_CLICK = "start end start end";
    var ONE_TOUCH_ZOOM = "start end start move";
    var MIN_DELTA = 0.00000001;

    var Controller = function (view) {
        this._view = view;
        this._eventManager = new EventManager(
            this._view.getElement(),
            this._eventHandler.bind(this)
        );
        this._lastEventTypes = '';
        this._onTouchZoomEnabled = false;
        this._lastTargetPoint = undefined;
    };

    extend(Controller.prototype, {
        destroy: function () {
            this._eventManager.destroy();
        },

        _eventHandler: function (event) {
            if (event.type === 'move' && !this._isPointsDifferent(event.targetPoint, this._lastTargetPoint))
                return;

            var state = this._view.getState();
            this._lastTargetPoint = event.targetPoint;
            this._updateLastEvent(event);

            if (this._lastEvent(DBL_CLICK)) {
                this._clearLastEvent();
                this._processDbltab(event);
                return;
            } else if (this._lastEvent(ONE_TOUCH_ZOOM) && event.pointerType != "mouse") {
                this._onTouchZoomEnabled = true;
            }

            switch(event.type) {
                case 'zoom':
                    this._processZoom(event);
                    break;
                case 'move':
                    if(this._onTouchZoomEnabled) {
                        this._processOneTouchZoom(this._initEvent, event);
                    } else if (this._isDifferenceDistance(this._initEvent, event)) {
                        this._processMultitouch(event);
                    } else {
                        this._processDrag(event);
                    }
                    break;
                default:
                    this._initState = this._view.getState();
                    this._initEvent = event;
                    if(this._onTouchZoomEnabled) {
                        this._onTouchZoomEnabled = false;
                    }
            }
        },

        _processDrag: function (event) {
            this._view.setState({
                positionX: this._initState.positionX + (event.targetPoint.x - this._initEvent.targetPoint.x),
                positionY: this._initState.positionY + (event.targetPoint.y - this._initEvent.targetPoint.y)
            });
        },

        _processMultitouch: function (event) {
            this._scale(
                event.targetPoint,
                this._initState.scale * (event.distance / this._initEvent.distance)
            );
        },

        _processDbltab: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale + DBL_TAB_STEP
            );
        },

        _processZoom: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale + event.delta * ZOOM_DELTA_COEF
            );
        },

        _processOneTouchZoom: function (targetPoint, secondPoint) {
            this._scale(
                targetPoint.targetPoint,
                this._initState.scale * (targetPoint.targetPoint.y / secondPoint.targetPoint.y)
            );
        },

        _isPointsDifferent: function (firtsPoint, secondPoint) {
            return Math.abs(firtsPoint.x - secondPoint.x) > MIN_DELTA ||  Math.abs(firtsPoint.y - secondPoint.y) > MIN_DELTA ? true : false;
        },

        _lastEvent: function (type) {
            return this._lastEventTypes.indexOf(type) > -1;
        },

        _updateLastEvent: function(event) {
            if (!this._lastEventTypes) {
                setTimeout(function () {
                    this._lastEventTypes = '';
                }.bind(this), 500);
            }
            this._lastEventTypes += ' ' + event.type;
        },

        _clearLastEvent: function () {
            this._lastEvent = '';
        },

        _isDifferenceDistance:function (initEvent, event) {
            return event.distance > 1 && event.distance !== initEvent.distance
        },

        _scale: function (targetPoint, newScale) {
            if(newScale < 0.1 || newScale > 6)
                return;
            var imageSize = this._view.getImageSize();
            var state = this._view.getState();
            // Позиция прикосновения на изображении на текущем уровне масштаба
            var originX = targetPoint.x - state.positionX;
            var originY = targetPoint.y - state.positionY;
            // Размер изображения на текущем уровне масштаба
            var currentImageWidth = imageSize.width * state.scale;
            var currentImageHeight = imageSize.height * state.scale;
            // Относительное положение прикосновения на изображении
            var mx = originX / currentImageWidth;
            var my = originY / currentImageHeight;
            // Размер изображения с учетом нового уровня масштаба
            var newImageWidth = imageSize.width * newScale;
            var newImageHeight = imageSize.height * newScale;
            // Рассчитываем новую позицию с учетом уровня масштаба
            // и относительного положения прикосновения
            state.positionX += originX - (newImageWidth * mx);
            state.positionY += originY - (newImageHeight * my);
            // Устанавливаем текущее положение мышки как "стержневое"
            state.pivotPointX = targetPoint.x;
            state.pivotPointY = targetPoint.y;
            // Устанавливаем масштаб и угол наклона
            state.scale = newScale;
            this._view.setState(state);
        }
    });

    provide(Controller);
});
