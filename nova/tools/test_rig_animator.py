import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from rig_animator import export, render_frame

RIG = {'canvas':[64,64], 'joints':{'root':{'parent':None,'pivot':[.5,.5]}, 'head':{'parent':'root','pivot':[.5,.25]}}, 'slot_joints':{'body':'root','head':'head'}}

class TestRigAnimator(unittest.TestCase):
    def test_frame_rotation_and_layer_validation(self):
        im=Image.new('RGBA',(64,64)); im.putpixel((40,32),(255,0,0,255))
        self.assertEqual(render_frame(RIG,{'body':im},{'root':0}).getpixel((40,32)),(255,0,0,255))
        self.assertNotEqual(render_frame(RIG,{'body':im},{'root':90}).getpixel((40,32)),(255,0,0,255))
        with self.assertRaises(ValueError): render_frame(RIG,{'bad':im},{})

    def test_export_gif_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d)
            Image.new('RGBA',(64,64),(200,10,30,255)).save(d/'body.png')
            (d/'rig.json').write_text(json.dumps(RIG))
            (d/'manifest.json').write_text(json.dumps({'layers':{'body':'body.png'}}))
            (d/'poses.json').write_text(json.dumps([{'angles':{'root':0}},{'angles':{'root':12}}]))
            target=d/'preview.gif'
            export(d/'rig.json',d/'manifest.json',d/'poses.json',target)
            with Image.open(target) as im: self.assertEqual(im.n_frames,2)
            with self.assertRaises(FileExistsError): export(d/'rig.json',d/'manifest.json',d/'poses.json',target)

    def test_path_escape(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d)
            (d/'rig.json').write_text(json.dumps(RIG))
            (d/'manifest.json').write_text(json.dumps({'layers':{'body':'../secret.png'}}))
            (d/'poses.json').write_text('[{}]')
            with self.assertRaises(ValueError): export(d/'rig.json',d/'manifest.json',d/'poses.json',d/'out.gif')

if __name__ == '__main__': unittest.main()
