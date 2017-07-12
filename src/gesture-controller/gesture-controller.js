ym.modules.define('shri2017.imageViewer.GestureController', [
    'shri2017.imageViewer.EventManager'
], function (provide, EventManager) {

    var Controller = function (view) {
        this._view = view;
        this._eventManager = new EventManager(
            this._view.getElement(),
            this._eventHandler.bind(this)
        );
        this._lastEventTypes = '';
    };

    Object.assign(Controller.prototype, {
        destroy: function () {
            this._eventManager.destroy();
        },

        _eventHandler: function (event) {
            var state = this._view.getState();

            // dblclick
            if (!this._lastEventTypes) {
                setTimeout(function () {
                    this._lastEventTypes = '';
                }.bind(this), 500);
            }
            this._lastEventTypes += ' ' + event.type;

            if (this._lastEventTypes.indexOf('start end start end') > -1) {
                this._lastEventTypes = '';
                // to do somethin awesome!
                return;
            }

            // drag
            if (event.type === 'move') {
                this._processDrag(event);
            } else {
                this._initState = this._view.getState();
                this._initEvent = event;
            }
        },

        _processDrag: function (event) {
            this._view.setState({
                positionX: this._initState.positionX + (event.targetPoint.x - this._initEvent.targetPoint.x),
                positionY: this._initState.positionY + (event.targetPoint.y - this._initEvent.targetPoint.y)
            });
        }
    });

    provide(Controller);
});
