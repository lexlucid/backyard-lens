#include <std.glsl>

uniform vec4 baseColor;
uniform float alpha;
uniform float selfIllum;

#ifndef NOTEXTURE
uniform sampler2D baseTex;

varying vec2 uv;
#endif

varying vec3 varNormal;

#ifdef VERTEX_SHADER
attribute vec3 position;
attribute vec3 normal;

#ifndef NOTEXTURE
attribute vec2 texture0;
#endif

void main(void) {
#ifndef NOTEXTURE
    uv = texture0;
#endif

    gl_Position = sc_ModelViewProjectionMatrix * vec4(position, 1.0);
    varNormal = normalize(sc_ViewNormalMatrix * normal);
}
#endif

#ifdef FRAGMENT_SHADER
void main(void) {
    vec4 result = baseColor;

#ifndef NOTEXTURE
    result = texture2D(baseTex, uv);
#endif

    float diffuse = abs(dot(varNormal,vec3(0.0, 0.0, 1.0)));
    gl_FragColor = vec4((selfIllum + diffuse*(1.0-selfIllum))*result.xyz, alpha);
}

#endif
