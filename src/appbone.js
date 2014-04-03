/**
 * Appbone.js
 * Make your Backbone.js apps have a clear and standardized logic.
 * 
 * https://github.com/appbone/appbone
 * 
 * @version %VERSION% %DATE%
 * @license MIT
 * @copyright ufologist 2014
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) { // AMD exports
        define(['backbone', 'exports'], function(Backbone, exports) {
            // Export global even in AMD case in case this script is loaded with
            // others that may still expect a global Appbone.
            root.Appbone = factory(root, exports, Backbone);
        });
    } else { // Browser exports
        root.Appbone = factory(root, {}, root.Backbone);
    }
}(this, function(root, Appbone, Backbone) {
    var previousAppbone = root.Appbone;

    // 从underscore那里借来的extend方法
    function _extend(obj) {
        var sources = Array.prototype.slice.call(arguments, 1),
            source = null;
        for (var i = 0, length = sources.length; i < length; i++) {
            source = sources[i];
            if (source) {
                for (var prop in source) {
                    obj[prop] = source[prop];
                }
            }
        }
        return obj;
    }


    // 版本号会通过grunt任务动态生成
    Appbone.VERSION = '%VERSION%';


    Appbone.noConflict = function() {
        root.Appbone = previousAppbone;
        return this;
    };


    /**
     * Appbone.globalEventBus
     * 
     * 负责监听/派发全局事件
     */
    Appbone.globalEventBus = _extend({}, Backbone.Events);
    /**
     * 列举出所有的全局事件
     * 
     * @type {object}
     */
    Appbone.globalEvents = {
        appready: 'appready.appbone',
        cleancachedview: 'cleancachedview.appbone'
    };


    /**
     * AppView
     * 
     * 用于规范App初始化/启动的流程与逻辑.
     * 实现了对整个页面元素(body)的总控制, 便于切换"页面"(替换原来页面上所有的内容)
     *
     * 主要职责:
     * 1. 构造AppRouter(先只是构造好, 还不急着启动)
     * 2. 监听App何时算准备好可以启动了
     * 3. 在App启动后, 紧接着启动AppRouter
     * 4. 渲染页面
     * 
     * 规范化的App初始化逻辑
     * AppView --初始化/启动--> AppRouter --根据route构造--> View --提交给--> AppView -> 渲染页面
     *
     * AppView所需要的DOM结构
     * <body>
     *    <div class="spa">
     *        <div class="page-stack">
     *            <!-- 动态刷新整个页面, 放置2个page用于实现(过场)动画效果 -->
     *            <!-- <div class="page">PageView</div><div class="page">PageView</div> -->
     *        </div>
     *    </div>
     * </body>
     * 
     * @constructor Appbone.AppView
     */
    Appbone.AppView = Backbone.View.extend({
        el: 'body',
        /**
         * 初始化AppView
         * 
         * @param {object} options {spaClass: '.spa', pageStackClass: '.page-stack'}
         */
        initialize: function(options) {
            options = options || {};
            var spaClass = options.spaClass || '.spa';
            var pageStackClass = options.pageStackClass || '.page-stack';

            this.$spa = this.$(spaClass);
            this.$pageStack = this.$(pageStackClass);
            this.currentPageView = null;
            this.appready = false;

            this.initAppRouter(options);
            this.listenAppReady(options);
        },
        /**
         * 子类实现构造 AppRouter 的逻辑
         * 
         * @abstract
         * @param {object} options View.initialize中传入的options
         */
        initAppRouter: function(options) {
            // 参考实现
            // this.appRouter = new AppRouter({
            //     appView: this
            // });
        },
        /**
         * 子类实现监听App何时算准备完毕了,
         * 例如DOMContentLoaded或deviceready
         * 
         * @param {object} options View.initialize中传入的options
         */
        listenAppReady: function(options) {
            this.onAppReady();
        },
        /**
         * 子类实现App准备完毕后应该做些什么
         */
        onAppReady: function() {
            // 默认实现启动AppRouter, 一般都是这样
            this.startAppRouter();
            this.appready = true;
            Appbone.globalEventBus.trigger(Appbone.globalEvents.appready, this);
        },
        startAppRouter: function() {
            if (this.appRouter) {
                this.appRouter.start();
            }
        },
        /**
         * 渲染整个页面
         * 主要逻辑为:
         * 1. 渲染页面
         * 2. 让2个页面(当前的页面和现在渲染的页面)切换
         * 3. 记录当前渲染的是哪个页面
         * 
         * @param {View} pageView
         * @param {Appbone.RenderPageOptions} 渲染页面的可选参数
         */
        renderPage: function(pageView, options) {
            this.beforeRenderPage(pageView, options);

            // 第一次渲染整个页面
            if (!this.currentPageView) {
                this.firstTimeRenderPage(pageView, options);
            } else {
                // 采用prepend方式添加即将渲染的页面, 防止出现遮挡当前页面的问题
                this.$pageStack.prepend(pageView.$el);
                pageView.render();
                this.currentPageView.transitionTo(pageView, options);
                this.currentPageView = pageView;
            }

            this.afterRenderPage(pageView, options);
        },
        firstTimeRenderPage: function(pageView, options) {
            this.currentPageView = pageView;
            this.$pageStack.append(pageView.el);
            pageView.render();
        },
        /**
         * 在渲染页面之前做些事情.
         * 可以实现一些类似打开蒙板这样的操作.
         *
         * @abstract
         */
        beforeRenderPage: function(pageView, options) {},
        /**
         * 在渲染页面之后做些事情.
         * 可以实现一些类似关闭蒙板这样的操作.
         *
         * @abstract
         */
        afterRenderPage: function(pageView, options) {}
    });


    /**
     * AppRouter
     *
     * 负责配置路由映射, 集中(前置)处理参数, 相当于Front Controller模式.
     * 由于只有Router知道根据某个路由映射要做什么操作,
     * 因此我们通过路由映射来控制整个页面内容的"刷新", 以达到单页面中多页面切换的效果.
     * 但Router本身不应该承担渲染页面的工作, 应该由AppView来担当, 它才是整个应用的总管.
     * Router只需要(根据路由映射)构造好页面, 告诉AppView要渲染这个页面, 将控制权转交给它.
     *
     * 主要职责:
     * 1. 记录route的历史(为了辅助渲染页面)
     * 2. 根据route映射来构造(缓存)PageView, 并支持清除缓存
     * 3. 借助 AppView 来渲染View
     * 
     * @constructor Appbone.AppRouter
     */
    Appbone.AppRouter = Backbone.Router.extend({
        /**
         * 初始化AppRouter
         * 
         * @param {object} options {appView: 在AppView中构造AppRouter}
         */
        initialize: function(options) {
            this.appView = options.appView;
            this.cachedPageViews = {};
            this.rootAction = this.routes[''];
            this.comingAction = null;
            this.recordRouteHistory();
            this.listenTo(Appbone.globalEventBus, Appbone.globalEvents.cleancachedview, this.cleanCachedView);
        },
        start: function() {
            // call Backbone.history.start() to enable all routes
            // Your router will not work if you forget to call Backbone.history.start()
            // since Backbone.history.start() will monitor hashChange event and dispatch routes
            Backbone.history.start();
        },
        /**
         * 通过记录action名称的方式来记录路由历史
         */
        recordRouteHistory: function() {
            this.breadcrumb = [];
            // XXX 不支持监听指定匿名函数的route
            this.on('route', this.onRouteEvent);
        },
        /**
         * route事件处理器
         * Router的逻辑是先执行route的callback再(触发route事件)到这个方法
         * 
         * @param {string} actionName route action callback name
         * @param {Array}  args
         */
        onRouteEvent: function(actionName, args) {
            // 确保第一个记录的route是root, 防止不从root启动应用时, 路由路径判断全部反了
            // 例如index.html#index, 会形成错误的根路径历史记录['index', 'signin', 'index']
            if (this.breadcrumb.length === 0 && actionName !== this.rootAction) {
                this.breadcrumb[0] = this.rootAction;
            }

            this.breadcrumb.push(actionName);
        },
        /**
         * 重写Backbone.Router.execute, 主要是为了记录将要执行的action是哪个
         * 
         * This method is called whenever a route matches and its callback is about to be executed
         * 所有route映射的action在执行之前都会过这里, 可用于拦截route不执行action.
         * 
         * @param {Function} callback route映射的回调方法
         * @param {Array}    args
         */
        execute: function(callback, args) {
            // XXX 已经给Backbone提了issue, Backbone接受给execute添加一个actionName的参数,
            // 考虑到兼容性, 这里还是保留着
            this.setComingAction(callback);
            // super
            Backbone.Router.prototype.execute.apply(this, arguments);
        },
        /**
         * 匹配routes, 找出下一个要执行的action是哪个
         * 
         * @param {Function} callback route映射的回调方法
         */
        setComingAction: function(callback) {
            if (!this.routes) {
                return;
            }

            var actionName;
            for (var routePattern in this.routes) {
                actionName = this.routes[routePattern];
                if (callback === this[actionName]) {
                    this.comingAction = actionName;
                    break;
                }
            }
        },
        /**
         * 获取页面视图的实例(缓存)
         * 
         * @param  {PageView} PageView 页面视图的构造函数
         * @param  {object}   options  构造页面视图的可选参数
         * @param  {string}   [cacheKey=getDefaultCacheKey()] 用于获取/缓存PageView实例的key
         * @return {pageView}          PageView实例(可能是新的实例或是从缓存中取出的)
         */
        getPageView: function(PageView, options, cacheKey) {
            // 默认以路由的(URL), 例如index, profile/param,
            // 来缓存PageView(被设置为可缓存的)实例
            cacheKey = cacheKey || this.getDefaultCacheKey();

            var pageView = this.getCachedPage(cacheKey);
            if (!pageView) {
                pageView = new PageView(options);
                if (pageView.cacheable) {
                    this.cachePageView(cacheKey, pageView);
                }
            }
            return pageView;
        },
        /**
         * 获取缓存的"页面"视图
         * 
         * @param  {string}     cacheKey, 例如: index, profile/param
         * @return {pageView}   缓存的PageView实例
         *
         * @see Appbone.AppRouter.cachePageView
         */
        getCachedPage: function(cacheKey) {
            return this.cachedPageViews[cacheKey];
        },
        /**
         * 缓存"页面"视图
         * 
         * @param  {string} cacheKey
         * @param  {PageView} pageView
         */
        cachePageView: function(cacheKey, pageView) {
            this.cachedPageViews[cacheKey] = pageView;
        },
        /**
         * 清除缓存的PageView
         * 可通过全局事件来完成清除动作
         * Appbone.globalEventBus.trigger('cleancachedview.appbone', 'index');
         *
         * 由于一般是通过当前路由的path来作为缓存的key, 因此清除缓存的时候需要分2种情况
         * 1. 对于没有有斜杠的, 删除基于这个路由的全部缓存
         *    例如 cacheKey 为index时, 需要删除所有以index为path的PageView缓存
         *    有可能有 index, index/123, index/456, index/123/456
         *    如果考虑到性能问题(缓存了太多View在内存中), 这种可变参数的view可以不启用缓存功能
         * 2. 对于有斜杠的, 则精确删除这个缓存
         * 
         * @param {string} cacheKey
         */
        cleanCachedView: function(cacheKey) {
            var delimit = cacheKey.indexOf('/');
            if (delimit === -1) { // 没斜杠的模糊删除
                // 先精准删除一次
                delete this.cachedPageViews[cacheKey];

                // 删除所有以 cacheKey/ 开头的缓存
                var cacheKeySlash = cacheKey + '/';
                for (var key in this.cachedPageViews) {
                    if (key.substring(0, cacheKeySlash.length) === cacheKeySlash) {
                        delete this.cachedPageViews[key];
                    }
                }
            } else { // 有斜杠的精确删除
                this.cachedPageViews[cacheKey] = null;
                delete this.cachedPageViews[cacheKey];
            }
        },
        /**
         * 获取渲染页面所需的默认可选项, 根据当前路由和接下来路由计算得来
         * 
         * @return {Appbone.RenderPageOptions}
         * @see Appbone.AppView.renderPage
         */
        getDefaultRenderPageOptions: function() {
            var options = new Appbone.RenderPageOptions();
            options.direction = this.getRouteDirection();
            options.currentAction = this.getCurrentAction();
            options.comingAction = this.comingAction;
            return options;
        },
        getCurrentAction: function() {
            return this.breadcrumb[this.breadcrumb.length - 1];
        },
        /**
         * 计算出将要执行的路由是前进还是后退
         * 
         * @return {string} forward | back
         */
        getRouteDirection: function() {
            // signin, index, A, [index, B], B1, B2, B1, [B, index], A, index, C, index, signin
            // 例如以上路由历史
            // 其中当前路由是: B, 将要执行的路由是: index
            var direction = Appbone.RenderPageOptions.DIRECTION_FORWARD;

            // 从历史路径中找出当前路径的父级(当前路径最开始是从哪里过来的)
            // 如果接下也是要去父级, 则表示动作为回退操作
            var currentAction = this.getCurrentAction();
            var currentActionFirstIndex = this.breadcrumb.indexOf(currentAction);
            var parentAction = this.breadcrumb[currentActionFirstIndex - 1];

            // 无论从哪个页面跳回根路由, 都会被视为回退操作
            if (this.rootAction === this.comingAction || parentAction === this.comingAction) {
                direction = Appbone.RenderPageOptions.DIRECTION_BACK;
            }
            return direction;
        },
        tryCleanRouteHistory: function() {
            var comingActionIndex = this.breadcrumb.indexOf(this.comingAction);
            // 如果将要执行的路由是root或者root之后的第一个路由时就可以重置下路由历史了
            // 因为路由回归源点后, 历史记录可以重新计算了, 不用担心找不到回家的路
            if (comingActionIndex === 0 || comingActionIndex === 1) {
                this.breadcrumb.length = 0;
            }
        },
        /**
         * 获取缓存View默认的key值(当前路由的path).
         * 
         * 如果是以hash来实现路由
         * http://localhost/index.html#route 得到的path就是 route
         * 如果是以HTML5 History API来实现路由
         * http://localhost/index.html/route 得到的path也是 route
         * 
         * @return {string}
         */
        getDefaultCacheKey: function() {
            // XXX API中没有提到过这个方法, 是看源码了解到的
            return Backbone.history.getFragment();
        },
        /**
         * 使用 AppView 来渲染整个页面
         * 
         * @param {Appbone.PageView} pageView
         * @param {Appbone.RenderPageOptions} [options=getDefaultRenderPageOptions()]
         * @see Appbone.AppView.renderPage
         */
        renderPage: function(pageView, options) {
            options = options || this.getDefaultRenderPageOptions();
            this.appView.renderPage(pageView, options);
            this.tryCleanRouteHistory();
        }
    });


    /**
     * 通用View, 用于标准化View的逻辑.
     *
     * 主要职责:
     * 1. 规范视图渲染的逻辑(渲染前/后)
     * 2. 规范视图方法的命名render, beforeRender, renderView, afterRender, remove, cleanup
     * 3. 规范视图发出的事件如何对外
     * 
     * @constructor Appbone.BaseView
     * @abstract
     */
    Appbone.BaseView = Backbone.View.extend({
        initialize: function(options) {
            this.rendered = false;
        },
        /**
         * 默认实现同步的视图渲染流程, 子类可以覆盖实现异步或者其他个性化的渲染流程
         * 
         * @return {View}
         */
        render: function() {
            // 渲染view时, 不要先render再添加DOM,
            // 应该先将view的DOM添加到document中, 再调用render,
            // 这样才能使元素在渲染时获得正确的状态(例如高/宽)
            // 例如:
            // $(dom).append(view.$el);
            // view.render();
            if (this.beforeRender()) {
                this.renderView();
            }
            this.afterRender();
            return this;
        },
        /**
         * 渲染前做些什么, 可以做出判断而中断执行渲染.
         * 一般会在这里实现View数据的准备工作.
         * 
         * @return {boolean} 是否需要执行渲染
         */
        beforeRender: function() {
            var needRender = true;
            return needRender;
        },
        /**
         * 渲染后做些什么
         */
        afterRender: function() {
            this.rendered = true;
        },
        /**
         * 子类实现渲染View的逻辑
         *
         * @abstract
         */
        renderView: function() {},
        remove: function() {
            Backbone.View.prototype.remove.apply(this);
            this.cleanup();
            return this;
        },
        /**
         * 子类实现清理额外资源的方法, 例如清除setInterval之类的
         *
         * @abstract
         */
        cleanup: function() {},
        /**
         * 判断View的element是否在DOM中(不管是remove还是detach操作都会从DOM中删除View).
         * 
         * @return {boolean}
         */
        isElementInDom: function() {
            return this.$el.parent().length > 0;
        }
    }, {
        /**
         * 列举出View会(对外)发出哪些事件, 方便外部监听.
         *
         * 例如 new View1().on(View2.events.foo, function() {});
         * 
         * @type {object}
         */
        events: null
    });


    /**
     * PageView
     *
     * 单页应用中会占据整个页面的View.
     * 单页应用一般分为多个功能模块, 例如登录页, 首页等, 对应的就是一个个PageView的实现.
     *
     * 主要职责:
     * 1. 实现缓存机制, 不会重复渲染View, 以保留页面的状态(例如输入项, 滚动条的状态)
     *
     * 页面View的生命周期
     * initialize -> render -> beforeRender -> renderView(开启缓存仅执行一次) -> afterRender -> remove
     *
     * @constructor Appbone.PageView
     * @abstract
     */
    Appbone.PageView = Appbone.BaseView.extend({
        className: 'page',
        initialize: function(options) {
            Appbone.BaseView.prototype.initialize.apply(this, arguments);
            // Constructor的静态属性, 不写死为Appbone.PageView, 方便子类临时覆盖cacheable
            this.cacheable = this.constructor.cacheable;
        },
        /**
         * 可缓存的PageView在执行过一次渲染后(rendered为true), 不会再次执行渲染逻辑.
         * 也就是说renderView只会执行一次, 因为DOM元素都还保留在PageView中, 事件监听也会被保留.
         */
        beforeRender: function() {
            var needRender = true;
            if (this.cacheable && this.rendered) {
                needRender = false;
            }
            return needRender;
        },
        remove: function() {
            // 需要cache的view也会从DOM中移除
            // 但保留jquery data/events, 因此delegateEvents都还在
            if (this.cacheable) {
                this.$el.detach();
            } else {
                Backbone.View.prototype.remove.apply(this);
            }
            this.cleanup();
            return this;
        },
        /**
         * 子类可覆盖实现如何进行回退操作
         */
        back: function() {
            history.back();
        },
        /**
         * 由当前页面(this)切换到下一个页面(pageView).
         * 具体的渲染逻辑已经由AppView.renderPage执行了, 这里只要负责实现2个页面如何切换就行了.
         * 子类可以重写这个方法, 实现Page Transitions, 例如滑动(slide)效果.
         *
         * 过度动画分一般分为3个阶段
         * 1. before transition
         * 2. transition
         * 3. after transition
         *
         * 页面过度动画的效果可以参考
         * A showcase collection of various page transition effects using CSS animations.
         * http://tympanus.net/codrops/2013/05/07/a-collection-of-page-transitions/
         * 
         * @param {PageView} pageView 接下来(即将渲染)的页面
         * @param {RenderPageOptions} renderPageOptions
         */
        transitionTo: function(pageView, renderPageOptions) {
            this.remove();
        }
    }, {
        cacheable: true,
        animateTimeoutId: null // 用于终止页面过度动画回调的执行
    });


    /**
     * 渲染页面所需的可选项
     *
     * @constructor Appbone.RenderPageOptions
     */
    Appbone.RenderPageOptions = function() {
        /**
         * 路由是前进(forward)还是后退(back)操作
         * 
         * @member {string}
         */
        this.direction = Appbone.RenderPageOptions.DIRECTION_FORWARD;

        /**
         * 当前路由(例如: signin)
         * 
         * @member {string}
         */
        this.currentAction = '';

        /**
         * 将要执行的路由(例如: index)
         * 
         * @member {string}
         */
        this.comingAction = '';
    };
    /**
     * 路由方向是前进的
     * 
     * @constant {string}
     */
    Appbone.RenderPageOptions.DIRECTION_FORWARD = 'forward';
    /**
     * 路由方向是后退的
     * 
     * @constant {string}
     */
    Appbone.RenderPageOptions.DIRECTION_BACK = 'back';

    return Appbone;
}));