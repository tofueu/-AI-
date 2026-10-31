#!/usr/bin/env python3
"""Generates a Photoshop layered PSD with exactly-named, editable part/variant art layers.
Guides are for reference only and ignored by the animation importer.
No pre-drawn official anatomy is claimed.
"""
from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import json, subprocess, sys, math, os
OUT=Path('/mnt/data/nova_psd_work/output');OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path('/mnt/data/nova_psd_work')
BASE=ROOT/'source'
W,H=640,800
qsrc=Image.open('/mnt/data/ChatGPT 圖像 2026年10月30日 下午08_11_27.png').convert('RGBA')
msrc=Image.open('/mnt/data/ChatGPT 圖像 2026年10月30日 下午08_12_25.png').convert('RGBA')
BASE_PARTS=['hair_back','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r','upperarm_l','forearm_l','hand_l','torso','upperarm_r','forearm_r','hand_r','head','hair_front']
ADDITIONAL='hair_side_l hair_side_r hair_tail_l hair_tail_r hair_glow hair_clip hat hat_trim eyes_l eyes_r eyelash_l eyelash_r brow_l brow_r nose mouth blush_l blush_r glasses dress_top dress_skirt_back dress_skirt_front jacket_back jacket_front sleeve_l sleeve_r collar necklace chest_ribbon belt glove_l glove_r stocking_l stocking_r shoe_trim_l shoe_trim_r cape_l cape_r'.split()
PARTS=BASE_PARTS+ADDITIONAL
VARS={
 'hair':{'short': ['hair_front','hair_back'],'twin_tails':['hair_front','hair_back','hair_tail_l','hair_tail_r']},
 'headwear':{'butterfly':['hat','hat_trim'],'cap':['hat']},
 'outfit':{'casual':['dress_top','dress_skirt_front'],'formal':['dress_top','dress_skirt_front','chest_ribbon']},
 'eyes':{'happy':['eyes_l','eyes_r'],'closed':['eyes_l','eyes_r'],'surprised':['eyes_l','eyes_r']},
 'eyebrows':{'angry':['brow_l','brow_r'],'worried':['brow_l','brow_r']},
 'mouth':{'smile':['mouth'],'talk':['mouth'],'sad':['mouth']},
 'accessories':{'butterfly':['hair_clip'],'glasses':['glasses']},
}
VAR_NAMES=[f'VAR__{cat}__{name}__{part}' for cat,items in VARS.items() for name,parts in items.items() for part in parts]
assert len(PARTS)==54 and len(VAR_NAMES)>15
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def F(n):return ImageFont.truetype(font,n)

def sheet_guide(style):
 im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
 # ghosted silhouette / body joint map, separate from editable layers
 j={'root':(320,605),'head':(320,325),'neck':(320,365),'torso':(320,445),'hip_l':(280,613),'hip_r':(360,613),'knee_l':(275,701),'knee_r':(365,701),'ankle_l':(273,778),'ankle_r':(367,778),'shoulder_l':(255,392),'shoulder_r':(385,392),'elbow_l':(203,447),'elbow_r':(437,447),'wrist_l':(160,503),'wrist_r':(480,503)}
 if style=='mature':
  j.update({'head':(320,260),'neck':(320,330),'torso':(320,430),'shoulder_l':(263,380),'shoulder_r':(377,380),'elbow_l':(205,478),'elbow_r':(435,478),'wrist_l':(175,565),'wrist_r':(465,565),'hip_l':(282,598),'hip_r':(358,598),'knee_l':(276,683),'knee_r':(364,683),'ankle_l':(274,768),'ankle_r':(366,768)})
 links=[('head','neck'),('neck','torso'),('torso','root'),('torso','shoulder_l'),('shoulder_l','elbow_l'),('elbow_l','wrist_l'),('torso','shoulder_r'),('shoulder_r','elbow_r'),('elbow_r','wrist_r'),('root','hip_l'),('root','hip_r'),('hip_l','knee_l'),('knee_l','ankle_l'),('hip_r','knee_r'),('knee_r','ankle_r')]
 d.rounded_rectangle((7,7,W-7,H-7),20,outline=(126,95,220,130),width=3)
 d.text((20,14),f'NOVA  {style.upper()}  |  BONES GUIDE ONLY',font=F(18),fill=(93,67,172,185))
 d.text((19,40),'DRAW ON PART__ LAYERS - DO NOT FLATTEN PSD',font=F(12),fill=(114,99,155,190))
 for a,b in links:d.line([j[a],j[b]],fill=(87,71,181,115),width=4)
 for name,(x,y) in j.items():
  d.ellipse((x-6,y-6,x+6,y+6),fill=(187,119,246,190),outline=(255,255,255,180),width=2)
  if name in ['head','torso','root','shoulder_l','elbow_l','wrist_l','hip_l','knee_l']:
   d.text((x+8,y-15),name,font=F(11),fill=(54,34,115,180))
 return im

def source_reference(style):
 if style=='chibi':
  crop=qsrc.crop((1,1,385,453))
  # sheet might have neighboring transparency; preserve original pixels, not a redrawn avatar
  crop.thumbnail((425,680),Image.Resampling.LANCZOS)
  opacity=75
  c=Image.new('RGBA',(W,H),(0,0,0,0)); x=(W-crop.width)//2;y=H-crop.height-20
  layer=crop.copy(); a=layer.getchannel('A').point(lambda v:v*opacity//255);layer.putalpha(a)
  c.alpha_composite(layer,(x,y))
 else:
  crop=msrc.crop((559,39,746,550))
  crop.thumbnail((355,700),Image.Resampling.LANCZOS)
  c=Image.new('RGBA',(W,H),(0,0,0,0));x=(W-crop.width)//2;y=H-crop.height-15
  layer=crop.copy();a=layer.getchannel('A').point(lambda v:v*70//255);layer.putalpha(a)
  c.alpha_composite(layer,(x,y))
 return c

manifest={'width':W,'height':H,'base_parts':PARTS,'variant_layers':VAR_NAMES,'rules':{'base_prefix':'PART__','variant_prefix':'VAR__','ignore_prefix':'GUIDE__','single_psd_per_character':True}}
(OUT/'psd_layer_schema.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
for style in ('chibi','mature'):
 style_dir=ROOT/'layers'/style;style_dir.mkdir(exist_ok=True,parents=True)
 # First magick input is merged proxy/composite. All following inputs become Photoshop layers.
 merged=source_reference(style);merged.alpha_composite(sheet_guide(style));merged_path=style_dir/'merged.png';merged.save(merged_path)
 cmd=['magick',str(merged_path)];files=[]
 # first layer in PSD order highest above all others
 for i,name in enumerate(['GUIDE__joint_positions','GUIDE__original_reference']):
  fn=style_dir/f'{i:03d}_{name}.png';(sheet_guide(style) if i==0 else source_reference(style)).save(fn)
  files.append((name,str(fn)))
 blank=Image.new('RGBA',(W,H),(0,0,0,0))
 blank_path=style_dir/'transparent.png';blank.save(blank_path)
 for name in VAR_NAMES:
  files.append((name,str(blank_path)))
 for part in PARTS:
  files.append((f'PART__{part}',str(blank_path)))
 for name,file in files:cmd.extend(['-label',name,file])
 dest=OUT/f'NOVA_Artist_{style}_Layer_Template_v1.psd'
 cmd.append(str(dest))
 # ImageMagick supports layered PSD writing without Photoshop dependency.
 subprocess.run(cmd,check=True,timeout=120)
 print(style,'PSD',dest.stat().st_size,'bytes',len(files),'layers')