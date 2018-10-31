from tornado import ioloop, web
import sys
import os
import base64
import json
from io import StringIO

sys.path.append('./python/')

from gen_png import hdf2png
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

def genImgJson(fname, res):
    res = int(res)
    img_io, tile_x, tile_y, nx, ny = hdf2png(fname, res, 100.0)
    responseDict = {
        'imgString':'data:image/png;base64,'+base64.b64encode(img_io.getvalue()).decode('utf-8'),
        'nx': nx,
        'ny': ny,
        'tile_x':tile_x,
        'tile_y':tile_y
    }
    return responseDict

class MainHandler(web.RequestHandler):
    def get(self):
        fpath = self.get_argument('path', None)
        fname = self.get_argument('filename', None)
        res = self.get_argument('res', 0)
        self.render("public/volume.html",
                    fpath=fpath,
                    fname=fname,
                    port=my_port,
                    render_res=res)

class ImgHandler(web.RequestHandler):
    def get(self):
        fname = self.get_argument('filename', None)
        res = self.get_argument('res', 0)
        if fname == None:
            self.write("None")
        else:
            self.write(json.dumps(genImgJson(fname, res)))

def make_app():
    return web.Application([
        (r"/", MainHandler),
        (r"/public/(.*)", web.StaticFileHandler, {"path": "./public"}),
        (r"/img/", ImgHandler),
    ], **settings)

if __name__ == "__main__":
    app = make_app()
    app.listen(my_port)
    ioloop.IOLoop.current().start()
