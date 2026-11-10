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

    def test_invalid_rig_pose_and_duplicate_slots(self):
        im = Image.new('RGBA', (64, 64), (100, 20, 30, 255))
        with self.assertRaisesRegex(ValueError, 'Unknown joint'):
            render_frame(RIG, {'body': im}, {'missing': 15})
        cyclic = json.loads(json.dumps(RIG))
        cyclic['joints']['root']['parent'] = 'head'
        with self.assertRaisesRegex(ValueError, 'Cyclic'):
            render_frame(cyclic, {'body': im}, {})
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            im.save(d / 'body.png')
            (d / 'rig.json').write_text(json.dumps(RIG))
            (d / 'manifest.json').write_text(json.dumps({'layers': [
                {'slot': 'body', 'file': 'body.png'},
                {'slot': 'body', 'file': 'body.png'}
            ]}))
            (d / 'poses.json').write_text('[{}]')
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                export(d / 'rig.json', d / 'manifest.json', d / 'poses.json', d / 'out.gif')

    def test_reject_malformed_pose_and_duration_without_output(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            Image.new('RGBA', (64, 64), (255, 0, 0, 255)).save(d / 'body.png')
            (d / 'rig.json').write_text(json.dumps(RIG))
            (d / 'manifest.json').write_text(json.dumps({'layers': {'body': 'body.png'}}))
            for bad in ([None], [{'angles': []}], [{'duration_ms': '120'}],
                        [{'duration_ms': True}], [{'duration_ms': 0}],
                        [{}, {'duration_ms': 10001}]):
                (d / 'poses.json').write_text(json.dumps(bad))
                target = d / 'preview.gif'
                with self.assertRaises(ValueError):
                    export(d / 'rig.json', d / 'manifest.json', d / 'poses.json', target)
                self.assertFalse(target.exists())

    def test_invalid_output_does_not_create_directory(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            Image.new('RGBA', (64, 64), (255, 0, 0, 255)).save(d / 'body.png')
            (d / 'rig.json').write_text(json.dumps(RIG))
            (d / 'manifest.json').write_text(json.dumps({'layers': {'body': 'body.png'}}))
            (d / 'poses.json').write_text(json.dumps([{}, {}]))
            target = d / 'uncreated' / 'preview.png'
            with self.assertRaisesRegex(ValueError, 'exactly one pose'):
                export(d / 'rig.json', d / 'manifest.json', d / 'poses.json', target)
            self.assertFalse(target.parent.exists())
            (d / 'poses.json').write_text('[{}]')
            target = d / 'uncreated' / 'preview.txt'
            with self.assertRaisesRegex(ValueError, 'PNG or GIF'):
                export(d / 'rig.json', d / 'manifest.json', d / 'poses.json', target)
            self.assertFalse(target.parent.exists())

if __name__ == '__main__': unittest.main()
