/**
 * 标签页标题切换（从 yilia-plus 移植到 Butterfly）
 *
 * 行为：切到别的标签页时标题变成「我藏好了哦~ 原标题」，
 *       切回来时变成「被你发现啦~ 原标题」，2 秒后恢复原标题。
 *
 * 放置位置：source/js/tab-title-change.js
 * 引入方式：在 _config.butterfly.yml 的 inject.bottom 里加 <script src="/js/tab-title-change.js"></script>
 */
(function () {
  'use strict';

  var CONFIG = {
    leftTitle: '(つェ⊂) 我藏好了哦~ ',
    returnTitle: '(*´∇｀*) 被你发现啦~ ',
    // 切回来后恢复原标题的延迟（毫秒），和 yilia-plus 保持一致
    restoreDelay: 2000
  };

  var originTitle = document.title;
  var titleTimer = null;

  function resetOriginTitle() {
    // 如果此刻不在"被我改过"的状态，说明是正常页面标题，直接记录
    if (document.title !== CONFIG.leftTitle + originTitle &&
        document.title !== CONFIG.returnTitle + originTitle) {
      originTitle = document.title;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (titleTimer) {
        clearTimeout(titleTimer);
        titleTimer = null;
      }
      document.title = CONFIG.leftTitle + originTitle;
    } else {
      document.title = CONFIG.returnTitle + originTitle;
      titleTimer = setTimeout(function () {
        document.title = originTitle;
        titleTimer = null;
      }, CONFIG.restoreDelay);
    }
  });

  // 兼容 Butterfly 的 pjax 无刷新跳转：页面内容换了，标题也要跟着更新
  document.addEventListener('pjax:complete', function () {
    if (titleTimer) {
      clearTimeout(titleTimer);
      titleTimer = null;
    }
    // pjax 跳转后，标题由主题重新写入，此时重新记录基线
    setTimeout(function () {
      if (!document.hidden) {
        originTitle = document.title;
      }
    }, 0);
  });

  // 兜底：有些版本的事件名不同
  document.addEventListener('pjax:success', resetOriginTitle);
})();
