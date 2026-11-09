import unittest
from PIL import Image, ImageColor
from remove_background import remove_border_background


class TestBackground(unittest.TestCase):
    def test_removes_connected_background_but_preserves_internal_same_color(self):
        im = Image.new('RGB', (9, 9), 'white')
        for y in range(2, 7):
            for x in range(2, 7):
                im.putpixel((x, y), (90, 20, 140))
        im.putpixel((4, 4), (255, 255, 255))
        out, mask = remove_border_background(im)
        self.assertEqual(out.getpixel((0, 0))[3], 0)
        self.assertEqual(out.getpixel((4, 4))[3], 255)
        self.assertEqual(out.getpixel((2, 2))[3], 255)
        self.assertEqual(mask.getpixel((0, 0)), 0)

    def test_rejects_ambiguous_corners(self):
        im = Image.new('RGB', (3, 3), 'white')
        for xy, color in [((0, 0), 'red'), ((2, 0), 'green'),
                          ((0, 2), 'blue'), ((2, 2), 'yellow')]:
            im.putpixel(xy, ImageColor.getrgb(color))
        with self.assertRaisesRegex(ValueError, 'three corners'):
            remove_border_background(im)

    def test_existing_alpha_is_preserved_in_exported_mask(self):
        im = Image.new('RGBA', (7, 7), (255, 255, 255, 255))
        for y in range(2, 5):
            for x in range(2, 5):
                im.putpixel((x, y), (90, 20, 140, 255))
        im.putpixel((3, 3), (90, 20, 140, 96))
        im.putpixel((2, 2), (90, 20, 140, 0))
        out, mask = remove_border_background(im)
        self.assertEqual(mask.getpixel((0, 0)), 0)
        self.assertEqual(mask.getpixel((3, 3)), 96)
        self.assertEqual(mask.getpixel((2, 2)), 0)
        self.assertEqual(list(mask.getdata()), list(out.getchannel('A').getdata()))

    def test_already_transparent_corners_preserve_artwork(self):
        im = Image.new('RGBA', (7, 7), (255, 255, 255, 0))
        # Transparent pixels can carry unrelated RGB values from an editor.
        for x, y, rgb in [(0, 0, (255, 0, 0)), (6, 0, (0, 255, 0)),
                          (0, 6, (0, 0, 255)), (6, 6, (255, 255, 0))]:
            im.putpixel((x, y), (*rgb, 0))
        im.putpixel((3, 3), (255, 255, 255, 255))
        out, mask = remove_border_background(im)
        self.assertEqual(out.getpixel((3, 3)), (255, 255, 255, 255))
        self.assertEqual(mask.getpixel((3, 3)), 255)
        self.assertEqual(out.getpixel((0, 0))[3], 0)

    def test_mixed_transparent_corners_ignore_hidden_rgb(self):
        im = Image.new('RGBA', (7, 7), (255, 255, 255, 255))
        im.putpixel((0, 0), (255, 0, 0, 0))
        im.putpixel((6, 0), (0, 255, 0, 0))
        for y in range(2, 5):
            for x in range(2, 5):
                im.putpixel((x, y), (90, 20, 140, 255))
        out, mask = remove_border_background(im)
        self.assertEqual(out.getpixel((6, 6))[3], 0)
        self.assertEqual(out.getpixel((3, 3))[3], 255)
        self.assertEqual(mask.getpixel((3, 3)), 255)

    def test_tolerance(self):
        with self.assertRaises(ValueError):
            remove_border_background(Image.new('RGB', (2, 2)), 256)


if __name__ == '__main__':
    unittest.main()
