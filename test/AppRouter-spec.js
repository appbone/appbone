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

    describe('测试AppRouter', function() {
        var appRouter;

        appRouter = new AppRouter({});
        appRouter.start();
        // signin -> index -> about -> contact
        //           index <- about <----|
        //             |----> setting
        Backbone.history.navigate('index', {trigger: true});
        Backbone.history.navigate('about', {trigger: true});
        Backbone.history.navigate('contact', {trigger: true});
        Backbone.history.navigate('about', {trigger: true});
        Backbone.history.navigate('index', {trigger: true});
        Backbone.history.navigate('setting', {trigger: true});

        it('通过actionName来记录路由的历史', function() {
            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('signin,index,about,contact,about,index,setting');
        });

        it('获取当前路由的actionName', function() {
            expect(appRouter.comingAction).toBe('setting');
            expect(appRouter.getCurrentAction()).toBe('setting');
        });

        it('清除重复的路由历史记录', function() {
            Backbone.history.navigate('index', {trigger: true});
            appRouter.tryCleanRouteHistory();
            var routeHistory = appRouter.breadcrumb.join(',');
            expect(routeHistory).toBe('');
        });

        // TODO 测试缓存PageView
        // TODO 测试getRenderPageOptions或getRouteDirection
    });
})();