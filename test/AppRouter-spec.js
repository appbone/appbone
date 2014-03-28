(function() {
    var location = null;
    var appRouter = null;

    // 测试方法借用Backbone的测试用例
    // https://github.com/jashkenas/backbone/blob/master/test/router.js
    var Location = function(href) {
        this.replace(href);
    };
    _.extend(Location.prototype, {
        parser: document.createElement('a'),
        replace: function(href) {
            this.parser.href = href;
            _.extend(this, _.pick(this.parser,
                'href',
                'hash',
                'host',
                'search',
                'fragment',
                'pathname',
                'protocol'
            ));
            // In IE, anchor.pathname does not contain a leading slash though
            // window.location.pathname does.
            if (!/^\//.test(this.pathname)) {
                this.pathname = '/' + this.pathname;
            }
        },
        toString: function() {
            return this.href;
        }
    });

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
        setting: function() {}
    });

    var PageViewCacheable = Appbone.PageView.extend();
    var PageViewNoneCache = Appbone.PageView.extend({
        initialize: function() {
            Appbone.PageView.prototype.initialize.apply(this, arguments);
            this.cache = false;
        }
    });

    describe('记录路由的历史', function() {
        beforeEach(function() {
            location = new Location('http://example.com');
            Backbone.history = _.extend(new Backbone.History(), {
                location: location
            });
            Backbone.history.interval = 9;

            appRouter = new AppRouter({});
        });
        afterEach(function() {
            Backbone.history.stop();
        });

        it('以root路由开始记录路由历史', function() {
            appRouter.start();

            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin');
        });
        it('以非root路由开始记录路由历史', function() {
            location.replace('http://example.com#index');
            appRouter.start();

            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index');
        });
        it('通过actionName来记录路由历史', function() {
            appRouter.start();

            // signin -> index -> about -> contact
            //                    setting
            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('about', {trigger: true});
            Backbone.history.navigate('contact', {trigger: true});
            Backbone.history.navigate('about', {trigger: true});
            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('setting', {trigger: true});

            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index,about,contact,about,index,setting');
        });

        it('获取当前路由和将要执行路由的actionName', function() {
            appRouter.start();

            expect(appRouter.getCurrentAction()).toBe('signin');
            Backbone.history.navigate('index', {trigger: true});
            expect(appRouter.comingAction).toBe('index');
        });

        it('当路由到root时重置路由历史记录', function() {
            appRouter.start();

            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('', {trigger: true});

            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index,signin');

            appRouter.tryCleanRouteHistory();
            routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('');
        });
        it('当路由到index时重置路由历史记录', function() {
            appRouter.start();

            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('', {trigger: true});
            Backbone.history.navigate('index', {trigger: true});

            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index,signin,index');

            appRouter.tryCleanRouteHistory();
            routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('');
        });

        it('前进的路由', function() {
            appRouter.start();

            Backbone.history.navigate('index', {trigger: true});
            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index');

            var direction = appRouter.getRouteDirection();
            expect(direction).toBe(Appbone.RenderPageOptions.DIRECTION_FORWARD);
        });
        it('回退的路由', function() {
            appRouter.start();

            Backbone.history.navigate('index', {trigger: true});
            Backbone.history.navigate('', {trigger: true});

            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index,signin');

            var direction = appRouter.getRouteDirection();
            expect(direction).toBe(Appbone.RenderPageOptions.DIRECTION_BACK);
        });
    });

    describe('缓存PageView', function() {
        beforeEach(function() {
            location = new Location('http://example.com');
            Backbone.history = _.extend(new Backbone.History(), {
                location: location
            });
            Backbone.history.interval = 9;

            appRouter = new AppRouter({});
            appRouter.start();
        });
        afterEach(function() {
            Backbone.history.stop();
        });

        it('默认实现的PageView可缓存', function() {
            var pageView1 = appRouter.getPageView(PageViewCacheable);
            var pageView2 = appRouter.getPageView(PageViewCacheable);
            expect(pageView1).toBe(pageView2);
        });
        it('取消PageView的默认缓存', function() {
            Backbone.history.navigate('index', {trigger: true});

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