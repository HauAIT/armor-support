"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cropBase64Image = cropBase64Image;
exports.requireSharp = requireSharp;
require("source-map-support/register");
let _sharp;
function requireSharp() {
  if (!_sharp) {
    try {
      _sharp = require('sharp');
    } catch (err) {
      throw new Error(`Cannot load the 'sharp' module needed for images processing. ` + `Consider visiting https://sharp.pixelplumbing.com/install ` + `for troubleshooting. Original error: ${err.message}`);
    }
  }
  return _sharp;
}
async function cropBase64Image(base64Image, rect) {
  const buf = await requireSharp()(Buffer.from(base64Image, 'base64')).extract(rect).toBuffer();
  return buf.toString('base64');
}require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2ltYWdlLXV0aWwuanMiLCJuYW1lcyI6WyJfc2hhcnAiLCJyZXF1aXJlU2hhcnAiLCJyZXF1aXJlIiwiZXJyIiwiRXJyb3IiLCJtZXNzYWdlIiwiY3JvcEJhc2U2NEltYWdlIiwiYmFzZTY0SW1hZ2UiLCJyZWN0IiwiYnVmIiwiQnVmZmVyIiwiZnJvbSIsImV4dHJhY3QiLCJ0b0J1ZmZlciIsInRvU3RyaW5nIl0sInNvdXJjZVJvb3QiOiIuLi8uLiIsInNvdXJjZXMiOlsibGliL2ltYWdlLXV0aWwuanMiXSwic291cmNlc0NvbnRlbnQiOlsibGV0IF9zaGFycDtcblxuLyoqXG4gKiBAcmV0dXJucyB7aW1wb3J0KCdzaGFycCcpfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZVNoYXJwICgpIHtcbiAgaWYgKCFfc2hhcnApIHtcbiAgICB0cnkge1xuICAgICAgX3NoYXJwID0gcmVxdWlyZSgnc2hhcnAnKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYENhbm5vdCBsb2FkIHRoZSAnc2hhcnAnIG1vZHVsZSBuZWVkZWQgZm9yIGltYWdlcyBwcm9jZXNzaW5nLiBgICtcbiAgICAgICAgYENvbnNpZGVyIHZpc2l0aW5nIGh0dHBzOi8vc2hhcnAucGl4ZWxwbHVtYmluZy5jb20vaW5zdGFsbCBgICtcbiAgICAgICAgYGZvciB0cm91Ymxlc2hvb3RpbmcuIE9yaWdpbmFsIGVycm9yOiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHJldHVybiBfc2hhcnA7XG59XG5cbi8qKlxuICogQ3JvcCB0aGUgaW1hZ2UgYnkgZ2l2ZW4gcmVjdGFuZ2xlICh1c2UgYmFzZTY0IHN0cmluZyBhcyBpbnB1dCBhbmQgb3V0cHV0KVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlNjRJbWFnZSBUaGUgc3RyaW5nIHdpdGggYmFzZTY0IGVuY29kZWQgaW1hZ2UuXG4gKiBTdXBwb3J0cyBhbGwgaW1hZ2UgZm9ybWF0cyBuYXRpdmVseSBzdXBwb3J0ZWQgYnkgU2hhcnAgbGlicmFyeS5cbiAqIEBwYXJhbSB7aW1wb3J0KCdzaGFycCcpLlJlZ2lvbn0gcmVjdCBUaGUgc2VsZWN0ZWQgcmVnaW9uIG9mIGltYWdlXG4gKiBAcmV0dXJuIHtQcm9taXNlPHN0cmluZz59IGJhc2U2NCBlbmNvZGVkIHN0cmluZyBvZiBjcm9wcGVkIGltYWdlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcm9wQmFzZTY0SW1hZ2UgKGJhc2U2NEltYWdlLCByZWN0KSB7XG4gIGNvbnN0IGJ1ZiA9IGF3YWl0IHJlcXVpcmVTaGFycCgpKEJ1ZmZlci5mcm9tKGJhc2U2NEltYWdlLCAnYmFzZTY0JykpLmV4dHJhY3QocmVjdCkudG9CdWZmZXIoKTtcbiAgcmV0dXJuIGJ1Zi50b1N0cmluZygnYmFzZTY0Jyk7XG59XG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBSUEsTUFBTTtBQUtILFNBQVNDLFlBQVlBLENBQUEsRUFBSTtFQUM5QixJQUFJLENBQUNELE1BQU0sRUFBRTtJQUNYLElBQUk7TUFDRkEsTUFBTSxHQUFHRSxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxPQUFPQyxHQUFHLEVBQUU7TUFDWixNQUFNLElBQUlDLEtBQUssQ0FDWiwrREFBOEQsR0FDOUQsNERBQTJELEdBQzNELHdDQUF1Q0QsR0FBRyxDQUFDRSxPQUFRLEVBQ3RELENBQUM7SUFDSDtFQUNGO0VBQ0EsT0FBT0wsTUFBTTtBQUNmO0FBVU8sZUFBZU0sZUFBZUEsQ0FBRUMsV0FBVyxFQUFFQyxJQUFJLEVBQUU7RUFDeEQsTUFBTUMsR0FBRyxHQUFHLE1BQU1SLFlBQVksQ0FBQyxDQUFDLENBQUNTLE1BQU0sQ0FBQ0MsSUFBSSxDQUFDSixXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQ0ssT0FBTyxDQUFDSixJQUFJLENBQUMsQ0FBQ0ssUUFBUSxDQUFDLENBQUM7RUFDN0YsT0FBT0osR0FBRyxDQUFDSyxRQUFRLENBQUMsUUFBUSxDQUFDO0FBQy9CIn0=
