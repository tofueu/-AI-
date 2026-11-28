import io
import unittest
from PIL import Image
from export_gif import export_gif


def sequence():
    return {'frameCount': 3, 'frames': [
        {'index': i, 'durationMs': 33.3, 'svg':
         f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="{i*4}" y="4" width="3" height="3" fill="red"/></svg>'}
        for i in range(3)]}


class ExportGifTests(unittest.TestCase):
    def test_motion_transparency_and_timing(self):
        output = io.BytesIO()
        export_gif(sequence(), output)
        output.seek(0)
        with Image.open(output) as gif:
            self.assertEqual(gif.n_frames, 3)
            delays = []
            for i in range(3):
                gif.seek(i)
                delays.append(gif.info['duration'])
                rgba = gif.convert('RGBA')
                self.assertEqual(rgba.getpixel((i*4, 4)), (255, 0, 0, 255))
                self.assertEqual(rgba.getpixel((15, 15))[3], 0)
                if i:
                    self.assertEqual(rgba.getpixel(((i-1)*4, 4))[3], 0)
            self.assertEqual(sum(delays), 100)

    def test_reject_invalid_count(self):
        data = sequence()
        data['frameCount'] = 2
        with self.assertRaises(ValueError):
            export_gif(data, io.BytesIO())

    def test_reject_invalid_duration(self):
        data = sequence()
        data['frames'][0]['durationMs'] = float('nan')
        with self.assertRaises(ValueError):
            export_gif(data, io.BytesIO())

    def test_reject_mixed_dimensions(self):
        data = sequence()
        data['frames'][1]['svg'] = data['frames'][1]['svg'].replace('width="16"', 'width="20"')
        with self.assertRaises(ValueError):
            export_gif(data, io.BytesIO())


if __name__ == '__main__':
    unittest.main()
