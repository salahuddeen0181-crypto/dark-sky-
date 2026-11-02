'use client';
// An uploaded clip: the file holds the picture on top and its mask below (clip-worker.js), joined here on a canvas.
// The poster stays until the first frame is drawn, and comes back if the browser takes the canvas away (they keep
// about 16 of them per page) or has no WebGL.
import React from 'react';

const VS = 'attribute vec2 p;varying vec2 u;void main(){u=vec2(p.x+1.,1.-p.y)*.5;gl_Position=vec4(p,0.,1.);}';
const FS = 'precision mediump float;uniform sampler2D t;varying vec2 u;void main(){vec3 c=texture2D(t,vec2(u.x,u.y*.5)).rgb;float a=texture2D(t,vec2(u.x,.5+u.y*.5)).r;gl_FragColor=vec4(c*a,a);}';

function joinFrames(video, canvas, onLive) {
  let gl = null, frame = 0, stopped = false;
  const setup = () => {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return false;
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(prog, s); }
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return true;
  };
  const draw = () => {
    if (!gl || gl.isContextLost() || video.readyState < 2) return;
    const w = video.videoWidth, h = video.videoHeight >> 1;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    onLive(true);
  };
  const tick = () => {
    if (stopped) return;
    draw();
    frame = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  };
  const start = () => { video.removeEventListener('playing', start); if (setup()) tick(); };
  const lost = e => { e.preventDefault(); onLive(false); };
  video.addEventListener('playing', start);
  canvas.addEventListener('webglcontextlost', lost);
  return () => {
    stopped = true;
    video.removeEventListener('playing', start); canvas.removeEventListener('webglcontextlost', lost);
    if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frame); else cancelAnimationFrame(frame);
    gl?.getExtension('WEBGL_lose_context')?.loseContext(); // give the context back: browsers keep few per page
  };
}

export default function AlphaClip({ videoRef, poster, style }) {
  const canvas = React.useRef(null), [live, setLive] = React.useState(false);
  React.useEffect(() => joinFrames(videoRef.current, canvas.current, setLive), [videoRef]);
  const fill = { ...style, position: 'absolute', inset: 0 };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src={poster} alt="" loading="lazy" style={{ ...fill, opacity: live ? 0 : 1 }} /> {/* eslint-disable-line @next/next/no-img-element */}
      <canvas ref={canvas} style={fill} />
      <video ref={videoRef} muted loop playsInline preload="none" style={{ position: 'absolute', width: 2, height: 2, opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}
