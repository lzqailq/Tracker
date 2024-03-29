import {
  DefaultOptions,
  TrackerConfig,
  Options,
  ErrorParams,
  aliyunParams,
} from '../types/core';
import { createHistoryEvent } from '../utils/pv';
import { utcFormat } from '../utils/timeFormat';
import getAliyun from '../utils/aliyun';
import { userAction } from '../userAction';
import ErrorTracker from '../error/index';
import PerformanceTracker from '../performance/index';
export default class Tracker {
  private data: Options;
  private aliyunOptions?: aliyunParams;

  // public lastEvent: Event;
  constructor(options: Options, aliyunOptions?: aliyunParams) {
    this.data = Object.assign(this.initDef(), options); //把options复制到this.initDef中去，有相同的就会覆盖
    // this.lastEvent = lastEvent()
    this.aliyunOptions = aliyunOptions;
    // this.userAgent = parser.getResult()
    this.installTracker();
  }
  //默认设置
  private initDef(): DefaultOptions {
    // 重写赋值
    window.history['pushState'] = createHistoryEvent('pushState');
    window.history['replaceState'] = createHistoryEvent('replaceState');
    return <DefaultOptions>{
      sdkVersion: TrackerConfig.version,
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      Error: false,
      performance: false,
    };
  }
  /**
   * 事件捕获器
   * @param mouseEventList 事件列表
   * @param targetKey 这个值是后台定的
   * @param data
   */
  private captureEvents<T>(
    mouseEventList: string[],
    targetKey: string,
    data?: T,
  ) {
    mouseEventList.forEach((event, index) => {
      window.addEventListener(event, () => {
        //一旦我们监听到我们就系统自动进行上报
        this.reportTracker({
          kind: 'stability',
          trackerType: 'historyTracker',
          event,
          targetKey,
          data,
        });
      });
    });
  }
  //用来判断是否开启
  private installTracker() {
    if (this.data.historyTracker) {
      this.captureEvents(
        ['pushState', 'replaceState', 'popstate'],
        'history-pv',
      );
    }
    if (this.data.hashTracker) {
      this.captureEvents(['hashchange'], 'hash-pv');
    }
    if (this.data.Error) {
      const errorTrackerObject = new ErrorTracker(
        this.reportTracker.bind(this),
      );
      errorTrackerObject.errorEvent();
    }
    if (this.data.userAction) {
      const userActionTrackerClass = new userAction(
        this.reportTracker.bind(this),
      );
      userActionTrackerClass.eventTracker();
      if (this.data.domTracker) {
        userActionTrackerClass.Dom();
      }
    }
    if (this.data.performance) {
      console.log("开启了performance")
      const performanceTrackerObject = new PerformanceTracker(
        this.reportTracker.bind(this),
      );
      performanceTrackerObject.performanceEvent()
    }
  }
  /**
   * 上报监控数据给后台
   * @param data 传入的数据
   */
  public reportTracker<T extends Record<string, any>>(data: T) {
    //因为第二个参数BodyInit没有json格式
    console.log(data)
    const params = Object.assign({data}, {
      currentTime: utcFormat(new Date().getTime()),
      userAgent: 'fds',
    });
    console.log(params,"params");
    // 发送到自己的后台
    let headers = {
      type: 'application/x-www-form-urlencoded',
    };
    let blob = new Blob([JSON.stringify(params)], headers); //转化成二进制然后进行new一个blob对象,会把是"undefined"消除
    navigator.sendBeacon(this.data.requestUrl, blob);
    // 如果存在发送到阿里云中去
    if (this.aliyunOptions) {
      let { project, host, logstore } = this.aliyunOptions;
      getAliyun(project, host, logstore, params);
    }
  }
  /**
   * 手动上报
   */
  public setTracker<T extends ErrorParams>(data: T) {
    this.reportTracker(data);
  }
  /**
   * 用来设置用户id
   * @param uuid 用户id
   */
  public setUserId<T extends DefaultOptions['uuid']>(uuid: T) {
    this.data.uuid = uuid;
  }
  /**
   * 用来设置透传字段
   * @param extra 透传字段
   */
  public setExtra<T extends DefaultOptions['extra']>(extra: T) {
    this.data.extra = extra;
  }
}
