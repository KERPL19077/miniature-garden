/* The only file that talks to the LMS (DP-1002).
 * init() -> {learnerId, status, savedState}; saveState(s); setProgress(pct); submit(result) -> Promise<ack>; exit().
 * Detection order (DP-1003): SCORM API in parent windows -> postMessage handshake -> Ulipsu app bridge -> Standalone.
 */
(function () {
  var C = window.CONTENT;
  var A = { mode: 'standalone', learnerId: null, banner: false };
  var scorm = null, ver = null, pm = null, waiters = {};

  function findAPI(name) {
    var w = window, n = 0;
    try { while (w && !w[name] && w.parent && w.parent !== w && n++ < 10) w = w.parent; return w && w[name] ? w[name] : null; } catch (e) { return null; }
  }
  function parse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function targetOrigin() {
    if (C.allowedOrigins && C.allowedOrigins.length) return C.allowedOrigins[0];
    try { return document.referrer ? new URL(document.referrer).origin : null; } catch (e) { return null; }
  }

  function send(type, payload) { // never posts to "*" (DP-1005)
    var o = targetOrigin(); if (!o || !window.parent || window.parent === window) return false;
    window.parent.postMessage({ type: type, version: 1, payload: payload }, o); return true;
  }
  window.addEventListener('message', function (ev) {
    var d = ev.data; if (!d || !d.type || (C.allowedOrigins.length && C.allowedOrigins.indexOf(ev.origin) < 0)) return;
    var w = waiters[d.type]; if (w) { delete waiters[d.type]; w(d.payload || {}); }
  });
  function ask(type, payload, replyType, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { delete waiters[replyType]; rej(new Error('timeout')); }, ms);
      waiters[replyType] = function (p) { clearTimeout(t); res(p); };
      if (!send(type, payload)) { clearTimeout(t); delete waiters[replyType]; rej(new Error('no parent')); }
    });
  }

  A.init = function () {
    var s04 = findAPI('API_1484_11'), s12 = s04 ? null : findAPI('API');
    try {
      if (s04) { scorm = s04; ver = '2004'; s04.Initialize('');
        var sd = s04.GetValue('cmi.suspend_data'), cs = s04.GetValue('cmi.completion_status');
        A.mode = 'scorm2004'; A.learnerId = s04.GetValue('cmi.learner_id') || null;
        return Promise.resolve({ learnerId: A.learnerId, status: cs === 'completed' ? 'submitted' : sd ? 'in-progress' : 'new', savedState: parse(sd) }); }
      if (s12) { scorm = s12; ver = '1.2'; s12.LMSInitialize('');
        var sd2 = s12.LMSGetValue('cmi.suspend_data'), ls = s12.LMSGetValue('cmi.core.lesson_status');
        A.mode = 'scorm12'; A.learnerId = s12.LMSGetValue('cmi.core.student_id') || null;
        return Promise.resolve({ learnerId: A.learnerId, status: ls === 'completed' || ls === 'passed' ? 'submitted' : sd2 ? 'in-progress' : 'new', savedState: parse(sd2) }); }
    } catch (e) { scorm = null; }
    var go = (C.allowedOrigins && C.allowedOrigins.length)
      ? ask('dp.init', { projectId: C.id, version: C.version }, 'dp.init.ack', 3000).then(function (p) { pm = true; A.mode = 'postMessage'; A.learnerId = p.learnerId || null; return { learnerId: A.learnerId, status: p.status || 'new', savedState: p.savedState || null }; })
      : Promise.reject(new Error('skip'));
    return go.catch(function () {
      if (window.UlipsuBridge && (window.UlipsuChannel || (window.parent && window.parent !== window))) {
        A.mode = 'ulipsu'; A.learnerId = window.UlipsuBridge.getUserId ? window.UlipsuBridge.getUserId() : null;
      } else { A.mode = 'standalone'; A.banner = true; }
      return { learnerId: A.learnerId, status: 'new', savedState: null };
    });
  };

  A.saveState = function (state) {
    var txt = JSON.stringify(state);
    try {
      if (scorm && ver === '2004') { scorm.SetValue('cmi.suspend_data', txt.slice(0, 64000)); scorm.Commit(''); }
      else if (scorm) { scorm.LMSSetValue('cmi.core.lesson_status', 'incomplete'); scorm.LMSSetValue('cmi.suspend_data', txt.slice(0, 3500)); scorm.LMSCommit(''); } // 4,096 limit (DP-1004)
      else if (pm) send('dp.state', { state: state });
      else if (A.mode === 'ulipsu' && window.UlipsuBridge) window.UlipsuBridge.saveProgress({ event: 'state_saved' });
    } catch (e) { /* a save failure never blocks progress (DP-405) */ }
  };
  // Start a clean attempt after browser refresh; clear resumable SCORM state.
  A.resetResume = function () {
    try {
      if (scorm && ver === '2004') {
        scorm.SetValue('cmi.suspend_data', '');
        scorm.SetValue('cmi.progress_measure', '0');
        scorm.SetValue('cmi.completion_status', 'incomplete');
        scorm.Commit('');
      } else if (scorm) {
        scorm.LMSSetValue('cmi.suspend_data', '');
        scorm.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        scorm.LMSCommit('');
      }
    } catch (e) { /* reset must not prevent a fresh local attempt */ }
  };
  A.setProgress = function (pct) {
    try {
      if (scorm && ver === '2004') scorm.SetValue('cmi.progress_measure', String(Math.max(0, Math.min(1, pct / 100))));
      else if (pm) send('dp.progress', { percent: pct });
    } catch (e) {}
  };

  function once(result) {
    var p = result.score, pct = p.percent;
    if (scorm && ver === '2004') {
      scorm.SetValue('cmi.score.raw', String(p.points)); scorm.SetValue('cmi.score.min', '0'); scorm.SetValue('cmi.score.max', '1000');
      scorm.SetValue('cmi.score.scaled', String(pct / 100)); scorm.SetValue('cmi.completion_status', 'completed');
      scorm.SetValue('cmi.session_time', 'PT' + result.durationSec + 'S'); scorm.Commit(''); return Promise.resolve({ ok: true });
    }
    if (scorm) {
      scorm.LMSSetValue('cmi.core.score.raw', String(p.points)); scorm.LMSSetValue('cmi.core.score.min', '0'); scorm.LMSSetValue('cmi.core.score.max', '1000');
      scorm.LMSSetValue('cmi.core.lesson_status', 'completed');
      var t = result.durationSec, hh = ('0' + Math.floor(t / 3600)).slice(-2), mm = ('0' + Math.floor(t % 3600 / 60)).slice(-2), ss = ('0' + t % 60).slice(-2);
      scorm.LMSSetValue('cmi.core.session_time', hh + ':' + mm + ':' + ss); scorm.LMSCommit(''); return Promise.resolve({ ok: true });
    }
    if (pm) return ask('dp.submit', result, 'dp.submit.ack', 10000);
    if (A.mode === 'ulipsu' && window.UlipsuBridge) { window.UlipsuBridge.complete({ result: result }); return Promise.resolve({ ok: true }); }
    return Promise.resolve({ ok: true, preview: true }); // Standalone: nothing is stored
  }
  // resolves only when the LMS confirms; 3 retries with increasing delay (DP-1006)
  A.submit = function (result) {
    var n = 0;
    function tryOnce() {
      return once(result).catch(function (e) {
        if (++n > 3) throw e;
        return new Promise(function (r) { setTimeout(r, 800 * n); }).then(tryOnce);
      });
    }
    return tryOnce();
  };
  A.exit = function () { try { if (scorm && ver === '2004') scorm.Terminate(''); else if (scorm) scorm.LMSFinish(''); else if (pm) send('dp.exit', {}); } catch (e) {} };

  window.LmsAdapter = A;
})();
