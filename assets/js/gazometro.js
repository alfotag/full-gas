/* Il Gazometro disegnato: un cilindro a traliccio in prospettiva, su canvas 2D, senza librerie.
   32 colonne, 9 anelli, croci di Sant'Andrea nei pannelli. Ruota piano, segue il puntatore,
   si alza con lo scorrimento. La luce arriva da destra, bassa: il lato illuminato è arancione. */
(function () {
  'use strict';
  function Gazometro(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.o = Object.assign({ columns: 32, levels: 9, radius: 1, height: 1.9, ringSegs: 96, diagEvery: 1 }, opts || {});
    this.theta = 0.6; this.mx = 0; this.my = 0; this.scroll = 0; this.dpr = 1; this.alive = true; this.t0 = performance.now();
    this.dust = []; for (var i = 0; i < 70; i++) this.dust.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 1.2, v: 0.00004 + Math.random() * 0.00012, a: Math.random() * 6.28 });
    this.build(); this.resize();
    var self = this; window.addEventListener('resize', function () { self.resize(); }, { passive: true });
  }
  Gazometro.prototype.build = function () {
    var o = this.o, pts = [], segs = [];
    var n = o.columns, L = o.levels, R = o.radius, H = o.height;
    // punti: griglia colonne x livelli
    for (var l = 0; l <= L; l++) for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2; pts.push([Math.cos(a) * R, l / L * H - H / 2, Math.sin(a) * R]);
    }
    var id = function (l, i) { return l * n + ((i % n) + n) % n; };
    for (var l2 = 0; l2 <= L; l2++) for (var i2 = 0; i2 < n; i2++) {
      if (l2 < L) segs.push([id(l2, i2), id(l2 + 1, i2), 0]);                       // colonne
      if (l2 < L && ((i2 + l2) % o.diagEvery === 0)) { segs.push([id(l2, i2), id(l2 + 1, i2 + 1), 1]); segs.push([id(l2 + 1, i2), id(l2, i2 + 1), 1]); } // croci
    }
    // anelli, più fitti delle colonne
    var rs = o.ringSegs, base = pts.length;
    for (var l3 = 0; l3 <= L; l3++) for (var k = 0; k < rs; k++) {
      var a2 = k / rs * Math.PI * 2; pts.push([Math.cos(a2) * R, l3 / L * H - H / 2, Math.sin(a2) * R]);
    }
    for (var l4 = 0; l4 <= L; l4++) for (var k2 = 0; k2 < rs; k2++) segs.push([base + l4 * rs + k2, base + l4 * rs + ((k2 + 1) % rs), 2]);
    // la scala esterna (una torretta a lato, come quella vera)
    var sb = pts.length, sa = Math.PI * 0.22, sr = R * 1.06;
    for (var l5 = 0; l5 <= L; l5++) { pts.push([Math.cos(sa) * sr, l5 / L * H - H / 2, Math.sin(sa) * sr]); pts.push([Math.cos(sa + 0.09) * sr, l5 / L * H - H / 2, Math.sin(sa + 0.09) * sr]); }
    for (var l6 = 0; l6 <= L; l6++) { segs.push([sb + l6 * 2, sb + l6 * 2 + 1, 3]); if (l6 < L) { segs.push([sb + l6 * 2, sb + l6 * 2 + 2, 3]); segs.push([sb + l6 * 2 + 1, sb + l6 * 2 + 3, 3]); segs.push([sb + l6 * 2, sb + l6 * 2 + 3, 3]); } }
    this.pts = pts; this.segs = segs; this.proj = new Float32Array(pts.length * 3);
  };
  Gazometro.prototype.resize = function () {
    var r = this.c.getBoundingClientRect();
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };
  Gazometro.prototype.frame = function (now) {
    if (!this.alive) return;
    var ctx = this.ctx, w = this.w, h = this.h, t = (now - this.t0) / 1000;
    this.theta += 0.0022 + this.scroll * 0.004;
    var reduce = this.reduce;
    var mx = reduce ? 0 : this.mx, my = reduce ? 0 : this.my, sc = this.scroll;
    // camera: davanti al cilindro, un po' sotto; sale scorrendo
    var camY = -0.55 + sc * 1.6 + my * 0.12, camZ = 3.1 - sc * 0.6, camX = mx * 0.25;
    var f = 1.55 * Math.min(w, h * 1.25); // focale
    var cx = w * 0.62 + mx * 24, cy = h * 0.5 + my * 16;
    var ct = Math.cos(this.theta), st = Math.sin(this.theta);
    var pts = this.pts, P = this.proj;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], x = p[0] * ct - p[2] * st, z = p[0] * st + p[2] * ct, y = p[1];
      // vista: camera in (camX, camY, camZ) che guarda verso il centro, leggermente all'insù
      var dz = z + camZ, dx = x - camX, dy = y - camY;
      var tilt = 0.18 - sc * 0.5; // il naso si alza scorrendo
      var yy = dy * Math.cos(tilt) - dz * Math.sin(tilt), zz = dy * Math.sin(tilt) + dz * Math.cos(tilt);
      var k = f / Math.max(0.35, zz);
      P[i * 3] = cx + dx * k; P[i * 3 + 1] = cy - yy * k; P[i * 3 + 2] = zz;
    }
    ctx.clearRect(0, 0, w, h);
    // alone basso a destra: il sole che taglia
    var g = ctx.createRadialGradient(w * 0.86, h * 0.62, 10, w * 0.86, h * 0.62, Math.max(w, h) * 0.55);
    g.addColorStop(0, 'rgba(254,67,9,' + (0.22 + 0.04 * Math.sin(t * 0.7)) + ')'); g.addColorStop(0.35, 'rgba(255,161,0,0.07)'); g.addColorStop(1, 'rgba(11,12,14,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // segmenti, ordinati per profondità: prima i lontani
    var segs = this.segs, order = this.order || (this.order = new Array(segs.length));
    for (var s = 0; s < segs.length; s++) order[s] = s;
    var self = this;
    order.sort(function (a, b) { return (P[segs[b][0] * 3 + 2] + P[segs[b][1] * 3 + 2]) - (P[segs[a][0] * 3 + 2] + P[segs[a][1] * 3 + 2]); });
    ctx.lineCap = 'round';
    for (var q = 0; q < order.length; q++) {
      var sg = segs[order[q]], a = sg[0], b = sg[1], kind = sg[2];
      var za = P[a * 3 + 2], zb = P[b * 3 + 2], zm = (za + zb) / 2;
      if (za < 0.4 || zb < 0.4) continue;
      var depth = Math.max(0, Math.min(1, (zm - 1.4) / 3.2)); // 0 vicino, 1 lontano
      // lato illuminato: la normale del punto (rispetto all'asse) verso destra e verso la camera
      var pa = pts[a], nx = pa[0] * ct - pa[2] * st, nz = pa[0] * st + pa[2] * ct;
      var lit = Math.max(0, nx * 0.85 + (-nz) * 0.35);
      var alpha = (kind === 1 ? 0.28 : kind === 2 ? 0.5 : kind === 3 ? 0.55 : 0.6) * (1 - depth * 0.78);
      var r = 245, gg = 240, bb = 235;
      if (lit > 0.2) { var m = Math.min(1, (lit - 0.2) * 1.4); r = 245 + (254 - 245) * m; gg = 240 + (110 - 240) * m; bb = 235 + (20 - 235) * m; alpha *= 1 + m * 0.6; }
      ctx.strokeStyle = 'rgba(' + (r | 0) + ',' + (gg | 0) + ',' + (bb | 0) + ',' + Math.min(0.95, alpha).toFixed(3) + ')';
      ctx.lineWidth = (kind === 2 ? 1.6 : kind === 0 ? 1.4 : 0.8) * (1.15 - depth * 0.6);
      ctx.beginPath(); ctx.moveTo(P[a * 3], P[a * 3 + 1]); ctx.lineTo(P[b * 3], P[b * 3 + 1]); ctx.stroke();
    }
    // pulviscolo
    if (!reduce) {
      ctx.fillStyle = 'rgba(255,161,0,0.55)';
      for (var d = 0; d < this.dust.length; d++) {
        var du = this.dust[d]; du.y -= du.v * 16; du.x += Math.sin(t * 0.4 + du.a) * 0.00008; if (du.y < -0.02) { du.y = 1.02; du.x = Math.random(); }
        var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + du.a));
        ctx.globalAlpha = tw * 0.5; ctx.beginPath(); ctx.arc(du.x * w, du.y * h, du.s, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };
  Gazometro.prototype.start = function () {
    var self = this; this.alive = true;
    var loop = function (now) { if (!self.alive) return; if (self.visible !== false) self.frame(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
  Gazometro.prototype.stop = function () { this.alive = false; };
  window.Gazometro = Gazometro;
})();
