(function() {
    var AppRouter = Appbone.AppRouter.extend({
        routes: {
            '': 'signin',
            'index': 'index',
            'about': 'about',
            'contact': 'contact',
            'setting': 'setting'
        },
        signin: function() {},
        index: function() {},
        about: function() {},
        contact: function() {},
        setting: function() {},
    });

    var appRouter = new AppRouter({});
    appRouter.start();

    var PageViewCacheable = Appbone.PageView.extend({});
    var PageViewNoneCache = Appbone.PageView.extend({
        initialize: function() {
            Appbone.PageView.prototype.initialize.apply(this, arguments);
            this.cache = false;
        }
    });

    describe('记录路由的历史', function() {
        beforeEach(function() {
            // signin -> index -> about -> contact
            //                    setting
            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('about', {trigger: true});
            Backbone.history.navigate('contact', {trigger: true});
            Backbone.history.navigate('about', {trigger: true});
            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('setting', {trigger: true});
        });

        afterEach(function() {
            appRouter.breadcrumb.length = 0;
        });

        it('通过actionName来记录路由的历史', function() {
            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index,about,contact,about,index,setting');
        });

        it('获取当前路由的actionName', function() {
            expect(appRouter.comingAction).toBe('setting');
            expect(appRouter.getCurrentAction()).toBe('setting');
        });

        it('当路由到root时重置路由历史记录', function() {
            Backbone.history.navigate('', {trigger: true});
            appRouter.tryCleanRouteHistory();
            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('');
        });
        it('当路由到index时重置路由历史记录', function() {
            Backbone.history.navigate('index', {trigger: true});
            appRouter.tryCleanRouteHistory();
            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('');
        });

        it('回退', function() {
            // setting -> index
            appRouter.comingAction = 'index';
            var direction = appRouter.getRouteDirection();
            expect(direction).toBe(Appbone.RenderPageOptions.DIRECTION_BACK);
        });
        it('前进', function() {
            // index -> setting
            Backbone.history.navigate('index', {trigger: true});
            appRouter.comingAction = 'setting';
            var direction = appRouter.getRouteDirection();
            expect(direction).toBe(Appbone.RenderPageOptions.DIRECTION_FORWARD);
        });
    });

    describe('缓存PageView', function() {
        afterEach(function() {
            appRouter.cachedPageViews = {};
        });

        it('默认实现的PageView可缓存', function() {
            var pageView1 = appRouter.getPageView(PageViewCacheable);
            var pageView2 = appRouter.getPageView(PageViewCacheable);
            expect(pageView1).toBe(pageView2);
        });
        it('取消PageView的默认缓存', function() {
            var pageView1 = appRouter.getPageView(PageViewNoneCache);
            var pageView2 = appRouter.getPageView(PageViewNoneCache);
            expect(pageView1).not.toBe(pageView2);
        });

        it('精确清除缓存的PageView', function() {
            appRouter.getPageView(PageViewCacheable, {}, 'index/123');
            appRouter.cleanCachedView('index/123');

            expect(appRouter.cachedPageViews['index/123']).not.toBeDefined();
        });
        it('模糊清除缓存的PageView', function() {
            appRouter.getPageView(PageViewCacheable, {}, 'index');
            appRouter.getPageView(PageViewCacheable, {}, 'index/123');
            appRouter.getPageView(PageViewCacheable, {}, 'index/456');
            appRouter.getPageView(PageViewCacheable, {}, 'index/123/456');
            appRouter.cleanCachedView('index');

            expect(appRouter.cachedPageViews.index).not.toBeDefined();
            expect(appRouter.cachedPageViews['index/123']).not.toBeDefined();
            expect(appRouter.cachedPageViews['index/456']).not.toBeDefined();
            expect(appRouter.cachedPageViews['index/123/456']).not.toBeDefined();
        });
        it('通过全局事件来清除缓存', function() {
            appRouter.getPageView(PageViewCacheable, {}, 'index');
            appRouter.getPageView(PageViewCacheable, {}, 'index/123');
            appRouter.getPageView(PageViewCacheable, {}, 'index/456');
            appRouter.getPageView(PageViewCacheable, {}, 'index/123/456');
            Appbone.globalEventBus.trigger('cleancachedview', 'index');

            expect(appRouter.cachedPageViews.index).not.toBeDefined();
            expect(appRouter.cachedPageViews['index/123']).not.toBeDefined();
            expect(appRouter.cachedPageViews['index/456']).not.toBeDefined();
            expect(appRouter.cachedPageViews['index/123/456']).not.toBeDefined();
        });
    });
})();