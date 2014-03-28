(function() {
    var appView = null;
    var pageA = new Appbone.PageView();
    var pageB = new Appbone.PageView();

    var appready = false;
    Appbone.globalEventBus.on(Appbone.globalEvent.appready, function() {
        appready = true;
    });

    describe('AppView总管App', function() {
        beforeEach(function() {
            $('body').html('<div class="spa"><div class="page-stack"></div></div>');
            appView = new Appbone.AppView();
        });
        afterEach(function() {
            $('body').empty();
        });

        it('初始化必要的DOM结构', function() {
            expect(appView.$spa.length).toBe(1);
            expect(appView.$pageStack.length).toBe(1);
        });
        it('appready事件', function() {
            expect(appready).toBe(true);
        });

        it('记录当前渲染的PageView', function() {
            appView.renderPage(pageA);
            expect(appView.currentPageView).toBe(pageA);

            appView.renderPage(pageB);
            expect(appView.currentPageView).toBe(pageB);
        });
        it('页面渲染后最终只会保留一个PageView', function() {
            appView.renderPage(pageA);
            appView.renderPage(pageB);
            expect(appView.$el.find('.page').length).toBe(1);
        });
    });
})();