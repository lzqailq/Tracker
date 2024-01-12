(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Tracker = factory());
})(this, (function () { 'use strict';

    var TrackerConfig;
    (function (TrackerConfig) {
        TrackerConfig["version"] = "1.0.0";
    })(TrackerConfig || (TrackerConfig = {}));
    // export interface data{
    //     title:string,
    //     url: Location
    //     timestamp:Date
    //     userAgent:string
    // }

    // 重写pushState和replaceState:因为history监听不到
    const createHistoryEvent = (type) => {
        //获取到函数
        const orign = history[type];
        return function () {
            const res = orign.apply(this, arguments);
            // 创建事件
            const e = new Event(type);
            // 派发事件
            window.dispatchEvent(e);
            return res;
        };
    };
    // window.addEventListener
    // createHistoryEvent("pushState")

    function utcFormat(time) {
        var date = new Date(time), year = date.getFullYear(), month = date.getMonth() + 1 > 9 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1), day = date.getDate() > 9 ? date.getDate() : '0' + date.getDate(), hour = date.getHours() > 9 ? date.getHours() : '0' + date.getHours(), minutes = date.getMinutes() > 9 ? date.getMinutes() : '0' + date.getMinutes(), seconds = date.getSeconds() > 9 ? date.getSeconds() : '0' + date.getSeconds();
        var res = year + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds;
        return res;
    }

    // import lastEvent from "../utils/lastevent";
    // 需要监听的事件
    const MouseEventList = ['click', 'dblclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseenter', 'mouseout', 'mouseover'];
    class Tracker {
        // public lastEvent: Event;
        constructor(options) {
            this.data = Object.assign(this.initDef(), options); //把options复制到this.initDef中去，有相同的就会覆盖
            // this.lastEvent = lastEvent()
            this.installTracker();
        }
        //进行一个默认设置
        initDef() {
            // 重写赋值
            window.history['pushState'] = createHistoryEvent('pushState');
            window.history['replaceState'] = createHistoryEvent('replaceState');
            return {
                sdkVersion: TrackerConfig.version,
                historyTracker: false,
                hashTracker: false,
                domTracker: false,
                jsError: false
            };
        }
        /**
         * 事件捕获器
         * @param mouseEventList 事件列表
         * @param targetKey 这个值是后台定的
         * @param data
         */
        captureEvents(mouseEventList, targetKey, data) {
            mouseEventList.forEach((event, index) => {
                window.addEventListener(event, () => {
                    console.log("监听到了");
                    //一旦我们监听到我们就系统自动进行上报
                    this.reportTracker({
                        kind: 'stability',
                        trackerType: "historyTracker",
                        event,
                        targetKey,
                        data
                    });
                });
            });
        }
        //用来判断是否开启
        installTracker() {
            if (this.data.historyTracker) {
                this.captureEvents(['pushState', 'replaceState', 'popstate'], "history-pv");
            }
            if (this.data.hashTracker) {
                this.captureEvents(['hashchange'], 'hash-pv');
            }
            if (this.data.domTracker) {
                this.targetKeyReport();
            }
            if (this.data.jsError) {
                this.jsError();
            }
        }
        /**
         * 上报监控数据给后台
         * @param data 传入的数据
         */
        reportTracker(data) {
            //因为第二个参数BodyInit没有json格式
            this.data.trackerParams = data;
            const params = Object.assign(this.data, { currentTime: utcFormat(new Date().getTime()) });
            // 发送到自己的后台
            let headers = {
                type: 'application/x-www-form-urlencoded'
            };
            let blob = new Blob([JSON.stringify(params)], headers); //转化成二进制然后进行new一个blob对象
            navigator.sendBeacon(this.data.requestUrl, blob);
            // 发送到阿里云中去
            let project = 'aquan-tracker';
            let host = 'cn-guangzhou.log.aliyuncs.com';
            let logstoreName = 'aquan-logstore';
            let url = `http://${project}.${host}/logstores/${logstoreName}/track`;
            let extraData = this.getExtraData();
            let result = Object.assign(Object.assign({}, data), extraData);
            for (const key in result) {
                if (typeof result[key] == 'number') {
                    result[key] = `${result[key]}`;
                }
            }
            console.log(result);
            let xhr = new XMLHttpRequest;
            let body = JSON.stringify(result);
            xhr.open('post', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('x-log-apiversion', '0.6.0');
            xhr.setRequestHeader('x-log-bodyrawsize', `${body.length}`);
            xhr.onload = function (res) {
                console.log("success");
                console.log(xhr.response);
            };
            xhr.onerror = function (error) {
                console.log("error");
                console.log(error);
            };
            xhr.send(body);
        }
        //DOM事件上报：分出来写
        targetKeyReport() {
            MouseEventList.forEach((event) => {
                window.addEventListener(event, (e) => {
                    const target = e.target;
                    const targetKey = target.getAttribute('target-key');
                    // 看dom上有没有这个属性，如果有就进行上报
                    if (targetKey) {
                        this.reportTracker({
                            kind: 'stability',
                            trackerType: "domTracker",
                            event,
                            targetKey,
                            // selector:e? getSelector(e) : '' //代表最后一个操作的元素
                        });
                    }
                }, {
                    capture: true, //捕获：为了让获得的是最底层的那个，也是为了实现那个路径的功能
                    passive: true //性能优化
                });
            });
        }
        //收集一下
        jsError() {
            this.errorEvent();
            this.promiseError();
        }
        /**
         * 监听普通js错误
         *
         */
        errorEvent() {
            window.addEventListener("error", (event) => {
                // let lastEvent = this.lastEvent;
                // console.log(lastEvent)
                this.reportTracker({
                    kind: 'stability',
                    trackerType: "JsError",
                    targetKey: "message",
                    message: event.message,
                    fileName: event.filename,
                    position: `line:${event.lineno},col:${event.colno}`,
                    stack: this.getLine(event.error.stack),
                    // selector:
                });
            });
        }
        /**
         * 监听promise的错误
         */
        promiseError() {
            window.addEventListener("unhandledrejection", (event) => {
                event.promise.catch(error => {
                    this.reportTracker({
                        kind: 'stability',
                        trackerType: "PromiseError",
                        targetKey: "message",
                        message: error
                    });
                });
            });
        }
        /**
         * 手动上报
         */
        setTracker(data) {
            this.reportTracker(data);
        }
        /**
         * 用来设置用户id
         * @param uuid 用户id
         */
        setUserId(uuid) {
            this.data.uuid = uuid;
        }
        /**
         * 用来设置透传字段
         * @param extra 透传字段
         */
        setExtra(extra) {
            this.data.extra = extra;
        }
        /**
         * 拼接stack
         * @param stack
         * @returns
         */
        getLine(stack) {
            return stack.split('\n').slice(1).map(item => item.replace(/^\s+at\s+/g, "")).join('^');
        }
        getExtraData() {
            return {
                title: document.title,
                // url: Location.url,
                timestamp: Date.now(),
                // userAgent:userAgent.parse(navigator,userAgent).name
                __topic__: "topic",
                "__source__": "source",
                "__logs__": [],
                __tags__: "fdsa"
            };
        }
    }

    return Tracker;

}));
