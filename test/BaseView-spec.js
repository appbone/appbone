(function() {
    var Subview = Appbone.BaseView.extend({
        renderView: function() {
            this.trigger(Subview.events.foo);
        }
    }, {
        events: {
            foo: 'foo'
        }
    });
    var BaseView = Appbone.BaseView.extend({
        initialize: function(options) {
            Appbone.BaseView.prototype.initialize.apply(this, arguments);
            this.subview = new Subview();
            this.listenTo(this.subview, Subview.events.foo, this.whenSubviewFoo);
        },
        renderView: function() {
            this.subview.render();
        },
        whenSubviewFoo: function() {
            this.called = true;
        }
    });

    describe('BaseView标准化View的逻辑', function() {
        beforeEach(function() {
            baseView = new BaseView();
            spyOn(baseView, 'cleanup');
        });
        afterEach(function() {
            baseView.remove();
        });

        it('初始化后处于未渲染状态', function() {
            expect(baseView.rendered).toBe(false);
        });
        it('渲染后状态变为已渲染的', function() {
            baseView.render();
            expect(baseView.rendered).toBe(true);
        });

        it('被移除时可做额外的清理工作', function() {
            baseView.remove();
            expect(baseView.cleanup).toHaveBeenCalled();
        });

        it('将View的element添加到DOM中', function() {
            expect(baseView.isElementInDom()).toBe(false);
            $('body').append(baseView.el);
            expect(baseView.isElementInDom()).toBe(true);
        });
        it('View被移除后判断是否在DOM中', function() {
            $('body').append(baseView.el);
            expect(baseView.isElementInDom()).toBe(true);

            baseView.remove();
            expect(baseView.isElementInDom()).toBe(false);
        });

        it('能够方便地监听View发出的事件', function() {
            baseView.render();
            expect(baseView.called).toBe(true);
        });
    });
})();