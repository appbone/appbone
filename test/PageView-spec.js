(function() {
    var pageViewCacheable;
    var pageViewNoneCache;

    var PageViewCacheable = Appbone.PageView.extend({
        events: {
            'click': 'foo'
        },
        foo: function() {
            this.hasDelegateEvents = true;
        }
    });
    var PageViewNoneCache = Appbone.PageView.extend({
        events: {
            'click': 'foo'
        },
        initialize: function() {
            Appbone.PageView.prototype.initialize.apply(this, arguments);
            this.cacheable = false;
        },
        foo: function() {
            this.hasDelegateEvents = true;
        }
    });

    describe('PageView控制单个页面的视图', function() {
        beforeEach(function() {
            PageViewCacheable.cacheable = true;
            pageViewCacheable = new PageViewCacheable();

            pageViewNoneCache = new PageViewNoneCache();

            spyOn(pageViewCacheable, 'renderView');
            spyOn(pageViewNoneCache, 'renderView');
            spyOn(pageViewCacheable, 'cleanup');
            spyOn(pageViewNoneCache, 'cleanup');
        });
        afterEach(function() {
        });

        it('PageView能够配置为可缓存', function() {
            expect(pageViewCacheable.cacheable).toBe(true);
            expect(pageViewNoneCache.cacheable).toBe(false);
        });
        it('临时将可缓存的PageView配置为不缓存', function() {
            PageViewCacheable.cacheable = false;
            pageViewCacheable = new PageViewCacheable();
            expect(pageViewCacheable.cacheable).toBe(false);
        });

        it('缓存的PageView多次渲染时渲染逻辑只会执行一次', function() {
            pageViewCacheable.render();
            pageViewCacheable.render();
            pageViewCacheable.render();

            // XXX 目前 karma-jasmine 用的jasmine是1.3版
            expect(pageViewCacheable.renderView.calls.length).toEqual(1);
        });
        it('不缓存的PageView多次渲染会多次执行渲染', function() {
            pageViewNoneCache.render();
            pageViewNoneCache.render();
            pageViewNoneCache.render();

            expect(pageViewNoneCache.renderView.calls.length).toEqual(3);
        });

        it('缓存的PageView被移除时仅作detach', function() {
            pageViewCacheable.remove();
            pageViewCacheable.$el.click();
            expect(pageViewCacheable.hasDelegateEvents).toBe(true);
        });
        it('不缓存的PageView被移除时会被完全remove掉', function() {
            pageViewNoneCache.remove();
            pageViewNoneCache.$el.click();
            expect(pageViewNoneCache.hasDelegateEvents).not.toBeDefined();
        });
        it('PageView被移除时可做额外的清理工作', function() {
            pageViewCacheable.remove();
            expect(pageViewCacheable.cleanup).toHaveBeenCalled();

            pageViewNoneCache.remove();
            expect(pageViewNoneCache.cleanup).toHaveBeenCalled();
        });
    });
})();