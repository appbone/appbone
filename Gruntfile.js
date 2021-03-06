/**
 * grunt 构建脚本, 适用构建 JavaScript Library.
 * 
 * 包含的任务有:
 * 1. 代码检查
 * 2. 测试
 * 3. 发布(代码压缩, 替换版本号)
 * 4. 代码分析报告
 *
 * @author https://github.com/ufologist
 */
var config = {
    src: 'src',
    test: 'test',
    dist: 'dist'
};

module.exports = function(grunt) {
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);
    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: config,

        clean: {
            dist: ['<%= config.dist %>']
        },

        concat: {
            dist: {
                src: '<%= config.src %>/<%= pkg.name %>.js',
                dest: '<%= config.dist %>/<%= pkg.name %>-<%= pkg.version %>.js',
            }
        },

        uglify: {
            options: {
                preserveComments: 'some',
                compress: {
                    'drop_console': true
                }
            },
            product: {
                files: {
                    '<%= config.dist %>/<%= pkg.name %>-<%= pkg.version %>.min.js': '<%= config.src %>/*.js'
                }
            }
        },

        // 搜索替换某些特殊的占位符(例如版本号)
        sed: {
            version: {
                path: '<%= config.dist %>',
                pattern: '%VERSION%',
                replacement: '<%= pkg.version %>',
                recursive: true
            },
            date: {
                path: '<%= config.dist %>',
                pattern: '%DATE%',
                replacement: grunt.template.today('yyyy-mm-dd'),
                recursive: true
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                '<%= config.src %>/*.js',
                '<%= config.test %>/*.js'
            ]
        },

        // 使用 karma 而非直接用 jasmine 来进行测试
        // 好处
        // 1. 多(浏览器)平台测试
        // 2. 插件模式, 可执行多种测试(例如mocha, qunit)
        // 3. 方便加入其他测试依赖库, 例如sinon.js
        karma: {
            options: {
                // 默认的karma webserver启动在 http://localhost:9876/
                // 你可以通过浏览器打开来执行测试(在terminal会显示测试结果)
                // 还可以在 http://localhost:9876/debug.html 查看测试真实运行的情况
                // port: 8080,
                reporters: ['dots', 'coverage'],
                // requires karma-**browser**-launcher plugin
                browsers: ['PhantomJS'],
                // all frameworks in Karma require an additional plugin/framework library
                // to be installed (via NPM).
                frameworks: ['jasmine'],
                preprocessors: {
                    // XXX 这里不能使用 '<%= config.src %>/*.js', 不知道为什么
                    'src/*.js': 'coverage'
                },
                coverageReporter: {
                    reporters:[
                        {type: 'lcov'},
                        {type: 'text'}
                    ]
                },
                files: [ // the files be served by Karma's webserver
                    // 你可以方便地在这里加入其他测试时需要用的库(例如: sinon.js)
                    'http://underscorejs.org/underscore-min.js',
                    'http://code.jquery.com/jquery-2.1.0.min.js',
                    'http://backbonejs.org/backbone-min.js',
                    // HTTP URL参考: http://localhost:9876/base/assets/www/lib/jquery.js
                    {pattern: '<%= config.src %>/*.js'},
                    {pattern: '<%= config.test %>/*spec.js'}
                ]
            },

            // This creates a server that will automatically run your tests when you
            // save a file and display results in the terminal.
            daemon: {
                options: {
                    singleRun: false
                }
            },
            // This is useful for running the tests just once.
            run: {
                options: {
                    singleRun: true
                }
            }
        },

        // 从backbone.marionette那里借鉴来的源码分析任务
        plato: {
            options: {
                jshint: grunt.file.readJSON('.jshintrc')
            },
            appbone: {
                src: 'src/*.js',
                dest: 'reports'
            }
        }
    });

    grunt.registerTask('default', function() {
        grunt.task.run([
            'clean',
            'jshint',    // 代码检查
            'karma:run', // test
            'concat',    // 生成未压缩源码
            'uglify',    // minification
            'sed',       // 替换版本号
            'plato'      // JavaScript Source Analysis
        ]);
    });

    // 持续测试
    grunt.registerTask('test', function() {
        grunt.task.run([
            'karma:daemon'
        ]);
    });
};