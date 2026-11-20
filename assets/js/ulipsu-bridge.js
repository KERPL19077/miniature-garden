/* ===== ULIPSU HTML5 BRIDGE SDK v1.2 =====
 * Universal communication layer between Ulipsu HTML5 activities and:
 *   1. Flutter Mobile App WebView (via window.UlipsuChannel)
 *   2. Ulipsu Web Portal & file:// Test Harness (via window.parent.postMessage)
 *   3. Standalone Local Browser (graceful fallback)
 */
window.UlipsuBridge = (function () {
  var _session = {
    userId: null,
    student: {},
    context: {},
    completed: false,
    startedAt: new Date().toISOString()
  };

  var _config = {
    activityId: 'UNKNOWN',
    version: 1,
    getState: function () { return {}; },
    setState: function (savedState, student, context) {},
    getMetrics: function () { return {}; },
    getActivityData: function () { return {}; },
    getSteps: function () { return []; },
    jumpToStep: function (idx) {}
  };

  // Check URL query params (?user_id=...&name=...&grade=...) as an automatic fallback
  (function parseUrlParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var uid = params.get('user_id') || params.get('userId');
      var name = params.get('student_name') || params.get('name');
      var grade = params.get('grade');
      if (uid) _session.userId = uid;
      if (uid || name || grade) {
        _session.student = {
          id: uid || '',
          name: name || '',
          grade: grade || ''
        };
      }
      if (params.get('ilm_id') || params.get('lesson_id')) {
        _session.context = {
          ilmId: params.get('ilm_id') || '',
          lessonId: params.get('lesson_id') || ''
        };
      }
    } catch (e) {}
  })();

  function postToHost(type, payload) {
    var envelope = {
      source: 'ulipsu-html5',
      type: type,
      activityId: _config.activityId,
      userId: _session.userId || (_session.student && _session.student.id) || null,
      context: _session.context,
      timestamp: Date.now(),
      payload: payload
    };
    var jsonStr = JSON.stringify(envelope);

    // 0. Always log to Browser Inspect Console so developers can inspect events directly
    try {
      var badgeColor = type === 'COMPLETED' ? '#16a34a' : type === 'READY' ? '#0284c7' : type === 'DOWNLOAD_FILE' ? '#d97706' : '#7c3aed';
      console.log(
        '%c[UlipsuBridge]%c ' + type + ' %c(' + _config.activityId + ')',
        'color:#38bdf8;font-weight:bold',
        'background:' + badgeColor + ';color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
        'color:#94a3b8',
        payload
      );
    } catch (e) {}

    // 1. Flutter Mobile WebView JavaScriptChannel
    if (window.UlipsuChannel && typeof window.UlipsuChannel.postMessage === 'function') {
      try {
        window.UlipsuChannel.postMessage(jsonStr);
      } catch (e) {
        console.warn('[UlipsuBridge] UlipsuChannel error:', e);
      }
    }

    // 2. Ulipsu Web App or Test Harness (Parent iframe - works across file:// and cross-origin!)
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(envelope, '*');
      } catch (e) {
        console.warn('[UlipsuBridge] parent.postMessage error:', e);
      }
    }
  }

  function buildPayload(isCompleted, extra) {
    var m = (_config.getMetrics && _config.getMetrics()) || {};
    var actData = (_config.getActivityData && _config.getActivityData()) || {};
    var pts = m.pts || 0;
    var maxPts = m.maxPts || 100;
    var userId = _session.userId || (_session.student && _session.student.id) || m.userId || null;
    if (isCompleted || m.stepId === 'done' || m.completed) {
      _session.completed = true;
    }
    var done = !!(_session.completed || isCompleted);

    return Object.assign({
      user_id: userId,
      activity_id: _config.activityId,
      completed: done,
      status: done ? 'completed' : 'incomplete',
      started_at: _session.startedAt,
      updated_at: new Date().toISOString(),
      step: {
        index: m.stepIndex || 0,
        id: m.stepId || '',
        total: m.totalSteps || 1,
        progress_percent: m.progressPercent || 0,
        steps_list: (_config.getSteps && _config.getSteps()) || []
      },
      score: {
        points_obtained: pts,
        max_points: maxPts,
        accuracy_percent: maxPts > 0 ? Math.round((pts / maxPts) * 100) : 0,
        xp_earned: m.xp || 0,
        level: m.level || null,
        medal: m.medal || null,
        badges_earned: m.badges || []
      },
      activity_data: {
        selections: actData.selections || {},
        tasks_breakdown: m.tasks || {},
        question_responses: actData.responses || []
      },
      state: (_config.getState && _config.getState()) || {}
    }, extra || {});
  }

  // Host -> HTML5: Pass user_id, student profile, lesson context, and any saved state from backend
  window.ulipsuInit = function (initData) {
    try {
      var data = typeof initData === 'string' ? JSON.parse(initData) : (initData || {});
      var student = data.student || {};
      var userId = data.user_id || data.userId || student.id || _session.userId || null;
      if (userId) {
        _session.userId = String(userId);
        student.id = String(userId);
      }
      _session.student = Object.assign(_session.student, student);
      if (data.context) {
        _session.context = Object.assign(_session.context, data.context);
      }
      if (_config.setState) {
        _config.setState(data.state || null, _session.student, _session.context);
      }
      try {
        console.log(
          '%c[UlipsuBridge]%c HOST_INIT %c(user_id: ' + (_session.userId || 'none') + ')',
          'color:#38bdf8;font-weight:bold',
          'background:#0f766e;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
          'color:#94a3b8',
          data
        );
      } catch (e) {}
      // Immediately send back an updated PROGRESS snapshot so the host knows init succeeded
      postToHost('PROGRESS', buildPayload(false, { event: 'init_hydrated' }));
      return true;
    } catch (e) {
      console.error('[UlipsuBridge] ulipsuInit failed:', e);
      return false;
    }
  };

  // Host -> HTML5: Synchronous state pull (used by Flutter on PopScope / back press)
  window.ulipsuGetState = function () {
    try {
      return JSON.stringify(buildPayload(false));
    } catch (e) {
      return '{}';
    }
  };

  // Listen for Web / Test Harness iframe parent messages (works even on file:// origins!)
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d) return;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch (e) { return; }
    }
    if (!d || !d.type) return;

    if (d.type === 'ULIPSU_INIT') {
      window.ulipsuInit(d.payload);
    } else if (d.type === 'ULIPSU_GET_STATE') {
      postToHost('STATE_SNAPSHOT', buildPayload(false, { reason: (d.payload && d.payload.reason) || 'requested' }));
    } else if (d.type === 'ULIPSU_JUMP_STEP') {
      if (_config.jumpToStep && d.payload && d.payload.stepIndex !== undefined) {
        _config.jumpToStep(Number(d.payload.stepIndex), d.payload.student);
      }
    } else if (d.type === 'ULIPSU_CLEAR_STORAGE') {
      try { localStorage.clear(); } catch (e) {}
      if (d.payload && d.payload.reload) {
        window.location.reload();
      }
    }
  });

  return {
    init: function (config) {
      _config = Object.assign(_config, config || {});
      if (_session.userId || (_session.student && _session.student.name)) {
        if (_config.setState) {
          _config.setState(null, _session.student, _session.context);
        }
      }
      var steps = (_config.getSteps && _config.getSteps()) || [];
      postToHost('READY', {
        activity_id: _config.activityId,
        version: _config.version || 1,
        user_id: _session.userId,
        steps_list: steps,
        current_state: buildPayload(false)
      });
    },
    getUserId: function () {
      return _session.userId;
    },
    resetCompletion: function () {
      _session.completed = false;
    },
    saveProgress: function (extra) {
      postToHost('PROGRESS', buildPayload(_session.completed, extra));
    },
    complete: function (extra) {
      _session.completed = true;
      postToHost('COMPLETED', buildPayload(true, extra));
    },
    downloadBlob: function (blob, fileName, mimeType) {
      return new Promise(function (resolve) {
        var inFlutter = !!(window.UlipsuChannel && typeof window.UlipsuChannel.postMessage === 'function');
        var inIframe = !!(window.parent && window.parent !== window);

        if (inFlutter || inIframe) {
          var reader = new FileReader();
          reader.onloadend = function () {
            try {
              var res = String(reader.result || '');
              var comma = res.indexOf(',');
              var b64 = comma >= 0 ? res.substring(comma + 1) : res;
              postToHost('DOWNLOAD_FILE', {
                user_id: _session.userId,
                activity_id: _config.activityId,
                fileName: fileName,
                mimeType: mimeType || blob.type || 'application/pdf',
                size: blob.size || 0,
                base64: b64,
                isProjectReport: true
              });
              resolve(true);
            } catch (e) {
              resolve(false);
            }
          };
          reader.onerror = function () { resolve(false); };
          reader.readAsDataURL(blob);
          if (inFlutter) return;
        }

        // Standard browser download fallback (for standalone browser or web portal)
        try {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });
    }
  };
})();
