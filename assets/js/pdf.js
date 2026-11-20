/* Minimal offline PDF writer (DP-401): base-14 fonts, shapes, and the vector Ulipsu logo. Latin-1 text only. */
window.MiniPDF = function (W, H) {
  var pages = [], cs = null;
  var MAP = { '₹': 'Rs ', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '×': 'x', '÷': '/', '★': '*', '☆': '-', '✓': '', '…': '...', '→': '>', '·': '-', '•': '-' };
  var HW = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var FONT = { sans: 1, bold: 2, serif: 3, serifb: 4, serifi: 5 }, FW = { 1: 1, 2: 1.06, 3: 0.93, 4: 0.97, 5: 0.9 };
  function esc(s) { return String(s).replace(/[^\x20-\x7E]/g, function (c) { return MAP[c] || '?'; }).replace(/([\\()])/g, '\\$1'); }
  function col(c) { c = c || '#000000'; return [1, 3, 5].map(function (i) { return (parseInt(c.substr(i, 2), 16) / 255).toFixed(3); }).join(' '); }
  function n(x) { return x.toFixed(2); }
  function width(s, size, f) { var w = 0; esc(s).split('').forEach(function (ch) { w += HW[ch.charCodeAt(0) - 32] || 556; }); return w * size / 1000 * FW[FONT[f || 'sans']]; }
  function paint(fill, stroke, evenodd) { return fill && stroke ? (evenodd ? 'B*' : 'B') : fill ? (evenodd ? 'f*' : 'f') : 'S'; }
  function style(fill, stroke, lw) { return (fill ? col(fill) + ' rg ' : '') + (stroke ? col(stroke) + ' RG ' + (lw || 1) + ' w ' : ''); }
  var api = {
    width: width,
    page: function () { cs = []; pages.push(cs); return api; },
    text: function (x, y, s, size, f, c, align, spacing) {
      var w = width(s, size, f) + (spacing ? spacing * s.length : 0), xx = align === 'c' ? x - w / 2 : align === 'r' ? x - w : x;
      cs.push('BT /F' + FONT[f || 'sans'] + ' ' + size + ' Tf ' + col(c) + ' rg ' + (spacing || 0) + ' Tc ' + n(xx) + ' ' + n(H - y) + ' Td (' + esc(s) + ') Tj ET'); return api;
    },
    para: function (x, y, s, size, maxW, lead, f, c, align) { // wraps by measured width; returns the next y
      var words = String(s).split(/\s+/), line = '', yy = y;
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (width(t, size, f) > maxW && line) { api.text(align === 'c' ? x + maxW / 2 : x, yy, line, size, f, c, align); yy += lead; line = w; } else line = t; });
      if (line) { api.text(align === 'c' ? x + maxW / 2 : x, yy, line, size, f, c, align); yy += lead; }
      return yy;
    },
    rect: function (x, y, w, h, fill, stroke, lw) { cs.push(style(fill, stroke, lw) + n(x) + ' ' + n(H - y - h) + ' ' + n(w) + ' ' + n(h) + ' re ' + paint(fill, stroke)); return api; },
    line: function (x1, y1, x2, y2, c, w, dash) { cs.push(col(c) + ' RG ' + (w || 1) + ' w ' + (dash ? '[' + dash + '] 0 d ' : '') + n(x1) + ' ' + n(H - y1) + ' m ' + n(x2) + ' ' + n(H - y2) + ' l S' + (dash ? ' [] 0 d' : '')); return api; },
    poly: function (pts, fill, stroke, lw) { var o = style(fill, stroke, lw); pts.forEach(function (p, i) { o += n(p[0]) + ' ' + n(H - p[1]) + (i ? ' l ' : ' m '); }); cs.push(o + 'h ' + paint(fill, stroke)); return api; },
    circle: function (cx, cy, r, fill, stroke, lw) {
      var k = 0.5523 * r, X = cx, Y = H - cy;
      cs.push(style(fill, stroke, lw) + n(X + r) + ' ' + n(Y) + ' m ' + [[X + r, Y + k, X + k, Y + r, X, Y + r], [X - k, Y + r, X - r, Y + k, X - r, Y], [X - r, Y - k, X - k, Y - r, X, Y - r], [X + k, Y - r, X + r, Y - k, X + r, Y]].map(function (a) { return a.map(n).join(' ') + ' c'; }).join(' ') + ' ' + paint(fill, stroke)); return api;
    },
    star: function (cx, cy, R, r, pts, fill, stroke, lw) { var a = []; for (var i = 0; i < pts * 2; i++) { var rr = i % 2 ? r : R, t = Math.PI * i / pts - Math.PI / 2; a.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); } return api.poly(a, fill, stroke, lw); },
    logo: function (x, y, w) { // vector logo from window.ULIPSU_LOGO
      var L = window.ULIPSU_LOGO; if (!L) return api; var k = w / L.w;
      L.paths.forEach(function (p) {
        var t = p.d.match(/[MLChvz]|-?[\d.]+/g), o = col(p.f) + ' rg ', i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
        function X(v) { return n(x + v * k); } function Y(v) { return n(H - (y + v * k)); }
        while (i < t.length) {
          var c = t[i++];
          if (c === 'M') { cx = +t[i++]; cy = +t[i++]; sx = cx; sy = cy; o += X(cx) + ' ' + Y(cy) + ' m '; }
          else if (c === 'L') { cx = +t[i++]; cy = +t[i++]; o += X(cx) + ' ' + Y(cy) + ' l '; }
          else if (c === 'C') { var v = [+t[i++], +t[i++], +t[i++], +t[i++], +t[i++], +t[i++]]; o += X(v[0]) + ' ' + Y(v[1]) + ' ' + X(v[2]) + ' ' + Y(v[3]) + ' ' + X(v[4]) + ' ' + Y(v[5]) + ' c '; cx = v[4]; cy = v[5]; }
          else if (c === 'h') { cx += +t[i++]; o += X(cx) + ' ' + Y(cy) + ' l '; }
          else if (c === 'v') { cy += +t[i++]; o += X(cx) + ' ' + Y(cy) + ' l '; }
          else if (c === 'z') { o += 'h '; cx = sx; cy = sy; }
        }
        cs.push(o + (p.e ? 'f*' : 'f'));
      });
      return api;
    },
    build: function () {
      var objs = [], out = '%PDF-1.4\n', offs = [], base = ['Helvetica', 'Helvetica-Bold', 'Times-Bold', 'Times-BoldItalic', 'Times-Italic'];
      function add(s) { objs.push(s); return objs.length; }
      add('<< /Type /Catalog /Pages 2 0 R >>'); add('');
      base.forEach(function (f) { add('<< /Type /Font /Subtype /Type1 /BaseFont /' + f + ' /Encoding /WinAnsiEncoding >>'); });
      var kids = [];
      pages.forEach(function (p) {
        var body = p.join('\n'), cid = objs.length + 2;
        var pid = add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R /F5 7 0 R >> >> /Contents ' + cid + ' 0 R >>');
        add('<< /Length ' + body.length + ' >>\nstream\n' + body + '\nendstream'); kids.push(pid + ' 0 R');
      });
      objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';
      objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
      var x = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
      offs.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
      out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
      var u = new Uint8Array(out.length); for (var i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255; return u;
    },
    blob: function () { return new Blob([api.build()], { type: 'application/pdf' }); },
    base64: function () { var u = api.build(), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  };
  return api;
};
