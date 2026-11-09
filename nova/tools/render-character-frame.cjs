'use strict';
const {composeLayers}=require('../rig/mod-pose-binding.cjs');
const {resolveLayerSources}=require('../rig/fallback-clothing.cjs');
const XML_ESCAPE=Object.freeze({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'});
function escapeXml(value){return String(value).replace(/[&<>"']/g,char=>XML_ESCAPE[char]);}
function renderLayersSvg(layers,{width=512,height=512}={}){
 if(!Array.isArray(layers))throw new TypeError('Expected composed layers');
 if(!Number.isInteger(width)||width<1||width>8192||!Number.isInteger(height)||height<1||height>8192)throw new RangeError('Invalid canvas size');
 const images=resolveLayerSources(layers).map(layer=>{
  if(!layer||typeof layer.src!=='string'||!layer.src.trim())return '';
  if(!Number.isFinite(layer.dx)||!Number.isFinite(layer.dy))throw new TypeError('Invalid joint offset');
  // No raw markup interpolation: all external image paths and names are escaped.
  return '<image data-slot="'+escapeXml(layer.slot)+'" href="'+escapeXml(layer.src)+'" x="'+layer.dx+'" y="'+layer.dy+'" width="'+width+'" height="'+height+'"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'">'+images+'</svg>';
}
function renderCharacterFrame(variant,clip,time,assets={}){
 return renderLayersSvg(composeLayers(variant,clip,time,assets));
}
module.exports={escapeXml,renderLayersSvg,renderCharacterFrame};
