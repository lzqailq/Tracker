import { ReportTracker } from '../types/error';
export class BlankScreenTracker {
  private emptyPoint: number;
  private reportTracker: ReportTracker;
  constructor(reportTracker: ReportTracker) {
    this.reportTracker = reportTracker;
    this.emptyPoint = 0;

    this.load();

    // this.element()
  }
  private load() {
    // 页面状态为complete才进行
    if (document.readyState === 'complete') {
      this.element();
    } else {
      window.addEventListener('load', () => {
        this.element();
        if (this.emptyPoint > 8) {
          let centerElement = document.elementFromPoint(
            window.innerWidth / 2,
            window.innerHeight / 2,
          );
          this.reportTracker({
            kind: 'userAction',
            trackerType: 'blank',
            emptyPoint: this.emptyPoint,
            screen: window.screen.width + 'X' + window.screen.height,
            viewPoint: window.innerWidth + 'X' + window.innerHeight,
            selector: this.getSelector(centerElement), //放中间元素
          });
        }
      });
    }
  }
 
  private element() {
    for (let i = 0; i < 9; i++) {
      let XElement = document.elementFromPoint(
        (window.innerWidth * i) / 10,
        window.innerHeight / 2,
      );
      let YElement = document.elementFromPoint(
        window.innerWidth / 2,
        (window.innerHeight * i) / 10,
      );
      this.isWrapper(XElement);
      this.isWrapper(YElement);
    }
  }
    /**
   * 判断是否白点
   */
  private isWrapper(element?: Element | null) {
    let WrapperElement = ['html', 'body', '#container', '.content'];
    let selector = this.getSelector(element) as string;
    if (WrapperElement.indexOf(selector) != -1) {
      this.emptyPoint++;
    }
  }
  private getSelector<T extends Element | null | undefined>(element: T) {
    if (element?.id) {
      return '#' + element.id;
    } else if (element?.className) {
      // 处理一个dom上面class可能多个的问题
      let className = element.className 
        .split(' ')
        .filter((item) => !!item)
        .join('.');
      return '.' + className;
    } else {
      return element?.nodeName.toLowerCase();
    }
  }
}
