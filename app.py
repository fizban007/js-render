from tornado import ioloop, web
import sys
import os
import base64
import json
from io import StringIO

sys.path.append('./python/')

from gen_png import makePNG
from cache import FileCache

my_port = 5050
if len(sys.argv) > 1:
    my_port = sys.argv[1]

settings = {
    "static_path": os.path.join(os.path.dirname(os.path.realpath(__file__)), "public"),
    "autoreload": True,
    # "cookie_secret": "__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
    # "login_url": "/login",
    # "xsrf_cookies": True,
}

def genImgJson(fname):
    responseDict = {
        'imgString':'data:image/png;base64,'+base64.b64encode(makePNG(fname).getvalue()).decode('utf-8')
    }
    return responseDict

class MainHandler(web.RequestHandler):
    def get(self):
        fpath = self.get_argument('path', None)
        fname = self.get_argument('filename', None)
        self.render("public/volume.html", fpath=fpath, fname=fname, port=my_port)

class ImgHandler(web.RequestHandler):
    def get(self):
        fname = self.get_argument('filename', None)
        if fname == None:
            self.write("None")
        else:
            self.write(json.dumps(genImgJson(fname)))
            # img = makePNG(fname)
            # img_io = StringIO()
            # img.save(img_io, format='png', compress_level=1)
            # for line in img_io.getvalue():
            #     self.write(line)
            # # png_bytes.seek(0)
            # # self.write(png_bytes)
            # self.set_header("Content-type",  "image/png")

def make_app():
    return web.Application([
        (r"/", MainHandler),
        (r"/public/(.*)", web.StaticFileHandler, {"path": "./public"}),
        (r'/(favicon.ico)', web.StaticFileHandler, {"path": ""}),
        (r"/img/", ImgHandler),
    ], **settings)

if __name__ == "__main__":
    app = make_app()
    app.listen(my_port)
    ioloop.IOLoop.current().start()
